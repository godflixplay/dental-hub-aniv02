// Server-only helper para enviar Web Push para todos os admins.
// Importado por triggers internos (asaas webhook, evolution sync).
import webpush from "web-push";
import { getSupabaseAdmin } from "@/integrations/supabase/admin.server";

let configured = false;
function configureWebPush() {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@dentalhub.app";
  if (!pub || !priv) {
    console.warn("[push] VAPID keys ausentes — push desabilitado");
    return false;
  }
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tipo?: "info" | "sucesso" | "aviso" | "erro";
}

/**
 * Dispara push para todos os admins + grava em `notificacoes` (audiência admin)
 * para alimentar o sino in-app.
 */
export async function sendPushToAdmins(payload: PushPayload) {
  if (!configureWebPush()) return { ok: false, reason: "vapid-missing" };
  const admin = getSupabaseAdmin();

  // 1) Identifica todos os user_id de admins
  const { data: admins, error: adminsErr } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  if (adminsErr) {
    console.error("[push] erro buscando admins", adminsErr);
    return { ok: false, error: adminsErr.message };
  }
  const adminIds = (admins ?? []).map((a) => a.id as string);
  if (adminIds.length === 0) return { ok: true, sent: 0 };

  // 2) Busca subscriptions
  const { data: subs, error: subsErr } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", adminIds);
  if (subsErr) {
    console.error("[push] erro buscando subscriptions", subsErr);
  }

  // 3) Insere registros no sino in-app (1 por admin)
  await admin.from("notificacoes").insert(
    adminIds.map((uid) => ({
      user_id: uid,
      titulo: payload.title,
      mensagem: payload.body,
      tipo: payload.tipo ?? "info",
      audiencia: "admin",
      link: payload.url ?? null,
    })),
  );

  // 4) Dispara push em paralelo + cleanup de endpoints inválidos
  const json = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/admin",
  });

  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint as string,
            keys: { p256dh: s.p256dh as string, auth: s.auth as string },
          },
          json,
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("id", s.id as string);
        } else {
          console.warn("[push] falha em endpoint", status, err);
        }
      }
    }),
  );

  return { ok: true, sent, total: subs?.length ?? 0 };
}
