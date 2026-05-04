import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/integrations/supabase/client";

// Path do n8n alinhado com o projeto de origem (Dental Hub Dashboard).
// O UUID antigo (1a26f671-...) não existe no n8n e retornava 404
// "webhook is not registered". Mantemos o path "enviar-teste" registrado.
const N8N_TEST_WEBHOOK_URL =
  "https://n8n.vendavocenegocios.com.br/webhook-test/1a26f671-f9b2-4c65-b6a2-33000350a7a4";
const N8N_PROD_WEBHOOK_URL =
  "https://webhook.vendavocenegocios.com.br/webhook/1a26f671-f9b2-4c65-b6a2-33000350a7a4";

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
    if (!webhookUrl || !webhookUrl.startsWith("https://")) {
      throw new Error("Webhook URL inválida");
    }

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

    console.log("=== INÍCIO ENVIO WEBHOOK ===");
    console.log("URL:", webhookUrl);
    console.log("PAYLOAD:", { ...payload, token: "***" });

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

    let response: Response | null = null;
    let errorMsg: string | null = null;
    let responseText = "";

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      console.log("ANTES DO FETCH");

      response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      console.log("DEPOIS DO FETCH");
      console.log("STATUS:", response.status);

      responseText = await response.text();
      console.log("RESPOSTA:", responseText);

      console.info("[n8n-webhook] resposta", {
        modo: webhookModo,
        status: response.status,
        ok: response.ok,
        bodySnippet: responseText.slice(0, 200),
      });
    } catch (error) {
      errorMsg = error instanceof Error ? error.message : String(error);
      console.error("ERRO NO FETCH:", error);
      console.error("[n8n-webhook] falha de rede", {
        modo: webhookModo,
        message: errorMsg,
      });
    }

    return {
      success: !!response,
      error: errorMsg ?? (!response ? `Falha ao chamar webhook n8n (${webhookModo})` : null),
      status: response?.status ?? null,
      webhookUrl,
      debug: {
        webhookUrl,
        status: response?.status ?? null,
        erro: errorMsg,
      },
      response: responseText.slice(0, 1000),
      modo: webhookModo,
      debugPayload,
    };
  });
