import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import { getSupabaseAdmin } from "@/integrations/supabase/admin.server";
import { sendPushToAdmins } from "./push.server";

async function getAuthedUser(accessToken: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Error("Não autenticado");
  return { supabase, user: data.user };
}

// Devolve a public key VAPID para o browser usar no subscribe
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(
  async () => {
    return { key: process.env.VAPID_PUBLIC_KEY ?? null };
  },
);

// Registra (upsert) uma subscription
export const registerPushSubscription = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(1),
      subscription: z.object({
        endpoint: z.string().url().min(1).max(2000),
        keys: z.object({
          p256dh: z.string().min(1).max(500),
          auth: z.string().min(1).max(500),
        }),
      }),
      userAgent: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await getAuthedUser(data.accessToken);
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: data.subscription.endpoint,
        p256dh: data.subscription.keys.p256dh,
        auth: data.subscription.keys.auth,
        user_agent: data.userAgent ?? null,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unregisterPushSubscription = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(1),
      endpoint: z.string().url().min(1).max(2000),
    }),
  )
  .handler(async ({ data }) => {
    const { user } = await getAuthedUser(data.accessToken);
    const admin = getSupabaseAdmin();
    await admin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", data.endpoint);
    return { ok: true };
  });

// Endpoint de teste — admin-only
export const testPushAdmin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ accessToken: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { supabase, user } = await getAuthedUser(data.accessToken);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") throw new Error("Acesso negado");
    const result = await sendPushToAdmins({
      title: "Teste de notificação",
      body: "Se você está vendo isto, push está funcionando ✅",
      url: "/admin",
      tipo: "sucesso",
    });
    return result;
  });
