import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, Save, ImageIcon } from "lucide-react";

export interface ModeloRow {
  id: string;
  categoria: string;
  titulo: string;
  descricao: string | null;
  mensagem: string;
  imagem_url: string;
  imagem_path: string;
  ativo: boolean;
  ordem: number;
}

export const CATEGORIAS = [
  { value: "aniversario", label: "Aniversário" },
  { value: "datas-comemorativas", label: "Datas comemorativas" },
  { value: "promocional", label: "Promocional" },
  { value: "outros", label: "Outros" },
];

const BUCKET = "modelos-mensagens";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modelo: ModeloRow | null;
  onSaved: () => void;
}

export function ModeloDialog({ open, onOpenChange, modelo, onSaved }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState("aniversario");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [ordem, setOrdem] = useState(0);
  const [ativo, setAtivo] = useState(true);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [imagemPath, setImagemPath] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (modelo) {
      setCategoria(modelo.categoria);
      setTitulo(modelo.titulo);
      setDescricao(modelo.descricao ?? "");
      setMensagem(modelo.mensagem);
      setOrdem(modelo.ordem);
      setAtivo(modelo.ativo);
      setImagemUrl(modelo.imagem_url);
      setImagemPath(modelo.imagem_path);
    } else {
      setCategoria("aniversario");
      setTitulo("");
      setDescricao("");
      setMensagem("");
      setOrdem(0);
      setAtivo(true);
      setImagemUrl(null);
      setImagemPath(null);
    }
    setPendingFile(null);
    setLocalPreview((c) => {
      if (c?.startsWith("blob:")) URL.revokeObjectURL(c);
      return null;
    });
  }, [open, modelo]);

  useEffect(() => {
    return () => {
      if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }
    setLocalPreview((c) => {
      if (c?.startsWith("blob:")) URL.revokeObjectURL(c);
      return URL.createObjectURL(f);
    });
    setPendingFile(f);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSave = async () => {
    if (!titulo.trim()) return toast.error("Informe um título");
    if (!mensagem.trim()) return toast.error("Informe a mensagem sugerida");
    if (!modelo && !pendingFile) return toast.error("Selecione uma imagem");

    setSaving(true);
    try {
      let nextUrl = imagemUrl;
      let nextPath = imagemPath;

      if (pendingFile) {
        const ext = (pendingFile.name.split(".").pop() || "png")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "png";
        const path = `${categoria}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, pendingFile, {
            upsert: false,
            contentType: pendingFile.type || undefined,
            cacheControl: "3600",
          });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        nextUrl = pub.publicUrl;
        // se editando e havia imagem antiga, apaga depois do save com sucesso
        const oldPath = imagemPath;
        nextPath = path;

        if (modelo) {
          const { error } = await supabase
            .from("modelos_mensagens")
            .update({
              categoria,
              titulo: titulo.trim(),
              descricao: descricao.trim() || null,
              mensagem: mensagem.trim(),
              imagem_url: nextUrl,
              imagem_path: nextPath,
              ativo,
              ordem,
              updated_at: new Date().toISOString(),
            })
            .eq("id", modelo.id);
          if (error) throw error;
          if (oldPath && oldPath !== nextPath) {
            await supabase.storage.from(BUCKET).remove([oldPath]);
          }
        } else {
          const { error } = await supabase.from("modelos_mensagens").insert({
            categoria,
            titulo: titulo.trim(),
            descricao: descricao.trim() || null,
            mensagem: mensagem.trim(),
            imagem_url: nextUrl,
            imagem_path: nextPath,
            ativo,
            ordem,
          });
          if (error) throw error;
        }
      } else if (modelo) {
        const { error } = await supabase
          .from("modelos_mensagens")
          .update({
            categoria,
            titulo: titulo.trim(),
            descricao: descricao.trim() || null,
            mensagem: mensagem.trim(),
            ativo,
            ordem,
            updated_at: new Date().toISOString(),
          })
          .eq("id", modelo.id);
        if (error) throw error;
      }

      toast.success(modelo ? "Modelo atualizado" : "Modelo criado");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("[ModeloDialog] save error", err);
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const preview = localPreview ?? imagemUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{modelo ? "Editar modelo" : "Novo modelo"}</DialogTitle>
          <DialogDescription>
            Modelos ficam disponíveis para os clientes escolherem na aba Mensagem.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label>Imagem</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
              <div className="mt-1 overflow-hidden rounded-md border bg-muted/30">
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview do modelo"
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center text-muted-foreground">
                    <ImageIcon className="mr-2 h-5 w-5" />
                    Sem imagem
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => fileRef.current?.click()}
                disabled={saving}
              >
                <Upload className="mr-2 h-4 w-4" />
                {preview ? "Trocar imagem" : "Selecionar imagem"}
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG ou WEBP. Máx 5MB.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Título</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Aniversário clássico"
              />
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Curta descrição interna"
              />
            </div>

            <div>
              <Label>Mensagem sugerida</Label>
              <Textarea
                rows={5}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="🎂 Feliz aniversário, {nome}!..."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use <code className="rounded bg-muted px-1">{"{nome}"}</code> para o nome do contato.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Inativos não aparecem para os clientes.
                </p>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>

            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={ordem}
                onChange={(e) => setOrdem(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
