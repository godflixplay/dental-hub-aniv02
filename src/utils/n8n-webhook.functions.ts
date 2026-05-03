import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/integrations/supabase/client";

// Path do n8n alinhado com o projeto de origem (Dental Hub Dashboard).
// O UUID antigo (1a26f671-...) não existe no n8n e retornava 404
// "webhook is not registered". Mantemos o path "enviar-teste" registrado.
const N8N_TEST_WEBHOOK_URL =
  "https://n8n.vendavocenegocios.com.br/webhook-test/enviar-teste";
const N8N_PROD_WEBHOOK_URL =
  "https://webhook.vendavocenegocios.com.br/webhook/enviar-teste";

function resolveWebhookUrl(modo: string | null | undefined): {
  url: string;
  modo: "teste" | "producao";
} {
  const normalized = modo === "producao" ? "producao" : "teste";
  return {
    url: normalized === "producao" ? N8N_PROD_WEBHOOK_URL : N8N_TEST_WEBHOOK_URL,
    modo: normalized,
  };
}

const triggerSchema = z.object({
  accessToken: z.string().min(1),
  nome: z.string().min(1).max(200),
  telefone: z.string().min(8).max(20),
  mensagem: z.string().min(1).max(4000),
  modo: z.enum(["teste", "producao"]).optional(),
});

const DEFAULT_MENSAGEM = "🎂 Feliz aniversário, {nome}! 🎉";

async function getAuthenticatedSupabase(accessToken: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData?.user) {
    throw new Error("Usuário não autenticado");
  }
  return { supabase, user: userData.user };
}

function normalizePhoneServer(input: string): string {
  let digits = String(input ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) throw new Error("Telefone vazio.");
  if (!(digits.startsWith("55") && (digits.length === 12 || digits.length === 13))) {
    if (digits.length === 10 || digits.length === 11) {
      digits = "55" + digits;
    }
  }
  if (digits.length !== 12 && digits.length !== 13 || !digits.startsWith("55")) {
    throw new Error(
      `Telefone inválido após normalização: ${digits}. Use formato 55DDXXXXXXXXX.`,
    );
  }
  return digits;
}

function renderMensagem(template: string, nome: string): string {
  return String(template ?? "")
    .replace(/\{\s*nome\s*\}/gi, nome)
    .trim();
}

/**
 * Aciona o webhook do n8n responsável pelo envio de teste.
 *
 * O servidor é a FONTE DA VERDADE: busca instância, mensagem e imagem
 * direto do Supabase no momento do disparo, garantindo que a UI nunca
 * envie dados defasados/cacheados ao n8n.
 *
 * Payload final enviado ao n8n:
 *   { nome, telefone, mensagem, nome_instancia, user_id, imagem_url, instancia_id, api_url, token }
 */
