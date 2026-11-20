import { type FormEvent, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/endpoints";
import { useSession } from "../auth/session";
import { ErrorNote, LoginPrompt, Page, PrivacyBadge } from "../components/ui";
import { currentPosition } from "../lib/geo";
import { db } from "../local/db";
import { exportBackup, InvalidBackupError, parseBackup, restoreBackup } from "../local/backup";

function CreateProfile() {
  const { token, refresh } = useSession();
  const [pos, setPos] = useState<{ lat: number; lon: number }>();
  const [error, setError] = useState<unknown>();

  async function locate() {
    try {
      setPos(await currentPosition());
      setError(undefined);
    } catch (err) {
      setError(err);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pos) return setError(new Error("Imposta la posizione (viene arrotondata al tuo comune)"));
    const f = new FormData(e.currentTarget);
    try {
      await api.createProfile(token as string, {
        handle: String(f.get("handle")).trim(),
        display_name: String(f.get("name")).trim(),
        municipality: String(f.get("municipality")).trim(),
        bio: String(f.get("bio")).trim(),
        ...pos,
      });
      await refresh();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <strong>Crea il tuo profilo</strong>
      <div><label htmlFor="handle">Nome utente</label><input id="handle" name="handle" required pattern="[a-z0-9_]{3,30}" title="3-30 caratteri: minuscole, numeri, _" /></div>
      <div><label htmlFor="name">Nome visibile</label><input id="name" name="name" required /></div>
      <div><label htmlFor="municipality">Comune</label><input id="municipality" name="municipality" required /></div>
      <div><label htmlFor="bio">Bio</label><textarea id="bio" name="bio" maxLength={500} /></div>
      <div className="row">
        <button type="button" onClick={() => void locate()}>Usa la mia posizione</button>
        {pos ? <span className="ok">Posizione impostata (≈ 1 km)</span> : <span className="muted">Non verrà mai mostrato l'indirizzo esatto</span>}
      </div>
      <ErrorNote error={error} />
      <button className="primary">Crea profilo</button>
    </form>
  );
}

function BackupPanel() {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<unknown>();

  async function download() {
    const data = JSON.stringify(await exportBackup(db), null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `garage-condiviso-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Backup scaricato");
  }

  async function restore(file: File) {
    setError(undefined);
    try {
      const backup = parseBackup(await file.text());
      await restoreBackup(db, backup);
      setStatus(`Ripristinati ${backup.vehicles.length} veicoli e ${backup.expenses.length} spese`);
    } catch (err) {
      setError(err instanceof InvalidBackupError ? err : new Error("Ripristino non riuscito"));
    }
  }

  return (
    <section className="card stack">
      <div className="row between"><strong>Backup dei dati privati</strong><PrivacyBadge /></div>
      <p className="muted">I tuoi veicoli, le spese e le bozze esistono solo in questo browser. Se cancelli i dati del sito o cambi dispositivo li perdi: esporta un backup.</p>
      <div className="row">
        <button onClick={() => void download()}>Scarica backup</button>
        <button onClick={() => input.current?.click()}>Ripristina da file</button>
        <input ref={input} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void restore(f); e.target.value = ""; }} />
      </div>
      <ErrorNote error={error} />
      {status ? <p className="ok">{status}</p> : null}
    </section>
  );
}

export default function ProfilePage() {
  const { token, me, loading, logout } = useSession();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<unknown>();

  if (loading) return <Page><p className="muted">Caricamento…</p></Page>;

  async function deleteAccount() {
    try {
      await api.deleteAccount(token as string);
      logout();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <Page>
      <h1>Profilo</h1>
      {!token || !me ? <LoginPrompt next="/profilo" message="Accedi per creare il tuo profilo, pubblicare pezzi e diari." /> : null}
      {me && !me.profile ? (
        <>
          <p className="muted">Accesso come {me.email}.</p>
          <CreateProfile />
        </>
      ) : null}
      {me?.profile ? (
        <section className="card stack">
          <div className="row between"><strong>{me.profile.display_name}</strong><span className="muted">@{me.profile.handle}</span></div>
          <div className="muted">{me.profile.municipality}</div>
          {me.profile.bio ? <p>{me.profile.bio}</p> : null}
          <div className="row"><Link className="btn" to={`/p/${me.profile.handle}`}>Vedi profilo pubblico</Link>
            {me.is_admin ? <Link className="btn" to="/admin">Strumenti admin</Link> : null}</div>
        </section>
      ) : null}
      <BackupPanel />
      {me ? (
        <section className="card stack">
          <strong>Account</strong>
          <ErrorNote error={error} />
          <div className="row">
            <button onClick={logout}>Esci</button>
            {confirm ? (
              <>
                <button className="danger" onClick={() => void deleteAccount()}>Conferma: elimina tutto</button>
                <button onClick={() => setConfirm(false)}>Annulla</button>
              </>
            ) : <button className="danger" onClick={() => setConfirm(true)}>Elimina account</button>}
          </div>
          {confirm ? <p className="muted">Profilo, pezzi, diari pubblicati e recensioni saranno eliminati dal server. I dati locali restano in questo browser.</p> : null}
        </section>
      ) : null}
    </Page>
  );
}
