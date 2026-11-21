import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/endpoints";
import { rememberNext, takeNext, useSession } from "../auth/session";
import GoogleButton from "../components/GoogleButton";
import { Brand, ErrorNote, Page } from "../components/ui";

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useSession();
  const [googleId, setGoogleId] = useState<string | null>(null);
  const next = (location.state as { next?: string } | null)?.next;
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.config().then((c) => setGoogleId(c.google_client_id ?? null)).catch(() => setGoogleId(null));
  }, []);

  const onGoogle = useCallback(
    async (credential: string) => {
      setError(undefined);
      try {
        if (next) rememberNext(next);
        const { access_token } = await api.googleLogin(credential);
        login(access_token);
        navigate(takeNext() ?? "/profilo", { replace: true });
      } catch (err) {
        setError(err);
      }
    },
    [login, navigate, next],
  );

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
      <p className="muted">Niente password: accedi con Google o ricevi un link monouso via email.</p>
      {sent ? (
        <div className="card">
          <p className="ok">Controlla la posta: ti abbiamo inviato il link (valido 15 minuti).</p>
        </div>
      ) : (
        <form className="card stack" onSubmit={submit}>
          {googleId ? (
            <>
              <GoogleButton clientId={googleId} onCredential={onGoogle} onError={setError} />
              <p className="muted or">oppure con l'email</p>
            </>
          ) : null}
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
