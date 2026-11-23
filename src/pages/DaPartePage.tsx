import { type FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/endpoints";
import { CATEGORIES, type Category, type Part, type PartCreate } from "../api/types";
import { useSession } from "../auth/session";
import ReportMenu from "../components/ReportMenu";
import { ErrorNote, LoginPrompt, Page } from "../components/ui";
import { MAX_PART_PHOTOS, PartPhotoManager } from "../components/PartPhotos";
import { resizeImage } from "../lib/image";
import { formatPrice, parsePrice, priceToInput } from "../lib/money";
import { useAsync } from "../lib/useAsync";

interface PartFormProps {
  part?: Part;
  onSubmit: (data: { values: Omit<PartCreate, "lat" | "lon">; files: File[] }) => Promise<void>;
  onCancel?: () => void;
}

/** Modulo condiviso da "Aggiungi pezzo" e "Modifica". In modifica le foto si gestiscono a parte. */
function PartForm({ part, onSubmit, onCancel }: PartFormProps) {
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const price = parsePrice(String(f.get("price")));
    if (price === undefined) return setError(new Error("Prezzo non valido: scrivi un importo in euro, per esempio 120 o 85,50"));
    const files = Array.from((form.elements.namedItem("photos") as HTMLInputElement | null)?.files ?? []).slice(0, MAX_PART_PHOTOS);
    setBusy(true);
    try {
      await onSubmit({
        files,
        values: {
          price_cents: price,
          title: String(f.get("title")).trim(),
          category: String(f.get("category")) as Category,
          make: String(f.get("make")).trim(),
          model: String(f.get("model")).trim(),
          description: String(f.get("description")).trim(),
          is_visible: f.get("visible") === "on",
        },
      });
      setError(undefined);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <div><label htmlFor="p-title">Pezzo</label><input id="p-title" name="title" required minLength={3} placeholder="Paraurti anteriore Fulvia" defaultValue={part?.title} /></div>
      <div className="row">
        <div style={{ flex: 1 }}><label htmlFor="p-make">Marca</label><input id="p-make" name="make" required defaultValue={part?.make} /></div>
        <div style={{ flex: 1 }}><label htmlFor="p-model">Modello</label><input id="p-model" name="model" defaultValue={part?.model} /></div>
        <div style={{ flex: 1 }}><label htmlFor="p-cat">Categoria</label>
          <select id="p-cat" name="category" defaultValue={part?.category}>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
      </div>
      <div className="row">
        <div style={{ flex: 1 }}><label htmlFor="p-price">Prezzo (€)</label><input id="p-price" name="price" inputMode="decimal" placeholder="Su richiesta" defaultValue={priceToInput(part?.price_cents)} /></div>
        {part ? null : <div style={{ flex: 2 }}><label htmlFor="p-photos">Foto (max {MAX_PART_PHOTOS})</label><input id="p-photos" name="photos" type="file" accept="image/*" multiple /></div>}
      </div>
      <div><label htmlFor="p-desc">Descrizione</label><textarea id="p-desc" name="description" defaultValue={part?.description} /></div>
      <label className="check"><input type="checkbox" name="visible" defaultChecked={part ? part.is_visible : true} /> Visibile sulla mappa</label>
      <ErrorNote error={error} />
      <div className="row">
        <button className="primary" disabled={busy}>{part ? "Salva modifiche" : "Salva"}</button>
        {onCancel ? <button type="button" onClick={onCancel}>Annulla</button> : null}
      </div>
    </form>
  );
}

export default function DaPartePage() {
  const { token, me, loading } = useSession();
  const parts = useAsync(() => (token && me?.profile ? api.myParts(token) : Promise.resolve([])), [token, me?.profile?.id]);
  const [error, setError] = useState<unknown>();
  const [open, setOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const [editingId, setEditingId] = useState<string | undefined>(params.get("modifica") ?? undefined);
  const [deletingId, setDeletingId] = useState<string>();

  if (loading) return <Page><p className="muted">Caricamento…</p></Page>;
  if (!token) return <Page><h1>Da parte</h1><LoginPrompt next="/da-parte" message="Accedi per mostrare sulla mappa i pezzi che tieni da parte." /></Page>;
  if (!me?.profile) return <Page><h1>Da parte</h1><p>Crea prima il tuo <Link to="/profilo">profilo</Link>.</p></Page>;

  function stopEditing() {
    setEditingId(undefined);
    if (params.has("modifica")) setParams({}, { replace: true });
  }

  async function create({ values, files }: { values: Omit<PartCreate, "lat" | "lon">; files: File[] }) {
    const created = await api.createPart(token as string, values);
    for (const file of files) await api.uploadPartPhoto(token as string, created.id, await resizeImage(file));
    setOpen(false);
    parts.reload();
  }

  async function save(id: string, { values }: { values: Omit<PartCreate, "lat" | "lon"> }) {
    await api.updatePart(token as string, id, values);
    stopEditing();
    parts.reload();
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
      setDeletingId(undefined);
      parts.reload();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <Page>
      <div className="row between"><h1>Da parte</h1><button className="primary" onClick={() => setOpen((v) => !v)}>Aggiungi pezzo</button></div>
      <p className="muted">La posizione mostrata è quella del tuo comune, mai l'indirizzo.</p>
      {open ? <PartForm onSubmit={create} onCancel={() => setOpen(false)} /> : null}
      <ErrorNote error={error ?? parts.error} />
      {(parts.data ?? []).map((p) =>
        editingId === p.id ? (
          <section key={p.id} className="stack" aria-label={`Modifica ${p.title}`}>
            <PartForm part={p} onSubmit={(d) => save(p.id, d)} onCancel={stopEditing} />
            <PartPhotoManager part={p} token={token as string} onChange={parts.reload} />
          </section>
        ) : (
          <div key={p.id} className="card stack">
            <div className="row between"><strong>{p.title}</strong>
              <ReportMenu
                targetType="part"
                targetId={p.id}
                ownerActions={[
                  { label: "Modifica", onClick: () => setEditingId(p.id) },
                  { label: "Elimina", danger: true, onClick: () => setDeletingId(p.id) },
                ]}
              /></div>
            <div className="muted">{p.make} {p.model} · <strong>{formatPrice(p.price_cents)}</strong></div>
            <PartPhotoManager part={p} token={token as string} onChange={parts.reload} />
            <label className="check"><input type="checkbox" checked={p.is_visible} onChange={(e) => void toggle(p.id, e.target.checked)} /> Visibile sulla mappa</label>
            {deletingId === p.id ? (
              <div className="row">
                <span className="muted">Eliminare “{p.title}” e le sue foto?</span>
                <button className="danger" onClick={() => void remove(p.id)}>Conferma eliminazione</button>
                <button onClick={() => setDeletingId(undefined)}>Annulla</button>
              </div>
            ) : null}
          </div>
        ),
      )}
      {parts.data?.length === 0 ? <p className="muted">Nessun pezzo ancora.</p> : null}
    </Page>
  );
}
