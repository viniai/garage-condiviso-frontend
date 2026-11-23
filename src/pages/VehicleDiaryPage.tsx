import { useLiveQuery } from "dexie-react-hooks";
import { type FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, mediaUrl } from "../api/client";
import type { DiaryEntry } from "../api/types";
import { api } from "../api/endpoints";
import { useSession } from "../auth/session";
import Donut from "../components/Donut";
import ReportMenu from "../components/ReportMenu";
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

function EntryEditor({ entry, onDone }: { entry: DiaryEntry; onDone: () => void }) {
  const { token } = useSession();
  const [title, setTitle] = useState(entry.title);
  const [body, setBody] = useState(entry.body);
  const [phase, setPhase] = useState(entry.phase);
  const [date, setDate] = useState(entry.occurred_on);
  const [showInFeed, setShowInFeed] = useState(entry.show_in_feed);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>, close = false) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      if (close) onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack" aria-label={`Modifica ${entry.title}`}>
      <strong>Modifica voce</strong>
      <div><label htmlFor={`t-${entry.id}`}>Titolo</label><input id={`t-${entry.id}`} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><label htmlFor={`b-${entry.id}`}>Racconto</label><textarea id={`b-${entry.id}`} value={body} onChange={(e) => setBody(e.target.value)} /></div>
      <div className="row">
        <div style={{ flex: 1 }}><label htmlFor={`p-${entry.id}`}>Fase</label><input id={`p-${entry.id}`} value={phase} onChange={(e) => setPhase(e.target.value)} /></div>
        <div style={{ flex: 1 }}><label htmlFor={`d-${entry.id}`}>Data</label><input id={`d-${entry.id}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      <label className="check"><input type="checkbox" checked={showInFeed} onChange={(e) => setShowInFeed(e.target.checked)} /> Mostra nel feed del mio profilo</label>
      {entry.photos.length ? (
        <div className="photos">
          {entry.photos.map((p) => (
            <span key={p.id} className="photo-edit">
              <img src={mediaUrl(p.url)} alt="" loading="lazy" />
              <button className="danger" aria-label="Elimina foto" disabled={busy} onClick={() => void run(async () => { await api.deleteEntryPhoto(token as string, p.id); onDone(); })}>✕</button>
            </span>
          ))}
        </div>
      ) : null}
      <div>
        <label htmlFor={`f-${entry.id}`}>Aggiungi foto</label>
        <input id={`f-${entry.id}`} type="file" accept="image/*" multiple disabled={busy} onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          void run(async () => {
            for (const f of files) await api.uploadPhoto(token as string, entry.id, await resizeImage(f));
            onDone();
          });
        }} />
      </div>
      <ErrorNote error={error} />
      <div className="row">
        <button className="primary" disabled={busy || !title.trim()} onClick={() => void run(() => api.updateEntry(token as string, entry.id, { title: title.trim(), body, phase, occurred_on: date, show_in_feed: showInFeed }), true)}>Salva modifiche</button>
        <button onClick={onDone}>Chiudi</button>
      </div>
    </div>
  );
}

function Published({ remoteId, refreshKey, onChanged }: { remoteId: string; refreshKey: number; onChanged: () => void }) {
  const { token } = useSession();
  const entries = useAsync(() => (token ? api.allEntries(token, remoteId) : Promise.resolve([] as DiaryEntry[])), [remoteId, token, refreshKey]);
  const [editing, setEditing] = useState<string>();
  const [deleting, setDeleting] = useState<string>();
  const [error, setError] = useState<unknown>();

  async function remove(id: string) {
    try {
      await api.deleteEntry(token as string, id);
      setDeleting(undefined);
      onChanged();
    } catch (err) {
      setError(err);
    }
  }

  if (!entries.data?.length) return null;
  return (
    <section>
      <h2>Voci pubblicate</h2>
      <ErrorNote error={error ?? entries.error} />
      {entries.data.map((e) =>
        editing === e.id ? (
          <EntryEditor key={e.id} entry={e} onDone={() => { setEditing(undefined); onChanged(); }} />
        ) : (
          <div key={e.id} className="card stack">
            <div className="row between">
              <strong>{e.title}</strong>
              <span className="row">
                {e.show_in_feed ? null : <span className="tag">Non nel feed</span>}
                <span className="muted">{e.occurred_on}</span>
                <ReportMenu
                  targetType="entry"
                  targetId={e.id}
                  ownerActions={[
                    { label: "Modifica", onClick: () => setEditing(e.id) },
                    { label: "Elimina", danger: true, onClick: () => setDeleting(e.id) },
                  ]}
                />
              </span>
            </div>
            {e.body ? <p>{e.body}</p> : null}
            {e.photos.length ? <div className="photos">{e.photos.map((p) => <img key={p.id} src={mediaUrl(p.url)} alt="" loading="lazy" />)}</div> : null}
            {deleting === e.id ? (
              <div className="row">
                <span className="muted">Eliminare questa voce e le sue foto?</span>
                <button className="danger" onClick={() => void remove(e.id)}>Conferma eliminazione</button>
                <button onClick={() => setDeleting(undefined)}>Annulla</button>
              </div>
            ) : null}
          </div>
        ),
      )}
    </section>
  );
}

/** Modifica dei dati del diario (anche della copia pubblicata) e scelta di mostrarlo sulla mappa. */
function EditVehicle({ vehicle, onDone }: { vehicle: LocalVehicle; onDone: () => void }) {
  const { token } = useSession();
  const [error, setError] = useState<unknown>();

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const changes = {
      title: String(f.get("title")).trim(),
      make: String(f.get("make")).trim(),
      model: String(f.get("model")).trim(),
      year: Number(f.get("year")),
    };
    try {
      if (vehicle.remoteId && token) await api.updateVehicle(token, vehicle.remoteId, changes);
      await repo.updateVehicle(vehicle.id, changes);
      onDone();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <form className="card stack" onSubmit={save} aria-label="Modifica diario">
      <strong>Modifica diario</strong>
      <div><label htmlFor="v-title">Nome del diario</label><input id="v-title" name="title" required minLength={3} defaultValue={vehicle.title} /></div>
      <div className="row">
        <div style={{ flex: 1 }}><label htmlFor="v-make">Marca</label><input id="v-make" name="make" required defaultValue={vehicle.make} /></div>
        <div style={{ flex: 1 }}><label htmlFor="v-model">Modello</label><input id="v-model" name="model" required defaultValue={vehicle.model} /></div>
        <div style={{ width: 100 }}><label htmlFor="v-year">Anno</label><input id="v-year" name="year" type="number" min={1885} max={2100} required defaultValue={vehicle.year} /></div>
      </div>
      <ErrorNote error={error} />
      <div className="row"><button className="primary">Salva</button><button type="button" onClick={onDone}>Annulla</button></div>
    </form>
  );
}

function MapSettings({ remoteId }: { remoteId: string }) {
  const { token } = useSession();
  const mine = useAsync(() => (token ? api.myVehicles(token) : Promise.resolve([])), [token, remoteId]);
  const [error, setError] = useState<unknown>();
  const remote = mine.data?.find((v) => v.id === remoteId);
  if (!remote) return null;

  async function change(body: { is_public?: boolean; show_on_map?: boolean }) {
    try {
      await api.updateVehicle(token as string, remoteId, body);
      setError(undefined);
      mine.reload();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <section className="card stack">
      <strong>Visibilità</strong>
      <label className="check"><input type="checkbox" checked={remote.is_public} onChange={(e) => void change({ is_public: e.target.checked })} /> Diario pubblico</label>
      <label className="check"><input type="checkbox" checked={remote.show_on_map} disabled={!remote.is_public} onChange={(e) => void change({ show_on_map: e.target.checked })} /> Mostra sulla mappa dei diari</label>
      <p className="muted approx">Sulla mappa appare solo una zona approssimativa: il centro del tuo comune spostato di 1–3 km. Mai l'indirizzo né il garage. {remote.is_public ? "" : "Per mostrarlo sulla mappa il diario deve essere pubblico."}</p>
      <ErrorNote error={error} />
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
  const [editing, setEditing] = useState(false);
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
      <div className="row between">
        <h1>{vehicle.title}</h1>
        <ReportMenu
          targetType="entry"
          targetId={vehicle.remoteId ?? vehicle.id}
          ownerActions={[
            { label: "Modifica diario", onClick: () => setEditing(true) },
            { label: "Elimina diario", danger: true, onClick: () => setConfirm(true) },
          ]}
        />
      </div>
      <p className="muted">{vehicle.make} {vehicle.model} · {vehicle.year}</p>
      {editing ? <EditVehicle vehicle={vehicle} onDone={() => setEditing(false)} /> : null}
      <PrivateData vehicle={vehicle} />
      <Expenses vehicle={vehicle} />
      <Composer vehicle={vehicle} onPublished={() => setRefreshKey((k) => k + 1)} />
      {vehicle.remoteId ? <MapSettings remoteId={vehicle.remoteId} /> : <p className="muted approx">Dopo la prima voce pubblicata potrai scegliere se mostrare il diario sulla mappa.</p>}
      {vehicle.remoteId ? <Published remoteId={vehicle.remoteId} refreshKey={refreshKey} onChanged={() => setRefreshKey((k) => k + 1)} /> : null}
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
