import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/endpoints";
import { CATEGORIES, type Category } from "../api/types";
import { useSession } from "../auth/session";
import { ErrorNote, LoginPrompt, Page } from "../components/ui";
import { useAsync } from "../lib/useAsync";

export default function DaPartePage() {
  const { token, me, loading } = useSession();
  const parts = useAsync(() => (token && me?.profile ? api.myParts(token) : Promise.resolve([])), [token, me?.profile?.id]);
  const [error, setError] = useState<unknown>();
  const [open, setOpen] = useState(false);

  if (loading) return <Page><p className="muted">Caricamento…</p></Page>;
  if (!token) return <Page><h1>Da parte</h1><LoginPrompt next="/da-parte" message="Accedi per mostrare sulla mappa i pezzi che tieni da parte." /></Page>;
  if (!me?.profile) return <Page><h1>Da parte</h1><p>Crea prima il tuo <Link to="/profilo">profilo</Link>.</p></Page>;

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api.createPart(token as string, {
        title: String(f.get("title")).trim(),
        category: String(f.get("category")) as Category,
        make: String(f.get("make")).trim(),
        model: String(f.get("model")).trim(),
        description: String(f.get("description")).trim(),
        is_visible: f.get("visible") === "on",
      });
      setOpen(false);
      setError(undefined);
      parts.reload();
    } catch (err) {
      setError(err);
    }
  }

  async function toggle(id: string, visible: boolean) {
    try {
      await api.updatePart(token as string, id, { is_visible: visible });
      parts.reload();
    } catch (err) {
      setError(err);
    }
  }

  async function remove(id: string) {
    try {
      await api.deletePart(token as string, id);
      parts.reload();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <Page>
      <div className="row between"><h1>Da parte</h1><button className="primary" onClick={() => setOpen((v) => !v)}>Aggiungi pezzo</button></div>
      <p className="muted">La posizione mostrata è quella del tuo comune, mai l'indirizzo.</p>
      {open ? (
        <form className="card stack" onSubmit={create}>
          <div><label htmlFor="p-title">Pezzo</label><input id="p-title" name="title" required minLength={3} placeholder="Paraurti anteriore Fulvia" /></div>
          <div className="row">
            <div style={{ flex: 1 }}><label htmlFor="p-make">Marca</label><input id="p-make" name="make" required /></div>
            <div style={{ flex: 1 }}><label htmlFor="p-model">Modello</label><input id="p-model" name="model" /></div>
            <div style={{ flex: 1 }}><label htmlFor="p-cat">Categoria</label>
              <select id="p-cat" name="category">{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          </div>
          <div><label htmlFor="p-desc">Descrizione</label><textarea id="p-desc" name="description" /></div>
          <label className="check"><input type="checkbox" name="visible" defaultChecked /> Visibile sulla mappa</label>
          <button className="primary">Salva</button>
        </form>
      ) : null}
      <ErrorNote error={error ?? parts.error} />
      {(parts.data ?? []).map((p) => (
        <div key={p.id} className="card stack">
          <div className="row between"><strong>{p.title}</strong>
            <button className="danger" onClick={() => void remove(p.id)} aria-label={`Elimina ${p.title}`}>✕</button></div>
          <div className="muted">{p.make} {p.model}</div>
          <label className="check"><input type="checkbox" checked={p.is_visible} onChange={(e) => void toggle(p.id, e.target.checked)} /> Visibile sulla mappa</label>
        </div>
      ))}
      {parts.data?.length === 0 ? <p className="muted">Nessun pezzo ancora.</p> : null}
    </Page>
  );
}
