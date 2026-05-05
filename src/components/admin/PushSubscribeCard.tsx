import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  getVapidPublicKey,
  registerPushSubscription,
  unregisterPushSubscription,
  testPushAdmin,
} from "@/utils/push.functions";

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushSubscribeCard() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? "";
  const [supported, setSupported] = useState<boolean | null>(null);
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker
      .getRegistration("/sw.js")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  const handleSubscribe = async () => {
    if (!accessToken) return;
    setBusy(true);
    try {
      const reg =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ??
        (await navigator.serviceWorker.register("/sw.js"));
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Permissão de notificação negada");
        return;
      }
      const { key } = await getVapidPublicKey();
      if (!key) {
        toast.error("Servidor não tem VAPID configurado");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(key),
      });
      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        toast.error("Subscription inválida");
        return;
      }
      await registerPushSubscription({
        data: {
          accessToken,
          subscription: {
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          },
          userAgent: navigator.userAgent,
        },
      });
      setSubscribed(true);
      toast.success("Notificações ativadas neste dispositivo");
    } catch (err) {
      console.error("[push] subscribe", err);
      toast.error("Falha ao ativar notificações");
    } finally {
      setBusy(false);
    }
  };

  const handleUnsubscribe = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await unregisterPushSubscription({
          data: { accessToken, endpoint: sub.endpoint },
        });
      }
      setSubscribed(false);
      toast.success("Notificações desativadas");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao desativar");
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      const r = await testPushAdmin({ data: { accessToken } });
      toast.success(`Disparado para ${r.sent ?? 0} dispositivo(s)`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (supported === false) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        Este navegador não suporta notificações push.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Notificações Push (admin)</h3>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Receba alertas no dispositivo quando uma instância desconectar ou houver nova assinatura.
      </p>
      <div className="flex flex-wrap gap-2">
        {subscribed ? (
          <Button variant="outline" onClick={handleUnsubscribe} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellOff className="mr-2 h-4 w-4" />}
            Desativar neste dispositivo
          </Button>
        ) : (
          <Button onClick={handleSubscribe} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
            Ativar notificações
          </Button>
        )}
        {subscribed && (
          <Button variant="ghost" onClick={handleTest} disabled={busy}>
            Enviar push de teste
          </Button>
        )}
      </div>
    </div>
  );
}
