import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getInstanceStatus } from "@/utils/evolution.functions";
import { formatDateTimeBR, formatDateBR } from "@/lib/date-format";
import { AlertCircle, History, MessageCircle, CalendarIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { isMensagemConfigurada } from "@/components/aniversarios/mensagem-config";
import {
  getAniversariosErrorMessage,
  withRequestTimeout,
  withEvolutionTimeout,
} from "@/components/aniversarios/request-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type FiltroEnvio = "7d" | "30d" | "custom";

function getEnvioRange(
  filtro: FiltroEnvio,
  custom?: { from?: Date; to?: Date },
) {
  const now = new Date();
  if (filtro === "custom") {
    const from = custom?.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = custom?.to ?? now;
    const i = new Date(from); i.setHours(0, 0, 0, 0);
    const f = new Date(to); f.setHours(23, 59, 59, 999);
    return { from: i.toISOString(), to: f.toISOString() };
  }
  const days = filtro === "7d" ? 7 : 30;
  const i = new Date(now); i.setDate(i.getDate() - days); i.setHours(0, 0, 0, 0);
  const f = new Date(now); f.setHours(23, 59, 59, 999);
  return { from: i.toISOString(), to: f.toISOString() };
}

interface Envio {
  id: string;
  telefone: string;
  nome: string | null;
  status: string;
  erro: string | null;
  /** Mapeado de envios_whatsapp.created_at — mantido como data_envio para a UI. */
  data_envio: string;
}

interface ConfigMensagem {
  mensagem: string;
  imagem_url: string | null;
}

interface InstanceRow {
  id: string;
  instance_name: string;
  status: string;
  imagem_url: string | null;
}

// Throttle do sync de status Evolution: roda no máximo 1×/min por usuário.
const EVOLUTION_SYNC_THROTTLE_MS = 60_000;
const lastEvolutionSyncByUser = new Map<string, number>();

export function EnvioTab({ acessoAtivo = true }: { acessoAtivo?: boolean } = {}) {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const [instanceStatus, setInstanceStatus] = useState<string>("disconnected");
  const [ownerNumber, setOwnerNumber] = useState<string | null>(null);
  const [filtroEnvio, setFiltroEnvio] = useState<FiltroEnvio>("7d");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const isMobile = useIsMobile();
  const range = getEnvioRange(filtroEnvio, customRange);

  const getAccessToken = useCallback(async () => {
    const {
      data: { session: liveSession },
    } = await supabase.auth.getSession();
    const accessToken = liveSession?.access_token ?? session?.access_token;
    if (!accessToken) throw new Error("Sem sessão");
    return accessToken;
  }, [session?.access_token]);

  const instanceQuery = useQuery({
    queryKey: ["aniv:instance", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await withRequestTimeout(
        supabase
          .from("whatsapp_instances")
          .select("id, instance_name, status, imagem_url")
          .eq("user_id", userId!)
          .maybeSingle(),
        "O carregamento da instância",
      );
      if (error) throw error;
      return (data as InstanceRow | null) ?? null;
    },
  });

  const configQuery = useQuery({
    queryKey: ["aniv:config", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await withRequestTimeout(
        supabase
          .from("config_mensagem")
          .select("mensagem, imagem_url")
          .eq("user_id", userId!)
          .maybeSingle(),
        "O carregamento da configuração",
      );
      if (error) throw error;
      return (data as ConfigMensagem | null) ?? null;
    },
  });

  const enviosQuery = useQuery({
    queryKey: ["aniv:envios", userId, range.from, range.to],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await withRequestTimeout(
        supabase
          .from("envios_whatsapp")
          .select("id, telefone, nome, status, erro, created_at")
          .eq("user_id", userId!)
          .gte("created_at", range.from)
          .lte("created_at", range.to)
          .order("created_at", { ascending: false })
          .limit(500),
        "O carregamento do histórico",
      );
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        id: string;
        telefone: string;
        nome: string | null;
        status: string;
        erro: string | null;
        created_at: string;
      }>;
      return rows.map<Envio>((r) => ({
        id: r.id,
        telefone: r.telefone,
        nome: r.nome,
        status: r.status,
        erro: r.erro,
        data_envio: r.created_at,
      }));
    },
  });

  const instanceRow = instanceQuery.data ?? null;
  const config = configQuery.data ?? null;
  const envios = enviosQuery.data ?? [];
  const instanceName = instanceRow?.instance_name ?? null;

  // Sincroniza com status do banco quando a instância muda.
  useEffect(() => {
    if (instanceRow?.status) setInstanceStatus(instanceRow.status);
  }, [instanceRow?.status]);

  // Sync de status Evolution em background, com throttle de 60s por usuário.
  const syncEvolutionStatus = useCallback(async () => {
    if (!userId || !instanceName) return;
    const last = lastEvolutionSyncByUser.get(userId) ?? 0;
    if (Date.now() - last < EVOLUTION_SYNC_THROTTLE_MS) return;
    lastEvolutionSyncByUser.set(userId, Date.now());
    try {
      const accessToken = await getAccessToken();
      const statusResult = await withEvolutionTimeout(
        getInstanceStatus({ data: { instanceName, accessToken } }),
        "A verificação de status do WhatsApp",
      );
      if (!statusResult.success) return;
      const body = statusResult.data as
        | { instance?: { state?: string }; state?: string }
        | undefined;
      const state = body?.instance?.state ?? body?.state;
      const realStatus = state === "open" ? "connected" : "disconnected";
      setInstanceStatus(realStatus);
      if (statusResult.ownerNumber) setOwnerNumber(statusResult.ownerNumber);
      await supabase
        .from("whatsapp_instances")
        .update({ status: realStatus })
        .eq("user_id", userId);
    } catch (err) {
      console.warn("[EnvioTab] sync status falhou", err);
    }
  }, [userId, instanceName, getAccessToken]);

  const syncedRef = useRef(false);
  useEffect(() => {
    if (!instanceName || syncedRef.current) return;
    syncedRef.current = true;
    void syncEvolutionStatus();
  }, [instanceName, syncEvolutionStatus]);

  // Guarda o último status notificado por id de envio para evitar toasts duplicados.
  const notifiedStatusRef = useRef<Map<string, string>>(new Map());

  const notifyFinalStatus = useCallback((envio: Envio) => {
    const status = (envio.status || "").toLowerCase();
    const isFinal =
      status === "enviado" ||
      status === "erro" ||
      status === "pendente";
    if (!isFinal) return;
    const previous = notifiedStatusRef.current.get(envio.id);
    if (previous === status) return;
    notifiedStatusRef.current.set(envio.id, status);

    const alvo = envio.nome?.trim() || envio.telefone || "contato";
    if (status === "enviado") {
      toast.success(`Mensagem enviada para ${alvo}.`);
    } else if (status === "erro") {
      toast.error(
        `Falha ao enviar para ${alvo}${envio.erro ? `: ${envio.erro}` : ""}.`,
      );
    } else if (status === "pendente") {
      toast(`Envio para ${alvo} está pendente.`);
    }
  }, []);

  // Realtime: novos envios aparecem no topo, updates de status atualizam a linha existente.
  useEffect(() => {
    if (!userId) return;
    const queryKey = ["aniv:envios", userId];

    const mapRow = (row: Record<string, unknown>): Envio => ({
      id: String(row.id),
      telefone: String(row.telefone ?? ""),
      nome: (row.nome as string | null) ?? null,
      status: String(row.status ?? ""),
      erro: (row.erro as string | null) ?? null,
      data_envio: String(row.created_at ?? new Date().toISOString()),
    });

    const channel = supabase
      .channel(`envios_whatsapp:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "envios_whatsapp",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[EnvioTab] Realtime chegou (INSERT):", payload);
          const novo = mapRow(payload.new as Record<string, unknown>);
          queryClient.setQueryData<Envio[]>([...queryKey, range.from, range.to], (prev = []) => {
            if (prev.some((e) => e.id === novo.id)) return prev;
            return [novo, ...prev].slice(0, 500);
          });
          void queryClient.invalidateQueries({ queryKey });
          notifyFinalStatus(novo);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "envios_whatsapp",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[EnvioTab] Realtime chegou (UPDATE):", payload);
          const atualizado = mapRow(payload.new as Record<string, unknown>);
          queryClient.setQueryData<Envio[]>([...queryKey, range.from, range.to], (prev = []) =>
            prev.map((e) => (e.id === atualizado.id ? atualizado : e)),
          );
          void queryClient.invalidateQueries({ queryKey });
          notifyFinalStatus(atualizado);
        },
      )
      .subscribe((status, err) => {
        console.log(`[EnvioTab] Realtime channel status: ${status}`, err ?? "");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient, notifyFinalStatus]);

  const seededNotifiedRef = useRef(false);
  useEffect(() => {
    if (seededNotifiedRef.current) return;
    if (enviosQuery.isLoading) return;
    const initial = enviosQuery.data ?? [];
    initial.forEach((e) => {
      notifiedStatusRef.current.set(e.id, (e.status || "").toLowerCase());
    });
    seededNotifiedRef.current = true;
  }, [enviosQuery.isLoading, enviosQuery.data]);

  const loading = instanceQuery.isLoading || configQuery.isLoading || enviosQuery.isLoading;

  const allFailed = instanceQuery.isError && configQuery.isError && enviosQuery.isError;

  const loadError = allFailed ? getAniversariosErrorMessage(enviosQuery.error) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasConfiguredMessage = isMensagemConfigurada(config);
  const statusLabel = instanceStatus === "connected" ? "WhatsApp Conectado" : "WhatsApp Desconectado";

  return (
    <div className="space-y-4">
      {loadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar a aba</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5" />
              Envios do WhatsApp
            </CardTitle>
            <div className="flex flex-wrap justify-end gap-2">
              <Badge variant={instanceStatus === "connected" ? "default" : "destructive"}>
                {statusLabel}
              </Badge>
              <Badge variant={hasConfiguredMessage ? "default" : "destructive"}>
                {hasConfiguredMessage ? "Mensagem Configurada" : "Mensagem Não Configurada"}
              </Badge>
              {!acessoAtivo && <Badge variant="destructive">Acesso bloqueado</Badge>}
            </div>
          </div>
          <CardDescription>
            Acompanhe abaixo os envios registrados pela automação ativa.
            {ownerNumber && (
              <>
                {" "}Instância conectada no número <strong>{ownerNumber}</strong>.
              </>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {!hasConfiguredMessage && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="text-sm">
              Você ainda não configurou sua mensagem de aniversário. Vá até a
              aba <strong>Mensagem</strong> para definir o texto e a imagem.
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Últimos Envios
          </CardTitle>
          <CardDescription>
            <strong>Pendente</strong> = aceito pela Evolution API, aguardando
            entrega final no WhatsApp do destinatário. <strong>Erro</strong> = a
            Evolution rejeitou o envio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {envios.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum envio realizado ainda
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envios.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">
                      {formatDateTimeBR(e.data_envio)}
                    </TableCell>
                    <TableCell>{e.nome ?? "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{e.telefone}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          e.status === "enviado"
                            ? "default"
                            : e.status === "pendente"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {e.status}
                      </Badge>
                      {e.erro && (
                        <span
                          className="ml-2 text-xs text-muted-foreground"
                          title={e.erro}
                        >
                          ⓘ
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
