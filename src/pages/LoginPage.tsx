import { type FormEvent, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api/endpoints";
import { rememberNext } from "../auth/session";
import { Brand, ErrorNote, Page } from "../components/ui";

export default function LoginPage() {
  const location = useLocation();
  const next = (location.state as { next?: string } | null)?.next;
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      if (next) rememberNext(next);
      await api.requestMagicLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <Brand />
      <h1>Accedi</h1>
      <p className="muted">Niente password: ti inviamo un link di accesso monouso via email.</p>
      {sent ? (
        <div className="card">
          <p className="ok">Controlla la posta: ti abbiamo inviato il link (valido 15 minuti).</p>
        </div>
      ) : (
        <form className="card stack" onSubmit={submit}>
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <ErrorNote error={error} />
          <button className="primary" disabled={busy}>Inviami il link</button>
        </form>
      )}
    </Page>
  );
}