export const triggerN8nTestWebhook = createServerFn({ method: "POST" })
  .inputValidator((input: z.infer<typeof triggerSchema>) =>
    triggerSchema.parse(input),
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await getAuthenticatedSupabase(data.accessToken);

    // 0) Env Evolution — obrigatórias para compor o payload.
    const apiUrlRaw = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    if (!apiUrlRaw || !apiKey) {
      throw new Error(
        "EVOLUTION_API_URL/EVOLUTION_API_KEY ausentes no servidor.",
      );
    }
    const apiUrl = apiUrlRaw.trim();

    // 1) Instância (fonte da verdade para nome, id e imagem).
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("instance_name, instance_id, imagem_url")
      .eq("user_id", user.id)
      .single();

    if (instanceError) {
      throw new Error(`Erro ao buscar instância: ${instanceError.message}`);
    }
    if (!instance) {
      throw new Error("Nenhuma instância WhatsApp encontrada para este usuário.");
    }

    const nomeInstancia = instance.instance_name?.trim() || "";
    if (!nomeInstancia) {
      throw new Error("Instância sem nome (instance_name) — reconecte o WhatsApp.");
    }

    // 2) Config da mensagem (fonte da verdade para o template salvo).
    const { data: configMensagem, error: configError } = await supabase
      .from("config_mensagem")
      .select("mensagem")
      .eq("user_id", user.id)
      .maybeSingle();

    if (configError) {
      throw new Error(`Erro ao buscar config_mensagem: ${configError.message}`);
    }

    // 3) Modo do webhook — prioridade: payload da UI > config_webhook > teste.
    let modoSalvo: string | null | undefined = data.modo;
    if (!modoSalvo) {
      const { data: webhookConfig } = await supabase
        .from("config_webhook")
        .select("modo")
        .eq("user_id", user.id)
        .maybeSingle();
      modoSalvo = webhookConfig?.modo;
    }
    const { url: webhookUrl, modo: webhookModo } = resolveWebhookUrl(modoSalvo);

    // 4) Telefone e nome — dados mínimos vindos da UI.
    if (!data.telefone) throw new Error("Telefone obrigatório.");
    let telefone: string;
    try {
      telefone = normalizePhoneServer(data.telefone);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Telefone inválido.");
    }
    const nome = (data.nome?.trim() || "paciente").slice(0, 200);

    // 5) Mensagem — banco é fonte da verdade; UI só serve de fallback.
    const mensagemTemplate =
      configMensagem?.mensagem?.trim() ||
      data.mensagem?.trim() ||
      DEFAULT_MENSAGEM;
    const mensagem = renderMensagem(mensagemTemplate, nome);
    if (!mensagem) throw new Error("Mensagem vazia após renderização.");

    // 6) Imagem — obrigatória e vinda da instância salva no banco.
    const imagemUrl = String(instance.imagem_url ?? "").trim();
    if (!imagemUrl) {
      throw new Error("imagem_url está vazio - upload não encontrado");
    }
    // Valida acessibilidade real (sem CORS — request do servidor).
    try {
      const head = await fetch(imagemUrl, { method: "HEAD" });
      console.log("[n8n-webhook] HEAD imagem_url", { imagemUrl, status: head.status });
      if (!head.ok) {
        throw new Error(
          `imagem_url inacessível (HTTP ${head.status}): ${imagemUrl}`,
        );
      }
    } catch (err) {
      throw new Error(
        `Falha validando imagem_url: ${err instanceof Error ? err.message : String(err)}`,
      );
    }


    // 7) Payload exatamente como o n8n espera (contrato definitivo).
    const payload = {
      nome,
      telefone,
      mensagem,
      nome_instancia: nomeInstancia,
      user_id: user.id,
      imagem_url: imagemUrl,
      instancia_id: instance.instance_id ?? "",
      api_url: apiUrl,
      token: apiKey,
    };

    console.log("webhookUrl:", webhookUrl);
    console.log("Payload enviado:", { ...payload, token: "***" });

    // Versão sanitizada para retorno ao frontend (debug). Nunca expõe token.
    const debugPayload = {
      telefone: telefone.slice(0, 4) + "***" + telefone.slice(-2),
      nome,
      nome_instancia: nomeInstancia,
      user_id: user.id,
      mensagem_preview: mensagem.slice(0, 80),
      mensagem_len: mensagem.length,
      imagem_url: imagemUrl,
      imagem_fonte: "whatsapp_instances" as const,
      instancia_id: instance.instance_id ?? "",
      api_url: apiUrl,
      token: "***",
    };

    console.info("[n8n-webhook] disparando", {
      modo: webhookModo,
      webhookUrl,
      nomeInstancia,
      hasImagem: Boolean(imagemUrl),
      imagemFonte: "whatsapp_instances",
    });

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();

      console.log("response.status do webhook:", res.status);
      console.info("[n8n-webhook] resposta", {
        modo: webhookModo,
        status: res.status,
        ok: res.ok,
        bodySnippet: text.slice(0, 200),
      });

      if (!res.ok) {
        return {
          success: false as const,
          error: `Webhook n8n (${webhookModo}) respondeu ${res.status}: ${text.slice(0, 500)}`,
          status: res.status,
          modo: webhookModo,
          webhookUrl,
          debugPayload,
        };
      }

      return {
        success: true as const,
        status: res.status,
        response: text.slice(0, 1000),
        modo: webhookModo,
        webhookUrl,
        debugPayload,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[n8n-webhook] falha de rede", { modo: webhookModo, message });
      return {
        success: false as const,
        error: `Falha ao chamar webhook n8n (${webhookModo}): ${message}`,
        modo: webhookModo,
        webhookUrl,
        debugPayload,
      };
    }
  });
