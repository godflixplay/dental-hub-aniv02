import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PushSubscribeCard } from "@/components/admin/PushSubscribeCard";
import { useAuth } from "@/hooks/use-auth";
import { formatDateTimeBR } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import { listNotificacoes, marcarComoLida } from "@/utils/notificacoes.functions";

export const Route = createFileRoute("/_authenticated/admin/notificacoes")({
  component: AdminNotificacoesPage,
});

type Notificacao = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: "info" | "sucesso" | "aviso" | "erro";
  lida: boolean;
  audiencia: "cliente" | "admin";
  created_at: string;
};

const tipoStyle: Record<Notificacao["tipo"], string> = {
  info: "bg-primary/10 text-primary",
  sucesso: "bg-accent/10 text-accent",
  aviso: "bg-secondary text-secondary-foreground",
  erro: "bg-destructive/10 text-destructive",
};

function AdminNotificacoesPage() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? "";
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notificacoes", "admin-page"],
    enabled: !!accessToken,
    queryFn: () => listNotificacoes({ data: { accessToken, limit: 100 } }),
  });

  const notificacoes = (data?.notificacoes ?? []) as Notificacao[];
  const naoLidas = useMemo(() => notificacoes.filter((n) => !n.lida).length, [notificacoes]);

  const markAll = async () => {
    if (!accessToken || naoLidas === 0) return;
    await marcarComoLida({ data: { accessToken } });
    await queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Alertas preparados: desconexão de WhatsApp, nova assinatura e testes de push admin.
          </p>
        </div>
        <Button variant="outline" onClick={markAll} disabled={naoLidas === 0} className="gap-2 self-start sm:self-auto">
          <CheckCheck className="h-4 w-4" />
          Marcar todas como lidas
        </Button>
      </div>

      <PushSubscribeCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Histórico de notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notificacoes.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma notificação registrada ainda.</p>
          ) : (
            <div className="space-y-3">
              {notificacoes.map((n) => (
                <div key={n.id} className={cn("rounded-lg border p-4", !n.lida && "bg-primary/5")}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={tipoStyle[n.tipo]}>{n.tipo}</Badge>
                        {!n.lida && <Badge variant="secondary">nova</Badge>}
                      </div>
                      <p className="mt-2 font-medium text-foreground">{n.titulo}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{n.mensagem}</p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">{formatDateTimeBR(n.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}