import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";

export const errorText = (err: unknown): string =>
  err instanceof ApiError || err instanceof Error ? err.message : "Errore imprevisto";

export function Page({ children }: { children: ReactNode }) {
  return (
    <main className="content">
      <div className="page">{children}</div>
    </main>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  return error ? <p className="error" role="alert">{errorText(error)}</p> : null;
}

export function PrivacyBadge() {
  return <span className="badge" title="Questi dati non lasciano il tuo browser">Solo su questo dispositivo</span>;
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="stars" role="img" aria-label={`${value} stelle su 5`}>
      {"★".repeat(value)}
      {"☆".repeat(5 - value)}
    </span>
  );
}

export function LoginPrompt({ next, message }: { next: string; message: string }) {
  return (
    <div className="card">
      <p>{message}</p>
      <Link className="btn primary" to="/login" state={{ next }}>Accedi con la tua email</Link>
    </div>
  );
}
