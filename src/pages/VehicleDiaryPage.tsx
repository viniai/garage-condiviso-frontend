import { useLiveQuery } from "dexie-react-hooks";
import { type FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, mediaUrl } from "../api/client";
import { api } from "../api/endpoints";
import { useSession } from "../auth/session";
import Donut from "../components/Donut";
import { ErrorNote, LoginPrompt, Page, PrivacyBadge } from "../components/ui";
import { formatEuro, sum, totalsByPhase } from "../lib/budget";
import { resizeImage } from "../lib/image";
import { useAsync } from "../lib/useAsync";
import { db, type LocalDraft, type LocalVehicle } from "../local/db";
import { repo } from "../local/repo";

const today = () => new Date().toISOString().slice(0, 10);

function PrivateData({ vehicle }: { vehicle: LocalVehicle }) {
  return (
    <form
      className="card stack"
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void repo.updateVehicle(vehicle.id, {
          plate: String(f.get("plate")).trim().toUpperCase(),
          vin: String(f.get("vin")).trim().toUpperCase(),
          budget: Number(f.get("budget")) || 0,
        });
      }}
    >
      <div className="row between"><strong>Dati privati</strong><PrivacyBadge /></div>
      <div className="row">
        <div style={{ flex: 1 }}><label htmlFor="plate">Targa</label><input id="plate" name="plate" defaultValue={vehicle.plate} /></div>
        <div style={{ flex: 1 }}><label htmlFor="vin">Telaio</label><input id="vin" name="vin" defaultValue={vehicle.vin} /></div>
        <div style={{ width: 120 }}><label htmlFor="budget">Budget €</label><input id="budget" name="budget" type="number" min={0} defaultValue={vehicle.budget || ""} /></div>
      </div>
      <button>Salva</button>
    </form>
  );
}

function Expenses({ vehicle }: { vehicle: LocalVehicle }) {
  const expenses = useLiveQuery(() => repo.listExpenses(vehicle.id), [vehicle.id]) ?? [];
  const [error, setError] = useState<unknown>();

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await repo.addExpense({
        vehicleId: vehicle.id,
        phase: String(f.get("phase")).trim(),
        amount: Number(f.get("amount")),
        note: String(f.get("note")).trim(),
        date: String(f.get("date")),
      });
      setError(undefined);
      form.reset();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <section className="card stack">
      <div className="row between"><strong>Budget e spese: {formatEuro(sum(expenses))}</strong><PrivacyBadge /></div>
      <Donut data={totalsByPhase(expenses)} />
      <form className="row" onSubmit={add}>
        <input name="phase" placeholder="Fase (es. Carrozzeria)" style={{ flex: 2, minWidth: 140 }} />
        <input name="amount" type="number" step="0.01" min="0.01" placeholder="€" required style={{ flex: 1, minWidth: 80 }} aria-label="Importo" />
        <input name="date" type="date" defaultValue={today()} required style={{ flex: 1, minWidth: 140 }} aria-label="Data" />
        <input name="note" placeholder="Nota" style={{ flex: 2, minWidth: 140 }} />
        <button>Aggiungi</button>
      </form>
      <ErrorNote error={error} />
      {expenses.map((x) => (
        <div key={x.id} className="row between">
          <span>{x.date} · {x.phase || "Altro"} · {formatEuro(x.amount)} {x.note ? `· ${x.note}` : ""}</span>
          <button className="danger" onClick={() => void repo.removeExpense(x.id)} aria-label="Elimina spesa">✕</button>
        </div>
      ))}
    </section>
  );
}

