import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare, Upload, Save, ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  buildMensagemPreview,
  DEFAULT_MENSAGEM_ANIVERSARIO,
} from "@/components/aniversarios/mensagem-config";
import {
  getAniversariosErrorMessage,
  withRequestTimeout,
} from "@/components/aniversarios/request-utils";
import { ModelosGaleria, type ModeloMensagem } from "@/components/aniversarios/ModelosGaleria";

interface ConfigMensagem {
  id: string;
  mensagem: string;
  imagem_url: string | null;
}

export function MensagemTab({ acessoAtivo = true }: { acessoAtivo?: boolean } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const userId = user?.id;
  const fileRef = useRef<HTMLInputElement>(null);
  const [mensagem, setMensagem] = useState(DEFAULT_MENSAGEM_ANIVERSARIO);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedModelo, setSelectedModelo] = useState<ModeloMensagem | null>(null);
  const [saving, setSaving] = useState(false);
  // Garante que o sync com a query só roda 1× por payload novo do servidor.
  const lastSyncedIdRef = useRef<string | null>(null);

  const configQuery = useQuery({
    queryKey: ["aniv:config:full", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await withRequestTimeout(
        supabase
          .from("config_mensagem")
          .select("id, mensagem, imagem_url")
          .eq("user_id", userId!)
          .maybeSingle(),
        "O carregamento da configuração da mensagem",
      );
      if (error) throw error;
      return (data as ConfigMensagem | null) ?? null;
    },
  });

  // Instância do usuário (para compor o path da imagem por instância e
  // gravar a URL pública em whatsapp_instances.imagem_url).
  const instanceQuery = useQuery({
    queryKey: ["aniv:wpp:instance", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await withRequestTimeout(
        supabase
          .from("whatsapp_instances")
          .select("id, instance_name")
          .eq("user_id", userId!)
          .maybeSingle(),
        "O carregamento da instância do WhatsApp",
      );
      if (error) throw error;
      return (data as { id: string; instance_name: string } | null) ?? null;
    },
  });

  const config = configQuery.data ?? null;

  // Sincroniza o estado local com a config vinda do servidor.
  // Guard usa id+imagem_url+mensagem (não só id) — assim, quando o
  // mesmo registro recebe nova imagem, o sync acontece com os dados
  // frescos e nunca faz rollback do que acabou de ser salvo.
  // Também: se há pendingFile/selectedModelo (alteração não salva),
  // NUNCA sobrescreve o estado local com o que veio do servidor.
  useEffect(() => {
    if (configQuery.isLoading) return;
    if (configQuery.isFetching) return; // espera dados realmente frescos
    if (pendingFile || selectedModelo) return; // não atropela edição local

    const key = config
      ? `${config.id}::${config.imagem_url ?? ""}::${config.mensagem ?? ""}`
      : "__none__";
    if (lastSyncedIdRef.current === key) return;
    lastSyncedIdRef.current = key;

    if (config) {
      setMensagem(config.mensagem);
      setImagemUrl(config.imagem_url);
    } else {
      setMensagem(DEFAULT_MENSAGEM_ANIVERSARIO);
      setImagemUrl(null);
    }
    setLocalPreviewUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return null;
    });
  }, [config, configQuery.isLoading, configQuery.isFetching, pendingFile, selectedModelo]);

  useEffect(() => {
    if (configQuery.error) {
      toast.error(getAniversariosErrorMessage(configQuery.error));
    }
  }, [configQuery.error]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    console.log("ARQUIVO SELECIONADO:", file);
    setPendingFile(file);
    console.log("[MensagemTab] ARQUIVO SELECIONADO detalhes:", file, {
      name: file?.name,
      size: file?.size,
      type: file?.type,
    });
    if (!file) {
      console.warn("[MensagemTab] handleUpload: nenhum arquivo no input");
      return;
    }
    if (!user) {
      console.warn("[MensagemTab] handleUpload: usuário não autenticado");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPendingFile(null);
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPendingFile(null);
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }

    setLocalPreviewUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setSelectedModelo(null);
    console.log("[MensagemTab] setPendingFile chamado com:", file.name, file.size);
    toast.success("Imagem selecionada! Clique em Salvar para confirmar.");

    // NÃO resetamos fileRef.current.value aqui — o reset estava
    // acontecendo síncronamente e podia, em alguns navegadores,
    // disparar um segundo onChange com files vazio antes do React
    // commitar o setPendingFile. Resetamos somente após salvar.
  };

  const handleSelectModelo = (modelo: ModeloMensagem) => {
    setSelectedModelo(modelo);
    setPendingFile(null);
    setLocalPreviewUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return modelo.imagem_url;
    });
    toast.success("Imagem aplicada! Clique em Salvar para confirmar.");
  };

  // Lista os arquivos do folder {user_id}/{instance_name}/ e apaga todos
  // que começam com "imagem." — garante que sobra apenas 1 imagem ativa
  // mesmo que a extensão mude (ex.: antes .png, agora .webp).
  const cleanupInstanceImages = async (instanceName: string, exceptPath?: string) => {
    if (!user) return;
    const folder = `${user.id}/${instanceName}`;
    const { data: listData, error: listError } = await supabase.storage
      .from("imagens-whatsapp")
      .list(folder);
    if (listError || !listData) return;
    const toRemove = listData
      .filter((f) => f.name.startsWith("imagem."))
      .map((f) => `${folder}/${f.name}`)
      .filter((p) => p !== exceptPath);
    if (toRemove.length === 0) return;
    const { error: removeError } = await supabase.storage.from("imagens-whatsapp").remove(toRemove);
    if (removeError) {
      console.warn("[MensagemTab] falha ao limpar imagens antigas", removeError);
    }
  };

  const handleRemoveImage = async () => {
    setLocalPreviewUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return null;
    });
    setPendingFile(null);
    setSelectedModelo(null);
    setImagemUrl(null);

    // Apaga do Storage de verdade — senão a "imagem antiga" persiste
    // no bucket e o n8n pode continuar usando URL velha.
    const instanceName = instanceQuery.data?.instance_name;
    if (user && instanceName) {
      try {
        await cleanupInstanceImages(instanceName);
      } catch (err) {
        console.warn("[MensagemTab] falha ao remover imagem do storage", err);
      }
    }
  };


  console.log("pendingFile atual:", pendingFile);
  console.log("[MensagemTab] render - pendingFile atual:", pendingFile?.name ?? null, "selectedModelo:", selectedModelo?.id ?? null, "imagemUrl:", imagemUrl);

  const handleSave = async () => {
    // ===== VALIDAÇÕES OBRIGATÓRIAS =====
    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }
    if (!mensagem.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    const instanceName = instanceQuery.data?.instance_name;
    const instanceId = instanceQuery.data?.id;
    if (!instanceName || !instanceId) {
      toast.error("Conecte uma instância do WhatsApp antes de salvar.");
      return;
    }

    setSaving(true);
    try {
      // ===== LOGS OBRIGATÓRIOS =====
      console.log("[MensagemTab] handleSave chamado");
      console.log("[MensagemTab] pendingFile:", pendingFile);
      console.log("[MensagemTab] selectedModelo:", selectedModelo);
      console.log("[MensagemTab] imagemUrl atual:", imagemUrl);

      let finalImagemUrl: string | null = null;

      // ===== ETAPA 1: PRIORIDADE ESTRITA =====
      // 1) pendingFile  -> SEMPRE faz upload (nunca reusa URL antiga)
      // 2) selectedModelo -> usa URL pública do modelo
      // 3) imagemUrl pré-existente -> mantém (apenas atualizando texto)
      // 4) nenhum dos três -> sem imagem (null)
      if (pendingFile) {
        console.log("[MensagemTab] -> caminho UPLOAD (pendingFile presente)");
        if (!pendingFile.type.startsWith("image/")) {
          throw new Error("Arquivo inválido (não é imagem).");
        }

        // Path FIXO por instância — sempre sobrescreve com upsert.
        const ext = (pendingFile.name.split(".").pop() || "png")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "png";
        const path = `${user.id}/${instanceName}/imagem.${ext}`;

        console.log("[MensagemTab] UPLOAD iniciando:", {
          path,
          size: pendingFile.size,
          type: pendingFile.type,
        });

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("imagens-whatsapp")
          .upload(path, pendingFile, {
            upsert: true,
            contentType: pendingFile.type || "image/png",
            cacheControl: "0",
          });

        console.log("[MensagemTab] UPLOAD resultado:", { path, uploadData, uploadError });

        if (uploadError) {
          throw new Error(`Falha no upload: ${uploadError.message}`);
        }

        // ===== ETAPA 2: GERAR URL PÚBLICA =====
        const { data: pub } = supabase.storage
          .from("imagens-whatsapp")
          .getPublicUrl(path);

        if (!pub?.publicUrl) {
          throw new Error("Falha ao gerar imagem_url");
        }

        finalImagemUrl = `${pub.publicUrl}?v=${Date.now()}`;
        console.log("[MensagemTab] URL gerada:", finalImagemUrl);

        // Limpa imagens antigas com outra extensão.
        try {
          await cleanupInstanceImages(instanceName, path);
        } catch (cleanupErr) {
          console.warn("[MensagemTab] cleanup falhou (não bloqueante)", cleanupErr);
        }
      } else if (selectedModelo) {
        // Modelo da galeria: usa URL direta (já é pública).
        console.log("[MensagemTab] -> caminho MODELO");
        finalImagemUrl = selectedModelo.imagem_url;
        console.log("[MensagemTab] usando URL do modelo:", finalImagemUrl);
      } else {
        // Sem nova imagem: mantém o que já está salvo (pode ser null).
        console.log("[MensagemTab] -> caminho SEM ALTERAÇÃO de imagem (mantém URL existente)");
        finalImagemUrl = imagemUrl;
      }

      // ===== ETAPA 3: SALVAR NO BANCO (ambas as tabelas) =====
      console.log("[MensagemTab] gravando no banco:", {
        user_id: user.id,
        instance_name: instanceName,
        imagem_url: finalImagemUrl,
      });

      // 3a) whatsapp_instances
      const { error: instErr } = await supabase
        .from("whatsapp_instances")
        .update({ imagem_url: finalImagemUrl })
        .eq("user_id", user.id)
        .eq("instance_name", instanceName);

      if (instErr) {
        throw new Error(`Erro atualizando whatsapp_instances: ${instErr.message}`);
      }

      // 3b) config_mensagem (upsert por user_id)
      const { error: cfgErr } = await supabase.from("config_mensagem").upsert(
        {
          user_id: user.id,
          mensagem: mensagem.trim(),
          imagem_url: finalImagemUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (cfgErr) {
        throw new Error(`Erro salvando config_mensagem: ${cfgErr.message}`);
      }

      // ===== ETAPA 4: RELER PARA CONFIRMAR =====
      const [{ data: cfgRead }, { data: instRead }] = await Promise.all([
        supabase
          .from("config_mensagem")
          .select("imagem_url, mensagem")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("whatsapp_instances")
          .select("imagem_url")
          .eq("id", instanceId)
          .maybeSingle(),
      ]);

      console.log("[MensagemTab] confirmação no banco:", {
        config_mensagem: cfgRead,
        whatsapp_instances: instRead,
        esperado: finalImagemUrl,
      });

      if (cfgRead?.imagem_url !== finalImagemUrl || instRead?.imagem_url !== finalImagemUrl) {
        throw new Error(
          `Persistência inconsistente. cfg=${cfgRead?.imagem_url} inst=${instRead?.imagem_url} esperado=${finalImagemUrl}`,
        );
      }

      // ===== ETAPA 5: ATUALIZAR ESTADO LOCAL =====
      setImagemUrl(finalImagemUrl);
      lastSyncedIdRef.current = null;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["aniv:config:full", userId] }),
        queryClient.invalidateQueries({ queryKey: ["aniv:config", userId] }),
        queryClient.invalidateQueries({ queryKey: ["aniv:wpp:instance", userId] }),
        queryClient.invalidateQueries({ queryKey: ["aniv:instance", userId] }),
      ]);

      setPendingFile(null);
      setSelectedModelo(null);
      if (fileRef.current) fileRef.current.value = "";
      setLocalPreviewUrl((current) => {
        if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
        return null;
      });
      toast.success("Imagem e mensagem salvas no banco!");
    } catch (err) {
      console.error("[MensagemTab] erro ao salvar configuração", err);
      toast.error(getAniversariosErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (configQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const previewMsg = buildMensagemPreview(mensagem, "João");
  const previewImage = localPreviewUrl ?? imagemUrl;

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Mensagem de Aniversário
          </CardTitle>
          <CardDescription>
            Configure a mensagem que será enviada para seus contatos no aniversário deles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Texto da mensagem</Label>
            <Textarea
              rows={6}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="w-full max-w-full resize-y"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Use <code className="rounded bg-muted px-1">{"{nome}"}</code> para inserir o nome do
              contato automaticamente.
            </p>
          </div>

          <ModelosGaleria
            categoria="aniversario"
            selectedId={selectedModelo?.id ?? null}
            onSelect={handleSelectModelo}
          />

          <div>
            <Label>Sua própria imagem (opcional)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={saving}
              >
                <Upload className="mr-2 h-4 w-4" />
                {previewImage ? "Trocar" : "Selecionar"}
              </Button>
              {previewImage && (
                <Button type="button" variant="ghost" size="icon" onClick={handleRemoveImage}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Formatos aceitos: JPG, PNG, WEBP. Máx 5MB.
            </p>
          </div>

          {(pendingFile || selectedModelo) && (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              ⚠ Alterações de imagem não salvas. Clique em <strong>Salvar Configuração</strong> para
              persistir a imagem no banco antes de disparar o envio de teste.
            </p>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !acessoAtivo}
            title={!acessoAtivo ? "Assine um plano para liberar" : undefined}
            className="w-full"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
          <CardDescription>Como a mensagem aparecerá no WhatsApp do contato</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-2 sm:p-4">
            <div className="ml-auto max-w-full rounded-lg rounded-tr-sm border bg-background p-2 shadow-sm sm:max-w-[85%]">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Preview da imagem da mensagem de aniversário"
                  loading="lazy"
                  className="mb-2 w-full rounded object-contain"
                />
              ) : (
                <div className="mb-2 flex h-32 items-center justify-center rounded bg-muted/50 text-xs text-muted-foreground">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Sem imagem
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm text-foreground">{previewMsg}</p>
              <p className="mt-1 text-right text-[10px] text-muted-foreground">12:34 ✓✓</p>
            </div>
          </div>
          {pendingFile ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Imagem selecionada. Clique em Salvar para aplicar essa versão.
            </p>
          ) : config ? (
            <p className="mt-3 text-xs text-muted-foreground">
              ✓ Configuração salva. Edite e clique em Salvar para atualizar.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
