import { useEffect, useRef } from "react";

const SRC = "https://accounts.google.com/gsi/client";

interface GoogleId {
  initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void;
  renderButton: (el: HTMLElement, o: Record<string, string | number>) => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

function loadScript(): Promise<void> {
  if (window.google) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    const s = existing ?? document.createElement("script");
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("Google non raggiungibile")));
    if (!existing) {
      s.src = SRC;
      s.async = true;
      document.head.appendChild(s);
    }
  });
}

/** Pulsante "Accedi con Google" (Google Identity Services). Lo script si carica solo qui. */
export default function GoogleButton({
  clientId,
  onCredential,
  onError,
}: {
  clientId: string;
  onCredential: (credential: string) => void;
  onError: (e: unknown) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;

  useEffect(() => {
    let alive = true;
    loadScript()
      .then(() => {
        const g = window.google?.accounts.id;
        if (!alive || !g || !box.current) return;
        g.initialize({ client_id: clientId, callback: (r) => cb.current(r.credential) });
        g.renderButton(box.current, { type: "standard", theme: "outline", size: "large", text: "continue_with", locale: "it", width: 280 });
      })
      .catch(onError);
    return () => {
      alive = false;
    };
  }, [clientId, onError]);

  return <div ref={box} className="google-btn" aria-label="Continua con Google" />;
}
