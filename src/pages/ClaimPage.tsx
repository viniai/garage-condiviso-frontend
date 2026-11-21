import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/endpoints";
import { useSession } from "../auth/session";
import { Brand, ErrorNote, LoginPrompt, Page } from "../components/ui";

/** Riscatto di un profilo creato dall'admin (concierge seeding): /claim?token=... */
export default function ClaimPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { token: session, me, loading, refresh } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  if (!token) return <Page><h1>Link non valido</h1></Page>;
  if (loading) return <Page><p className="muted">Caricamento…</p></Page>;
  if (!session) {
    return (
      <Page>
        <Brand />
        <h1>Riscatta il tuo profilo</h1>
        <p>Qualcuno ha già preparato per te una vetrina su Vicini di Box. Accedi per renderla tua.</p>
        <LoginPrompt next={`/claim?token=${encodeURIComponent(token)}`} message="Accedi con l'email che vuoi associare al profilo." />
      </Page>
    );
  }
  if (me?.profile) {
    return (
      <Page>
        <h1>Hai già un profilo</h1>
        <p><Link to="/profilo">Vai al tuo profilo</Link></p>
      </Page>
    );
  }

  async function claim() {
    setBusy(true);
    setError(undefined);
    try {
      await api.claimProfile(session as string, token);
      await refresh();
      navigate("/profilo", { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <h1>Riscatta il tuo profilo</h1>
      <div className="card stack">
        <p>Il profilo e i pezzi in vetrina diventeranno tuoi: potrai modificarli, nasconderli o eliminarli.</p>
        <ErrorNote error={error} />
        <button className="primary" onClick={claim} disabled={busy}>Riscatta profilo</button>
      </div>
    </Page>
  );
}
