"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "jex-pwa-hint-dismissed";

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaInstallHint() {
  const [ios, setIos] = useState(false);
  const [promptEvent, setPromptEvent] = useState<PromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (window.matchMedia("(min-width: 769px)").matches) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      return;
    }

    if (isIos()) {
      setIos(true);
      setVisible(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as PromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    dismiss();
  }

  return (
    <div className="pwa-hint" role="status">
      <p className="pwa-hint-text">
        {ios
          ? "Añade JEX a inicio: Compartir → Añadir a pantalla de inicio."
          : "Instala JEX en el teléfono para abrirla como app."}
      </p>
      <div className="pwa-hint-actions">
        {!ios && promptEvent && (
          <button type="button" className="btn-primary btn-sm" onClick={() => void install()}>
            Instalar
          </button>
        )}
        <button type="button" className="btn-secondary btn-sm" onClick={dismiss}>
          Ahora no
        </button>
      </div>
    </div>
  );
}
