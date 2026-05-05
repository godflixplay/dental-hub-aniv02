import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { adminLogsAgrupados } from "@/utils/admin.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatPhoneBR(raw: string | null | undefined): string {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  if (digits.length === 13) return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`;
  return raw;
}
import {
  AlertTriangle,
  CalendarIcon,
  CheckCircle,
  ChevronDown,
  Loader2,
  Users as UsersIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatDateBR } from "@/lib/date-format";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  component: AdminLogs,
});

type FiltroPeriodo = "mes" | "ano" | "personalizado";

type LogRow = {
  user_id: string | null;
  email: string | null;
  nome_responsavel: string | null;
  instancia: string | null;
  owner_number: string | null;
  data: string;
  total: number | null;
  enviados: number | null;
  erros: number | null;
};

function getRange(
  periodo: FiltroPeriodo,
  mes: number,
  ano: number,
  custom?: { from?: Date; to?: Date },
) {
  if (periodo === "personalizado") {
    const now = new Date();
    const from = custom?.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = custom?.to ?? now;
    const i = new Date(from);
    i.setHours(0, 0, 0, 0);
    const f = new Date(to);
    f.setHours(23, 59, 59, 999);
    return { dataInicio: i.toISOString(), dataFim: f.toISOString() };
  }
  if (periodo === "ano") {
    const i = new Date(ano, 0, 1, 0, 0, 0, 0);
    const f = new Date(ano, 11, 31, 23, 59, 59, 999);
    return { dataInicio: i.toISOString(), dataFim: f.toISOString() };
  }
  // mes
  const i = new Date(ano, mes, 1, 0, 0, 0, 0);
  const f = new Date(ano, mes + 1, 0, 23, 59, 59, 999);
  return { dataInicio: i.toISOString(), dataFim: f.toISOString() };
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type GrupoUsuario = {
  user_id: string;
  email: string;
  nome_responsavel: string;
  instancias: Array<{
    instancia: string;
    owner_number: string | null;
    linhas: LogRow[];
    total: number;
    enviados: number;
    erros: number;
  }>;
  total: number;
  enviados: number;
  erros: number;
};

function agrupar(
  rows: LogRow[],
  ownerNumberByInstance: Map<string, string | null>,
): GrupoUsuario[] {
  const mapUser = new Map<string, GrupoUsuario>();

  for (const r of rows) {
    const userKey = r.user_id ?? r.email ?? "—";
    let u = mapUser.get(userKey);
    if (!u) {
      u = {
        user_id: userKey,
        email: r.email ?? "—",
        nome_responsavel: r.nome_responsavel ?? r.email ?? "—",
        instancias: [],
        total: 0,
        enviados: 0,
        erros: 0,
      };
      mapUser.set(userKey, u);
    }

    const instKey = r.instancia ?? "—";
    let inst = u.instancias.find((i) => i.instancia === instKey);
    if (!inst) {
      inst = {
        instancia: instKey,
        owner_number: ownerNumberByInstance.get(instKey) ?? null,
        linhas: [],
        total: 0,
        enviados: 0,
        erros: 0,
      };
      u.instancias.push(inst);
    }

    const total = r.total ?? 0;
    const enviados = r.enviados ?? 0;
    const erros = r.erros ?? 0;

    inst.linhas.push(r);
    inst.total += total;
    inst.enviados += enviados;
    inst.erros += erros;

    u.total += total;
    u.enviados += enviados;
    u.erros += erros;
  }

  // Ordenar linhas por data desc dentro de cada instância
  for (const u of mapUser.values()) {
    for (const i of u.instancias) {
      i.linhas.sort((a, b) => (a.data < b.data ? 1 : -1));
    }
    u.instancias.sort((a, b) => a.instancia.localeCompare(b.instancia));
  }

  return Array.from(mapUser.values()).sort((a, b) => b.total - a.total);
}

function AdminLogs() {
  const isMobile = useIsMobile();
  const { session } = useAuth();
  const accessToken = session?.access_token ?? "";
  const now = new Date();
  const [periodo, setPeriodo] = useState<FiltroPeriodo>("mes");
  const [mes, setMes] = useState<number>(now.getMonth());
  const [ano, setAno] = useState<number>(now.getFullYear());
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const [pageSize, setPageSize] = useState<number>(10);

  const range = useMemo(
    () => getRange(periodo, mes, ano, customRange),
    [periodo, mes, ano, customRange],
  );

  const anosDisponiveis = useMemo(() => {
    const atual = now.getFullYear();
    return [atual - 2, atual - 1, atual, atual + 1];
  }, [now]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-logs-agrupados", range.dataInicio, range.dataFim, accessToken],
    enabled: !!accessToken,
    queryFn: async () => {
      const res = await adminLogsAgrupados({
        data: {
          accessToken,
          dataInicio: range.dataInicio,
          dataFim: range.dataFim,
        },
      });
      return res;
    },
    staleTime: 30_000,
  });

  const rows = (data?.rows ?? []) as LogRow[];

  const ownerNumberByInstance = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const r of rows) {
      if (r.instancia) m.set(r.instancia, (r as LogRow & { owner_number?: string | null }).owner_number ?? null);
    }
    return m;
  }, [rows]);

  const gruposCompletos = useMemo(
    () => agrupar(rows, ownerNumberByInstance),
    [rows, ownerNumberByInstance],
  );
  const grupos = useMemo(
    () => gruposCompletos.slice(0, pageSize),
    [gruposCompletos, pageSize],
  );
  const totalGeral = rows.reduce((s, r) => s + (r.total ?? 0), 0);
  const totalEnviados = rows.reduce((s, r) => s + (r.enviados ?? 0), 0);
  const totalErros = rows.reduce((s, r) => s + (r.erros ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Monitoramento de Envios</h1>
        <p className="mt-1 text-muted-foreground">
          Logs agrupados por usuário, instância e dia.
        </p>
      </div>

      {/* Filtros de período */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Button variant={periodo === "mes" ? "default" : "outline"} size="sm" onClick={() => setPeriodo("mes")}>
            Mês
          </Button>
          <Button variant={periodo === "ano" ? "default" : "outline"} size="sm" onClick={() => setPeriodo("ano")}>
            Ano
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={periodo === "personalizado" ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                {periodo === "personalizado" && customRange.from
                  ? `${formatDateBR(customRange.from.toISOString())}${customRange.to ? ` → ${formatDateBR(customRange.to.toISOString())}` : ""}`
                  : "Personalizado"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: customRange.from, to: customRange.to }}
                onSelect={(r) => {
                  setCustomRange({ from: r?.from, to: r?.to });
                  setPeriodo("personalizado");
                }}
                numberOfMonths={isMobile ? 1 : 2}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {periodo === "mes" && (
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(periodo === "mes" || periodo === "ano") && (
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="h-9 w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Mostrar</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-9 w-[80px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardContent className="px-4 pb-3 pt-0">
          <span className="text-xs text-muted-foreground">
            {formatDateBR(range.dataInicio)} → {formatDateBR(range.dataFim)} · Exibindo {grupos.length} de {gruposCompletos.length} usuário(s)
          </span>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGeral}</div>
            <p className="text-xs text-muted-foreground">{grupos.length} usuário(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Enviados</CardTitle>
            <CheckCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEnviados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Erros</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalErros}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Logs por usuário</CardTitle>
          <CardDescription>
            Clique em um usuário para ver as instâncias e os dias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Erro ao carregar os logs: {(error as Error).message}
            </div>
          ) : grupos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum log encontrado neste período.
            </p>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {grupos.map((g) => (
                <AccordionItem key={g.user_id} value={g.user_id} className="rounded-md border px-3">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 flex-col gap-2 pr-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex flex-col items-start text-left">
                        <span className="font-medium break-all">{g.nome_responsavel}</span>
                        <span className="text-xs text-muted-foreground break-all">{g.email}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline">{g.total} total</Badge>
                        <Badge variant="default" className="bg-accent/20 text-accent hover:bg-accent/30">
                          {g.enviados} ok
                        </Badge>
                        {g.erros > 0 && <Badge variant="destructive">{g.erros} erro(s)</Badge>}
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform" />
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {g.instancias.map((inst) => (
                        <div key={inst.instancia} className="rounded-md border bg-muted/30 p-3">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="text-sm font-semibold">📱 {inst.instancia}</span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {inst.owner_number ? formatPhoneBR(inst.owner_number) : "Sem número conectado"}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <Badge variant="outline">{inst.total} total</Badge>
                              <Badge variant="default" className="bg-accent/20 text-accent hover:bg-accent/30">
                                {inst.enviados} ok
                              </Badge>
                              {inst.erros > 0 && (
                                <Badge variant="destructive">{inst.erros} erro(s)</Badge>
                              )}
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                  <TableHead className="text-right">Enviados</TableHead>
                                  <TableHead className="text-right">Erros</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {inst.linhas.map((l, idx) => (
                                  <TableRow key={`${l.data}-${idx}`}>
                                    <TableCell className="whitespace-nowrap">
                                      {formatDateBR(l.data)}
                                    </TableCell>
                                    <TableCell className="text-right">{l.total ?? 0}</TableCell>
                                    <TableCell className="text-right text-accent">
                                      {l.enviados ?? 0}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {(l.erros ?? 0) > 0 ? (
                                        <span className="text-destructive font-medium">
                                          {l.erros}
                                        </span>
                                      ) : (
                                        0
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
