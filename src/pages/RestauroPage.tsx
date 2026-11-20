import { useLiveQuery } from "dexie-react-hooks";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/endpoints";
import { ErrorNote, Page, PrivacyBadge } from "../components/ui";
import { budgetUsedPct, formatEuro, sum } from "../lib/budget";
import { useAsync } from "../lib/useAsync";
import { db } from "../local/db";
import { repo } from "../local/repo";

const FALLBACK_LIMIT = 2;

export default function RestauroPage() {
  const vehicles = useLiveQuery(() => repo.listVehicles(), []);
  const expenses = useLiveQuery(() => db.expenses.toArray(), []);
  const config = useAsync(() => api.config().catch(() => null), []);
  const limit = config.data?.max_vehicles_per_user ?? FALLBACK_LIMIT;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<unknown>();

  const count = vehicles?.length ?? 0;
  const blocked = count >= limit;

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(undefined);
    try {
      await repo.addVehicle(
        {
          title: String(form.get("title")).trim(),
          make: String(form.get("make")).trim(),
          model: String(form.get("model")).trim(),
          year: Number(form.get("year")),
        },
        limit,
      );
      setOpen(false);
    } catch (err) {
      setError(err);
    }
  }

  return (
    <Page>
      <h1>Restauro</h1>
      <p className="muted">Spese, targa e telaio restano nel tuo browser. Pubblichi solo le voci di diario che scegli tu.</p>

      <div className="row between">
        <h2>I tuoi veicoli ({count}/{limit})</h2>
        <button className="primary" disabled={blocked} onClick={() => setOpen((v) => !v)}>Nuovo diario veicolo</button>
      </div>
      {blocked ? <p className="muted">In beta puoi tenere {limit} diari veicolo. Più diari saranno una funzione futura.</p> : null}

      {open && !blocked ? (
        <form className="card stack" onSubmit={create}>
          <div><label htmlFor="title">Nome del diario</label><input id="title" name="title" required minLength={3} placeholder="La mia 500 L" /></div>
          <div className="row">
            <div style={{ flex: 1 }}><label htmlFor="make">Marca</label><input id="make" name="make" required placeholder="Fiat" /></div>
            <div style={{ flex: 1 }}><label htmlFor="model">Modello</label><input id="model" name="model" required placeholder="500 L" /></div>
            <div style={{ width: 100 }}><label htmlFor="year">Anno</label><input id="year" name="year" type="number" min={1885} max={2100} required /></div>
          </div>
          <ErrorNote error={error} />
          <button className="primary">Crea</button>
        </form>
      ) : null}

      {(vehicles ?? []).map((v) => {
        const spent = sum((expenses ?? []).filter((e) => e.vehicleId === v.id));
        return (
          <Link key={v.id} to={`/restauro/${v.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card stack">
              <div className="row between"><strong>{v.title}</strong>{v.remoteId ? <span className="badge">Pubblicato</span> : <PrivacyBadge />}</div>
              <div className="muted">{v.make} {v.model} · {v.year}</div>
              <div className="bar" aria-hidden><i style={{ width: `${budgetUsedPct(spent, v.budget)}%` }} /></div>
              <div className="muted">Speso {formatEuro(spent)}{v.budget > 0 ? ` su ${formatEuro(v.budget)}` : ""}</div>
            </div>
          </Link>
        );
      })}
      {vehicles && vehicles.length === 0 ? <p className="muted">Nessun veicolo ancora: crea il tuo primo diario.</p> : null}
    </Page>
  );
}