function Composer({ vehicle, onPublished }: { vehicle: LocalVehicle; onPublished: () => void }) {
  const { token, me } = useSession();
  const drafts = useLiveQuery(() => repo.listDrafts(vehicle.id), [vehicle.id]) ?? [];
  const [draftId, setDraftId] = useState<string>();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [phase, setPhase] = useState("");
  const [date, setDate] = useState(today());
  const [showInFeed, setShowInFeed] = useState(true);
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [error, setError] = useState<unknown>();
  const [status, setStatus] = useState<string>();
  const [busy, setBusy] = useState(false);

  function load(d: LocalDraft) {
    setDraftId(d.id); setTitle(d.title); setBody(d.body); setPhase(d.phase);
    setDate(d.occurredOn); setShowInFeed(d.showInFeed); setPhotos(d.photos);
  }
  function reset() {
    setDraftId(undefined); setTitle(""); setBody(""); setPhase(""); setDate(today()); setShowInFeed(true); setPhotos([]);
  }

  async function saveDraft() {
    const id = draftId ?? crypto.randomUUID();
    await repo.saveDraft({ id, vehicleId: vehicle.id, title, body, phase, occurredOn: date, showInFeed, photos });
    setDraftId(id);
    setStatus("Bozza salvata su questo dispositivo");
  }

  async function publish() {
    if (!token) return;
    setBusy(true); setError(undefined); setStatus(undefined);
    try {
      let remoteId = vehicle.remoteId;
      if (!remoteId) {
        const created = await api.createVehicle(token, { make: vehicle.make, model: vehicle.model, year: vehicle.year, title: vehicle.title });
        remoteId = created.id;
        await repo.updateVehicle(vehicle.id, { remoteId });
      }
      const entry = await api.addEntry(token, remoteId, { title: title.trim(), body, phase, occurred_on: date, show_in_feed: showInFeed });
      for (const photo of photos) await api.uploadPhoto(token, entry.id, await resizeImage(photo));
      if (draftId) await repo.removeDraft(draftId);
      reset();
      setStatus("Voce pubblicata");
      onPublished();
    } catch (err) {
      setError(err instanceof ApiError && err.code === "vehicle_limit_reached"
        ? new Error("Hai raggiunto il limite di diari pubblicabili in beta.") : err);
    } finally {
      setBusy(false);
    }
  }

  if (!token) return <LoginPrompt next={`/restauro/${vehicle.id}`} message="Per pubblicare voci nel diario accedi con la tua email." />;
  if (!me?.profile) return <p className="muted">Per pubblicare crea prima il tuo <Link to="/profilo">profilo</Link>.</p>;

  return (
    <section className="card stack">
      <strong>Nuova voce di diario</strong>
      <p className="muted">Tutto ciò che pubblichi qui è visibile agli altri. Importi, targa e telaio non vengono mai inviati.</p>
      <div><label htmlFor="e-title">Titolo</label><input id="e-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><label htmlFor="e-body">Racconto</label><textarea id="e-body" value={body} onChange={(e) => setBody(e.target.value)} /></div>
      <div className="row">
        <div style={{ flex: 1 }}><label htmlFor="e-phase">Fase</label><input id="e-phase" value={phase} onChange={(e) => setPhase(e.target.value)} /></div>
        <div style={{ flex: 1 }}><label htmlFor="e-date">Data</label><input id="e-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      <div>
        <label htmlFor="e-photos">Foto (ridimensionate e senza posizione prima dell'invio)</label>
        <input id="e-photos" type="file" accept="image/*" multiple onChange={(e) => setPhotos([...photos, ...Array.from(e.target.files ?? [])])} />
        {photos.length ? <p className="muted">{photos.length} foto selezionate</p> : null}
      </div>
      <label className="check"><input type="checkbox" checked={showInFeed} onChange={(e) => setShowInFeed(e.target.checked)} /> Mostra nel feed del mio profilo</label>
      <ErrorNote error={error} />
      {status ? <p className="ok">{status}</p> : null}
      <div className="row">
        <button onClick={() => void saveDraft()} disabled={!title.trim()}>Salva bozza</button>
        <button className="primary" onClick={() => void publish()} disabled={busy || !title.trim()}>Pubblica</button>
      </div>
      {drafts.length ? (
        <div><strong>Bozze</strong> <PrivacyBadge />
          {drafts.map((d) => (
            <div key={d.id} className="row between">
              <span>{d.title || "(senza titolo)"}</span>
              <span className="row"><button onClick={() => load(d)}>Apri</button><button className="danger" onClick={() => void repo.removeDraft(d.id)}>Elimina</button></span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Published({ remoteId, refreshKey }: { remoteId: string; refreshKey: number }) {
  const entries = useAsync(() => api.vehicleEntries(remoteId), [remoteId, refreshKey]);
  if (!entries.data?.length) return null;
  return (
    <section>
      <h2>Voci pubblicate</h2>
      {entries.data.map((e) => (
        <div key={e.id} className="card stack">
          <div className="row between"><strong>{e.title}</strong><span className="muted">{e.occurred_on}</span></div>
          {e.body ? <p>{e.body}</p> : null}
          {e.photos.length ? <div className="photos">{e.photos.map((p) => <img key={p.id} src={mediaUrl(p.url)} alt="" loading="lazy" />)}</div> : null}
        </div>
      ))}
    </section>
  );
}

export default function VehicleDiaryPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const vehicle = useLiveQuery(() => db.vehicles.get(id), [id]);
  const { token } = useSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<unknown>();

  if (vehicle === undefined) return <Page><p className="muted">Caricamento…</p></Page>;

  async function remove() {
    if (!vehicle) return;
    try {
      if (vehicle.remoteId && token) await api.deleteVehicle(token, vehicle.remoteId);
      await repo.removeVehicle(vehicle.id);
      navigate("/restauro", { replace: true });
    } catch (err) {
      setError(err);
    }
  }

  return (
    <Page>
      <p><Link to="/restauro">← Restauro</Link></p>
      <h1>{vehicle.title}</h1>
      <p className="muted">{vehicle.make} {vehicle.model} · {vehicle.year}</p>
      <PrivateData vehicle={vehicle} />
      <Expenses vehicle={vehicle} />
      <Composer vehicle={vehicle} onPublished={() => setRefreshKey((k) => k + 1)} />
      {vehicle.remoteId ? <Published remoteId={vehicle.remoteId} refreshKey={refreshKey} /> : null}
      <h2>Elimina diario</h2>
      <ErrorNote error={error} />
      {confirm ? (
        <div className="row">
          <span className="muted">Verranno eliminati anche spese, bozze e il diario pubblico.</span>
          <button className="danger" onClick={() => void remove()}>Conferma eliminazione</button>
          <button onClick={() => setConfirm(false)}>Annulla</button>
        </div>
      ) : <button className="danger" onClick={() => setConfirm(true)}>Elimina diario</button>}
    </Page>
  );
}
