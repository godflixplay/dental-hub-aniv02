import { useEffect, useMemo, useState } from "react";
import { Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const SESSION_DISMISSED_KEY = "dh_pwa_install_dismissed_session";
const USER_DISMISSED_PREFIX = "dh_pwa_install_dismissed_user_";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIOS() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function PWAInstallPrompt() {
  const { user, loading } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const isiOS = useMemo(isIOS, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const isPreviewHost =
      window.location.hostname.includes("id-preview--") ||
      window.location.hostname.includes("lovableproject.com");

    if (isPreviewHost) {
      void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[pwa] service worker não registrado", err);
    });
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (loading || !user || isStandalone()) return;
    if (sessionStorage.getItem(SESSION_DISMISSED_KEY) === "1") return;
    if (localStorage.getItem(`${USER_DISMISSED_PREFIX}${user.id}`) === "1") return;
    if (!isiOS && !deferredPrompt) return;
    const timer = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, [deferredPrompt, isiOS, loading, user]);

  const dismiss = (rememberUser = false) => {
    sessionStorage.setItem(SESSION_DISMISSED_KEY, "1");
    if (rememberUser && user?.id) localStorage.setItem(`${USER_DISMISSED_PREFIX}${user.id}`, "1");
    setOpen(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss(choice.outcome === "accepted");
  };

  if (!user || isStandalone()) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss(false))}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-lg p-5 sm:p-6">
        <DialogHeader className="pr-5 text-left">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <img src="/pwa-icon-192.png" alt="Dental Hub" className="h-9 w-9 rounded-md" />
          </div>
          <DialogTitle>Instale o app no seu celular para acesso rápido</DialogTitle>
          <DialogDescription>
            Abra o Dental Hub como aplicativo, com tela cheia e acesso direto pela tela inicial.
          </DialogDescription>
        </DialogHeader>

        {isiOS && !deferredPrompt ? (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span>
              <div className="flex items-center gap-2">
                <Share className="h-4 w-4 text-primary" />
                <span>Toque em compartilhar no Safari.</span>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</span>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <span>Escolha “Adicionar à tela de início”.</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => dismiss(false)}>
            Agora não
          </Button>
          {deferredPrompt ? (
            <Button onClick={install} className="gap-2">
              <Download className="h-4 w-4" />
              Instalar aplicativo
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}