import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  adminUsuarios,
  adminToggleCortesia,
  adminRefreshInstanceStatus,
  adminLogoutInstance,
  adminReconnectInstance,
} from "@/utils/admin.functions";
import {
  Search,
  User,
  MoreHorizontal,
  Loader2,
  Phone,
  Gift,
  RefreshCw,
  LogOut,
  QrCode,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDateBR } from "@/lib/date-format";
import { supabase } from "@/integrations/supabase/client";

interface UsuarioRow {
  id: string;
  email: string;
  role: string;
  created_at: string;
  contatos: number;
  whatsapp_status: string;
  instance_name: string | null;
  owner_number: string | null;
  plano: string;
  nome_responsavel: string | null;
  nome_clinica: string | null;
  telefone_contato: string | null;
  acesso_cortesia: boolean;
}

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: AdminUsuarios,
});

function formatPhoneBR(raw: string | null | undefined): string {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 13) {
    // 55 + DDD + numero
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return raw;
}

function buildWaLink(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const e164 = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${e164}`;
}

function AdminUsuarios() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? "";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UsuarioRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-usuarios"],
    enabled: !!accessToken,
    queryFn: () => loadAdminUsuarios(accessToken),
  });

  const toggleCortesiaMutation = useMutation({
    mutationFn: (vars: { userId: string; acessoCortesia: boolean }) =>
      adminToggleCortesia({
        data: {
          accessToken,
          userId: vars.userId,
          acessoCortesia: vars.acessoCortesia,
        },
      }),
    onSuccess: (res) => {
      toast.success(
        res.acessoCortesia
          ? "Acesso de cortesia ativado"
          : "Acesso de cortesia removido",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      setSelectedUser((prev) =>
        prev && prev.id === res.userId
          ? { ...prev, acesso_cortesia: res.acessoCortesia }
          : prev,
      );
    },
    onError: (err: Error) => {
      toast.error("Erro ao atualizar cortesia: " + err.message);
    },
  });

  const [qrDialog, setQrDialog] = useState<{ instance: string; qr: string | null; status: number; body: string } | null>(null);

  const refreshMutation = useMutation({
    mutationFn: (instanceName: string) =>
      adminRefreshInstanceStatus({ data: { accessToken, instanceName } }),
    onSuccess: (res) => {
      toast.success(`Status: ${res.status}${res.owner_number ? ` — ${res.owner_number}` : ""}`);
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });
  const logoutMutation = useMutation({
    mutationFn: (instanceName: string) =>
      adminLogoutInstance({ data: { accessToken, instanceName } }),
    onSuccess: (res) => {
      toast.success(`Instância desconectada (HTTP ${res.status}).`);
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (err: Error) => toast.error("Erro ao desconectar: " + err.message),
  });
  const reconnectMutation = useMutation({
    mutationFn: (instanceName: string) =>
      adminReconnectInstance({ data: { accessToken, instanceName } }),
    onSuccess: (res, instanceName) => {
      setQrDialog({ instance: instanceName, qr: res.qrBase64, status: res.status, body: res.body });
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (err: Error) => toast.error("Erro ao reconectar: " + err.message),
  });

  const usuarios = (data?.usuarios ?? []) as UsuarioRow[];
  const filtered = usuarios.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.email.toLowerCase().includes(term) ||
      p.role.toLowerCase().includes(term) ||
      (p.nome_responsavel ?? "").toLowerCase().includes(term) ||
      (p.telefone_contato ?? "").includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Gestão de Usuários
        </h1>
        <p className="mt-1 text-muted-foreground">
          {usuarios.length} usuário(s) cadastrado(s)
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail, telefone ou role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Responsável</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Contatos</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Cortesia</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center text-muted-foreground"
                  >
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((profile) => {
                  const waLink = buildWaLink(profile.telefone_contato);
                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="font-medium">
                          {profile.nome_responsavel ?? "—"}
                        </div>
                        {profile.nome_clinica && (
                          <div className="text-xs text-muted-foreground">
                            {profile.nome_clinica}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {profile.email}
                      </TableCell>
                      <TableCell>
                        {waLink ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {formatPhoneBR(profile.telefone_contato)}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            profile.role === "admin" ? "default" : "secondary"
                          }
                        >
                          {profile.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateBR(profile.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge
                            variant={
                              profile.whatsapp_status === "connected"
                                ? "default"
                                : "outline"
                            }
                          >
                            {profile.whatsapp_status === "connected"
                              ? "Conectado"
                              : "Desconectado"}
                          </Badge>
                          {profile.instance_name && (
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {profile.instance_name}
                            </div>
                          )}
                          {profile.owner_number && (
                            <div className="text-[11px] text-muted-foreground">
                              📱 {formatPhoneBR(profile.owner_number)}
                            </div>
                          )}
                          {profile.instance_name && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                title="Atualizar status"
                                disabled={refreshMutation.isPending}
                                onClick={() => refreshMutation.mutate(profile.instance_name!)}
                              >
                                <RefreshCw className={`h-3 w-3 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                title="Desconectar"
                                disabled={logoutMutation.isPending}
                                onClick={() => logoutMutation.mutate(profile.instance_name!)}
                              >
                                <LogOut className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                title="Reconectar / Gerar QR"
                                disabled={reconnectMutation.isPending}
                                onClick={() => reconnectMutation.mutate(profile.instance_name!)}
                              >
                                <QrCode className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{profile.contatos}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            profile.plano === "Gratuito" ? "outline" : "default"
                          }
                        >
                          {profile.plano}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {profile.acesso_cortesia ? (
                          <Badge className="gap-1">
                            <Gift className="h-3 w-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedUser(profile)}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Detalhes do Usuário
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <p className="text-muted-foreground">Responsável</p>
                  <p className="font-medium">
                    {selectedUser.nome_responsavel ?? "—"}
                  </p>
                </div>
                {selectedUser.nome_clinica && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Clínica</p>
                    <p className="font-medium">{selectedUser.nome_clinica}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">E-mail</p>
                  <p className="font-medium break-all">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telefone</p>
                  {(() => {
                    const wa = buildWaLink(selectedUser.telefone_contato);
                    return wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        {formatPhoneBR(selectedUser.telefone_contato)}
                      </a>
                    ) : (
                      <p className="font-medium">—</p>
                    );
                  })()}
                </div>
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <Badge
                    variant={
                      selectedUser.role === "admin" ? "default" : "secondary"
                    }
                  >
                    {selectedUser.role}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Cadastro</p>
                  <p className="font-medium">
                    {formatDateBR(selectedUser.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Plano</p>
                  <Badge
                    variant={
                      selectedUser.plano === "Gratuito" ? "outline" : "default"
                    }
                  >
                    {selectedUser.plano}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">WhatsApp Evolution</p>
                  <Badge
                    variant={
                      selectedUser.whatsapp_status === "connected"
                        ? "default"
                        : "outline"
                    }
                  >
                    {selectedUser.whatsapp_status === "connected"
                      ? "Conectado"
                      : "Desconectado"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Contatos</p>
                  <p className="font-medium">{selectedUser.contatos}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label
                      htmlFor="cortesia-switch"
                      className="flex items-center gap-2 text-sm font-medium"
                    >
                      <Gift className="h-4 w-4 text-primary" />
                      Acesso de cortesia
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Libera todas as automações sem necessidade de assinatura
                      paga. Use para contas de teste ou demonstração.
                    </p>
                  </div>
                  <Switch
                    id="cortesia-switch"
                    checked={selectedUser.acesso_cortesia}
                    disabled={toggleCortesiaMutation.isPending}
                    onCheckedChange={(checked) =>
                      toggleCortesiaMutation.mutate({
                        userId: selectedUser.id,
                        acessoCortesia: checked,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrDialog} onOpenChange={() => setQrDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Reconectar instância
            </DialogTitle>
            <DialogDescription>
              {qrDialog?.instance} — HTTP {qrDialog?.status}
            </DialogDescription>
          </DialogHeader>
          {qrDialog?.qr ? (
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-lg border bg-white p-3">
                <img
                  src={qrDialog.qr.startsWith("data:") ? qrDialog.qr : `data:image/png;base64,${qrDialog.qr}`}
                  alt="QR Code"
                  className="h-64 w-64"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Peça ao cliente que escaneie o QR no WhatsApp.
              </p>
            </div>
          ) : (
            <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
              {qrDialog?.body || "Sem QR retornado pela Evolution."}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 8000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("timeout")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function loadAdminUsuarios(accessToken: string) {
  try {
    return await withTimeout(adminUsuarios({ data: { accessToken } }));
  } catch {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, role, created_at, nome_responsavel, nome_clinica, telefone_contato, acesso_cortesia")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const ids = (profiles ?? []).map((p) => p.id);
    const contatosCount: Record<string, number> = {};
    const whatsappStatus: Record<string, string> = {};
    const planoStatus: Record<string, string> = {};

    if (ids.length > 0) {
      const [contatosRes, instRes, assinRes] = await Promise.all([
        supabase.from("contatos").select("user_id").in("user_id", ids),
        supabase.from("whatsapp_instances").select("user_id, status").in("user_id", ids),
        supabase.from("assinaturas").select("user_id, status, planos(nome)").in("user_id", ids),
      ]);
      for (const c of contatosRes.data ?? []) contatosCount[c.user_id] = (contatosCount[c.user_id] ?? 0) + 1;
      for (const i of instRes.data ?? []) whatsappStatus[i.user_id] = i.status;
      for (const a of assinRes.data ?? []) {
        if (a.status === "ativa" || a.status === "trial") {
          const plano = Array.isArray(a.planos) ? a.planos[0] : a.planos;
          planoStatus[a.user_id] = plano?.nome ?? a.status;
        }
      }
    }

    return {
      usuarios: (profiles ?? []).map((p) => ({
        ...p,
        contatos: contatosCount[p.id] ?? 0,
        whatsapp_status: whatsappStatus[p.id] ?? "desconectado",
        plano: planoStatus[p.id] ?? "Gratuito",
        acesso_cortesia: Boolean(p.acesso_cortesia),
      })),
    };
  }
}
