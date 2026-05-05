import { useEffect, useState } from "react";
import { X } from "lucide-react";

const UPDATE_VERSION = "2026-05-05-01";
const UPDATE_TIME = "05/05/2026";
const STORAGE_KEY = "dh_update_dismissed";

export function UpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed !== UPDATE_VERSION) setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, UPDATE_VERSION);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-primary/20 bg-card p-4 shadow-lg">
      <button
        onClick={dismiss}
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="pr-6">
        <p className="text-sm font-semibold text-foreground">
          🚀 Atualização do sistema
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Versão <span className="font-mono">{UPDATE_VERSION}</span> aplicada em{" "}
          {UPDATE_TIME}. Removidos: testes de envio e diagnóstico de rede.
          Mantido: status de conexão WhatsApp e histórico em tempo real.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Se você está vendo esta mensagem, as mudanças já estão ativas.
        </p>
      </div>
    </div>
  );
}
