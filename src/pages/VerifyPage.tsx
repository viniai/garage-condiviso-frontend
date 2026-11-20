import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/endpoints";
import { takeNext, useSession } from "../auth/session";
import { ErrorNote, Page } from "../components/ui";

export default function VerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useSession();
  const [error, setError] = useState<unknown>();
  const started = useRef(false); // il link è monouso: in StrictMode non va consumato due volte

  useEffect(() => {
    const token = params.get("token");
    if (started.current) return;
    started.current = true;
    if (!token) {
      setError(new Error("Link non valido"));
      return;
    }
    api
      .verify(token)
      .then(({ access_token }) => {
        login(access_token);
        navigate(takeNext() ?? "/profilo", { replace: true });
      })
      .catch(setError);
  }, [params, login, navigate]);

  return (
    <Page>
      <h1>Accesso in corso…</h1>
      <ErrorNote error={error} />
      {error ? <p><a href="/login">Richiedi un nuovo link</a></p> : null}
    </Page>
  );
}
