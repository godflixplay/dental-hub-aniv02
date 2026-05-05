import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Loader2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { formatDateTimeBR } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import { listNotificacoes, marcarComoLida } from "@/utils/notificacoes.functions";

export const Route = createFileRoute("/_authenticated/dashboard/comunicados")({
  component: ComunicadosPage,
});

type Comunicado = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: "info" | "sucesso" | "aviso" | "erro";
  lida: boolean;
  audiencia: "cliente" | "admin";
  created_at: string;
};

function ComunicadosPage() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? "";
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notificacoes", "comunicados"],
    enabled: !!accessToken,
    queryFn: () => listNotificacoes({ data: { accessToken, limit: 100 } }),
  });

  const comunicados = ((data?.notificacoes ?? []) as Comunicado[]).filter(
    (n) => n.audiencia === "cliente",
  );
  const naoLidos = useMemo(() => comunicados.filter((n) => !n.lida).length, [comunicados]);

  const markAll = async () => {
    if (!accessToken || naoLidos === 0) return;
    await marcarComoLida({ data: { accessToken } });
    await queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comunicados</h1>
          <p className="mt-1 text-sm text-muted-foreground">Novidades, avisos e notícias da Dental Hub.</p>
        </div>
        <Button variant="outline" onClick={markAll} disabled={naoLidos === 0} className="gap-2 self-start sm:self-auto">
          <CheckCheck className="h-4 w-4" />
          Marcar como lidos
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5 text-primary" />
            Comunicados recebidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : comunicados.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum comunicado recebido ainda.</p>
          ) : (
            <div className="space-y-3">
              {comunicados.map((n) => (
                <div key={n.id} className={cn("rounded-lg border p-4", !n.lida && "bg-primary/5")}>
                  <div className="flex flex-wrap items-center gap-2">
                    {!n.lida && <Badge variant="secondary">novo</Badge>}
                    <span className="text-xs text-muted-foreground">{formatDateTimeBR(n.created_at)}</span>
                  </div>
                  <p className="mt-2 font-medium text-foreground">{n.titulo}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.mensagem}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}