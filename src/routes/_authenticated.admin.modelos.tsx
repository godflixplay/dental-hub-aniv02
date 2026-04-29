import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, ImageIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  CATEGORIAS,
  ModeloDialog,
  type ModeloRow,
} from "@/components/admin/ModeloDialog";

export const Route = createFileRoute("/_authenticated/admin/modelos")({
  component: AdminModelosPage,
});

const BUCKET = "modelos-mensagens";

function categoriaLabel(value: string) {
  return CATEGORIAS.find((c) => c.value === value)?.label ?? value;
}

function AdminModelosPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ModeloRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ModeloRow | null>(null);

  const query = useQuery({
    queryKey: ["admin:modelos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modelos_mensagens")
        .select("*")
        .order("categoria")
        .order("ordem")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ModeloRow[];
    },
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ["admin:modelos"] });

  const toggleAtivo = async (m: ModeloRow) => {
    const { error } = await supabase
      .from("modelos_mensagens")
      .update({ ativo: !m.ativo, updated_at: new Date().toISOString() })
      .eq("id", m.id);
    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    refetch();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const m = confirmDelete;
    setConfirmDelete(null);
    const { error } = await supabase
      .from("modelos_mensagens")
      .delete()
      .eq("id", m.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    if (m.imagem_path) {
      await supabase.storage.from(BUCKET).remove([m.imagem_path]);
    }
    toast.success("Modelo excluído");
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modelos de Mensagens</h1>
          <p className="text-sm text-muted-foreground">
            Crie modelos prontos (imagem + texto) para os clientes escolherem.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo modelo
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : query.error ? (
        <Card className="p-6 text-sm text-destructive">
          Erro ao carregar: {(query.error as Error).message}
        </Card>
      ) : !query.data?.length ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum modelo cadastrado ainda.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {query.data.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              <div className="relative aspect-video w-full bg-muted">
                <img
                  src={m.imagem_url}
                  alt={m.titulo}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {!m.ativo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                    <Badge variant="secondary">Inativo</Badge>
                  </div>
                )}
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{m.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {categoriaLabel(m.categoria)} · ordem {m.ordem}
                    </p>
                  </div>
                  <Switch
                    checked={m.ativo}
                    onCheckedChange={() => toggleAtivo(m)}
                  />
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {m.mensagem}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditing(m);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDelete(m)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ModeloDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        modelo={editing}
        onSaved={refetch}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o modelo "{confirmDelete?.titulo}" e a imagem
              associada. Os clientes que já o aplicaram não são afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
