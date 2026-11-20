import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/endpoints";
import { CATEGORIES, type Category } from "../api/types";
import { useSession } from "../auth/session";
import { ErrorNote, Page } from "../components/ui";
import { useAsync } from "../lib/useAsync";

/** Strumenti del concierge seeding: crea profili riscattabili, carica i loro pezzi, modera. */
export default function AdminPage() {
  const { token, me } = useSession();
  const [error, setError] = useState<unknown>();
  const [created, setCreated] = useState<{ id: string; handle: string; claimUrl: string }>();
  const [copied, setCopied] = useState(false);
  const reports = useAsync(() => (token && me?.is_admin ? api.admin.reports(token) : Promise.resolve([])), [token, me?.is_admin]);

  if (!me?.is_admin) return <Page><h1>Riservato</h1><p><Link to="/">Torna alla mappa</Link></p></Page>;

  async function seed(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const res = await api.admin.createProfile(token as string, {
        handle: String(f.get("handle")).trim(),
        display_name: String(f.get("name")).trim(),
        municipality: String(f.get("municipality")).trim(),
        lat: Number(f.get("lat")),
        lon: Number(f.get("lon")),
      });
      setCreated({ id: res.profile.id, handle: res.profile.handle, claimUrl: res.claim_url });
      setError(undefined);
    } catch (err) {
      setError(err);
    }
  }

  async function addPart(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!created) return;
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api.admin.addPart(token as string, created.id, {
        title: String(f.get("title")).trim(),
        category: String(f.get("category")) as Category,
        make: String(f.get("make")).trim(),
        model: String(f.get("model")).trim(),
        description: "",
        is_visible: true,
      });
      form.reset();
      setError(undefined);
    } catch (err) {
      setError(err);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Page>
      <h1>Admin</h1>
      <ErrorNote error={error} />
      <form className="card stack" onSubmit={seed}>
        <strong>1. Crea profilo da riscattare</strong>
        <div className="row">
          <input name="handle" placeholder="handle" required style={{ flex: 1 }} aria-label="Handle" />
          <input name="name" placeholder="Nome visibile" required style={{ flex: 2 }} aria-label="Nome visibile" />
        </div>
        <div className="row">
          <input name="municipality" placeholder="Comune" required style={{ flex: 2 }} aria-label="Comune" />
          <input name="lat" type="number" step="0.01" placeholder="lat" required style={{ flex: 1 }} aria-label="Latitudine" />
          <input name="lon" type="number" step="0.01" placeholder="lon" required style={{ flex: 1 }} aria-label="Longitudine" />
        </div>
        <button className="primary">Crea</button>
      </form>

      {created ? (
        <>
          <div className="card stack">
            <strong>Link di riscatto per @{created.handle}</strong>
            <p className="muted">Mostrato una sola volta: copialo e invialo al titolare (valido 30 giorni).</p>
            <input readOnly value={created.claimUrl} aria-label="Link di riscatto" onFocus={(e) => e.currentTarget.select()} />
            <button onClick={() => void copy(created.claimUrl)}>{copied ? "Copiato" : "Copia link"}</button>
          </div>
          <form className="card stack" onSubmit={addPart}>
            <strong>2. Aggiungi pezzi in vetrina</strong>
            <div className="row">
              <input name="title" placeholder="Pezzo" required minLength={3} style={{ flex: 2 }} aria-label="Pezzo" />
              <input name="make" placeholder="Marca" required style={{ flex: 1 }} aria-label="Marca" />
              <input name="model" placeholder="Modello" style={{ flex: 1 }} aria-label="Modello" />
              <select name="category" aria-label="Categoria">{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
            </div>
            <button>Aggiungi</button>
          </form>
        </>
      ) : null}

      <h2>Segnalazioni aperte</h2>
      {(reports.data ?? []).map((r) => (
        <div key={r.id} className="card stack">
          <div><strong>{r.target_type}</strong> · {r.reason}</div>
          {r.details ? <p>{r.details}</p> : null}
          <div className="row">
            <button onClick={() => void api.admin.resolveReport(token as string, r.id, "dismiss").then(reports.reload)}>Archivia</button>
            <button className="danger" onClick={() => void api.admin.resolveReport(token as string, r.id, "remove").then(reports.reload)}>Rimuovi contenuto</button>
          </div>
        </div>
      ))}
      {reports.data?.length === 0 ? <p className="muted">Nessuna segnalazione.</p> : null}
    </Page>
  );
}
