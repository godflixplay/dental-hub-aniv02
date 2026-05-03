import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/integrations/supabase/client";

const saveSchema = z.object({
  accessToken: z.string().min(1),
  mensagem: z.string().min(1).max(4000),
  // URL pública já uploadada (própria do user) — caminho preferencial.
  imagemUrl: z.string().url().nullable().optional(),
  // Alternativa: id de modelo, server faz a cópia para o bucket do user.
  modeloId: z.string().uuid().nullable().optional(),
});

const BUCKET = "imagens-whatsapp";

async function getAuthed(accessToken: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Error("Usuário não autenticado");
  return { supabase, user: data.user };
}

function sanitizeExt(name: string): string {
  if (!name?.includes(".")) return "png";
  const tail = name.split(".").pop() ?? "";
  const cleaned = tail.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned || "png";
}

/**
 * Salva config_mensagem + whatsapp_instances.imagem_url e retorna
 * a URL final efetivamente persistida no banco (após reler).
 *
 * Quando vier `modeloId`, o servidor baixa a imagem do modelo e re-uploada
 * no bucket do usuário, garantindo que `whatsapp_instances.imagem_url`
 * sempre aponte para um arquivo do próprio user (consumido pelo n8n).
 */
export const saveMensagemConfig = createServerFn({ method: "POST" })
  .inputValidator((input: z.infer<typeof saveSchema>) => saveSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase, user } = await getAuthed(data.accessToken);

    // 1) Instância obrigatória (precisamos do nome para compor path).
    const { data: instance, error: instanceErr } = await supabase
      .from("whatsapp_instances")
      .select("id, instance_name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (instanceErr) throw new Error(`Erro buscando instância: ${instanceErr.message}`);
    if (!instance?.instance_name) {
      throw new Error("Conecte uma instância do WhatsApp antes de salvar.");
    }

    let finalImagemUrl: string | null = data.imagemUrl ?? null;

    // 2) Se foi escolhido um modelo, baixa e re-uploada no bucket do user.
    if (data.modeloId) {
      const { data: modelo, error: modeloErr } = await supabase
        .from("modelos_mensagens")
        .select("imagem_url")
        .eq("id", data.modeloId)
        .eq("ativo", true)
        .maybeSingle();
      if (modeloErr) throw new Error(`Erro buscando modelo: ${modeloErr.message}`);
      if (!modelo?.imagem_url) throw new Error("Modelo não encontrado.");

      const resp = await fetch(modelo.imagem_url);
      if (!resp.ok) throw new Error(`Falha ao baixar imagem do modelo (${resp.status})`);
      const blob = await resp.blob();
      const ext = sanitizeExt(modelo.imagem_url);
      const path = `${user.id}/${instance.instance_name}/imagem.${ext}`;

      const arrayBuffer = await blob.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, new Uint8Array(arrayBuffer), {
          upsert: true,
          contentType: blob.type || "image/png",
          cacheControl: "0",
        });
      if (uploadErr) throw new Error(`Falha no upload do modelo: ${uploadErr.message}`);

      // Limpa imagens antigas com outra extensão.
      const folder = `${user.id}/${instance.instance_name}`;
      const { data: list } = await supabase.storage.from(BUCKET).list(folder);
      if (list) {
        const toRemove = list
          .filter((f) => f.name.startsWith("imagem.") && `${folder}/${f.name}` !== path)
          .map((f) => `${folder}/${f.name}`);
        if (toRemove.length > 0) {
          await supabase.storage.from(BUCKET).remove(toRemove);
        }
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      finalImagemUrl = `${pub.publicUrl}?v=${Date.now()}`;
    }

    // 3) Valida acessibilidade da imagem final (HEAD do servidor — sem CORS).
    if (finalImagemUrl) {
      try {
        const head = await fetch(finalImagemUrl, { method: "HEAD" });
        if (!head.ok) {
          throw new Error(`Imagem inacessível (HTTP ${head.status}): ${finalImagemUrl}`);
        }
      } catch (err) {
        throw new Error(
          `Falha ao validar imagem: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // 4) Upsert config_mensagem.
    const { error: cfgErr } = await supabase
      .from("config_mensagem")
      .upsert(
        {
          user_id: user.id,
          mensagem: data.mensagem.trim(),
          imagem_url: finalImagemUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (cfgErr) throw new Error(`Erro salvando config_mensagem: ${cfgErr.message}`);

    // 5) Update whatsapp_instances.imagem_url.
    const { error: instUpdErr } = await supabase
      .from("whatsapp_instances")
      .update({ imagem_url: finalImagemUrl })
      .eq("id", instance.id)
      .eq("user_id", user.id);
    if (instUpdErr) {
      throw new Error(`Erro atualizando whatsapp_instances: ${instUpdErr.message}`);
    }

    // 6) Reler para confirmar persistência real.
    const [cfgRead, instRead] = await Promise.all([
      supabase
        .from("config_mensagem")
        .select("imagem_url, mensagem")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("whatsapp_instances")
        .select("imagem_url")
        .eq("id", instance.id)
        .maybeSingle(),
    ]);

    const cfgImg = cfgRead.data?.imagem_url ?? null;
    const instImg = instRead.data?.imagem_url ?? null;

    console.log("[saveMensagemConfig] confirmado", {
      user_id: user.id,
      instance_id: instance.id,
      finalImagemUrl,
      cfgImg,
      instImg,
    });

    if (cfgImg !== finalImagemUrl || instImg !== finalImagemUrl) {
      throw new Error(
        `Persistência inconsistente. cfg=${cfgImg} inst=${instImg} esperado=${finalImagemUrl}`,
      );
    }

    return {
      success: true as const,
      imagemUrl: finalImagemUrl,
      mensagem: cfgRead.data?.mensagem ?? data.mensagem,
    };
  });
