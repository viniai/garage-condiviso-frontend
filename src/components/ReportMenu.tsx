import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/endpoints";
import { useSession } from "../auth/session";
import { ErrorNote } from "./ui";

export type ReportTarget = "profile" | "part" | "review" | "entry";

/** Azione del titolare (Modifica, Elimina…): al posto di "Segnala" sui propri contenuti. */
export interface OwnerAction {
  label: string;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
}

const REASONS = [
  ["spam", "Spam o pubblicità"],
  ["illegal", "Pezzo rubato, contraffatto o illegale"],
  ["offensive", "Contenuto offensivo"],
  ["fake", "Falso o ingannevole"],
  ["other", "Altro"],
] as const;

/**
 * Menu a tre puntini. Sui contenuti altrui ha la voce "Segnala"; sui propri (`ownerActions`)
 * ha Modifica/Elimina, perché non ha senso segnalare sé stessi.
 */
export default function ReportMenu({ targetType, targetId, label = "contenuto", ownerActions }: { targetType: ReportTarget; targetId: string; label?: string; ownerActions?: OwnerAction[] }) {
  const { token } = useSession();
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [reason, setReason] = useState<string>("spam");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<unknown>();
  const box = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (!box.current?.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  function closeDialog() {
    setDialog(false);
    setState("idle");
    setError(undefined);
    setDetails("");
  }

  async function send() {
    setState("busy");
    setError(undefined);
    try {
      await api.report(token as string, { target_type: targetType, target_id: targetId, reason, details: details.trim() });
      setState("sent");
    } catch (err) {
      setError(err);
      setState("idle");
    }
  }

  return (
    <span className="kebab" ref={box}>
      <button className="kebab-btn" aria-label="Altre azioni" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>⋯</button>
      {menu ? (
        <div className="kebab-menu" role="menu">
          {ownerActions ? ownerActions.map((a) => a.to ? (
            <Link key={a.label} role="menuitem" className="kebab-item" to={a.to} onClick={() => setMenu(false)}>{a.label}</Link>
          ) : (
            <button key={a.label} role="menuitem" className={a.danger ? "danger" : undefined} onClick={() => { setMenu(false); a.onClick?.(); }}>{a.label}</button>
          )) : (
            <button role="menuitem" onClick={() => { setMenu(false); setDialog(true); }}>Segnala</button>
          )}
        </div>
      ) : null}
      {dialog ? (
        <div className="modal-back" onClick={closeDialog}>
          <div className="modal card stack" role="dialog" aria-modal="true" aria-label="Segnala" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: 0 }}>Segnala {label}</h2>
            {!token ? (
              <>
                <p>Per inviare una segnalazione devi accedere.</p>
                <div className="row"><Link className="btn primary" to="/login">Accedi</Link><button onClick={closeDialog}>Annulla</button></div>
              </>
            ) : state === "sent" ? (
              <>
                <p className="ok">Grazie, abbiamo ricevuto la segnalazione e la esamineremo.</p>
                <button onClick={closeDialog}>Chiudi</button>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="rep-reason">Motivo</label>
                  <select id="rep-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
                    {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="rep-details">Dettagli (facoltativo)</label>
                  <textarea id="rep-details" maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
                </div>
                <ErrorNote error={error} />
                <div className="row"><button className="primary" onClick={() => void send()} disabled={state === "busy"}>Invia segnalazione</button><button onClick={closeDialog}>Annulla</button></div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </span>
  );
}
