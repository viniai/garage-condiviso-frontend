import type { Map as LeafletMap } from "leaflet";
import { useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import { Link } from "react-router-dom";
import { api } from "../api/endpoints";
import { CATEGORIES, CATEGORY_COLORS, type Part } from "../api/types";
import { useSession } from "../auth/session";
import { ErrorNote, LoginPrompt } from "../components/ui";
import { radiusFromBounds } from "../lib/geo";
import { useAsync } from "../lib/useAsync";

interface Area {
  lat: number;
  lon: number;
  radius_km: number;
}

function ContactBox({ part }: { part: Part }) {
  const { token, me } = useSession();
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<unknown>();

  if (!token) return <LoginPrompt next="/" message="Per contattare il venditore accedi con la tua email." />;
  if (!me?.profile) return <p className="muted">Per contattare un venditore crea prima il tuo <Link to="/profilo">profilo</Link>.</p>;
  if (me.profile.id === part.seller.id) return <p className="muted">Questo pezzo è tuo.</p>;
  if (state === "sent") return <p className="ok">Messaggio inviato. Dopo il contatto potrai recensire @{part.seller.handle}.</p>;

  async function send() {
    setState("busy");
    setError(undefined);
    try {
      await api.contactSeller(token as string, part.id, message);
      setState("sent");
    } catch (err) {
      setError(err);
      setState("idle");
    }
  }

  return (
    <div className="stack">
      <label htmlFor="msg">Messaggio al venditore</label>
      <textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ciao, è ancora disponibile?" />
      <p className="muted">Il venditore riceverà il messaggio via email e potrà risponderti all'indirizzo con cui sei registrato.</p>
      {part.seller.status === "unclaimed" ? (
        <p className="muted">Profilo non ancora riscattato: il tuo messaggio sarà inoltrato manualmente dal team.</p>
      ) : null}
      <ErrorNote error={error} />
      <button className="primary" onClick={send} disabled={state === "busy" || message.trim().length < 5}>Contatta</button>
    </div>
  );
}

export default function MapPage() {
  const mapRef = useRef<LeafletMap | null>(null);
  const [category, setCategory] = useState<string>("");
  const [q, setQ] = useState("");
  const [area, setArea] = useState<Area | null>(null);
  const [selectedId, setSelectedId] = useState<string>();

  const parts = useAsync(
    () => api.searchParts({ category, q: q.trim() || undefined, ...(area ?? {}) }),
    [category, q, area],
  );
  const list = useMemo(() => parts.data ?? [], [parts.data]);
  const selected = list.find((p) => p.id === selectedId);

  function searchHere() {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    const c = map.getCenter();
    setArea({ lat: c.lat, lon: c.lng, radius_km: radiusFromBounds(b.getNorth(), b.getSouth(), c.lat, b.getEast(), b.getWest()) });
  }

  return (
    <main className="content flush">
      <div className="map-wrap">
        <div className="map-top">
          <input type="search" placeholder="Cerca pezzo o modello" aria-label="Cerca pezzo o modello" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="chips" role="group" aria-label="Categoria">
            <button className={`chip ${category === "" ? "on" : ""}`} onClick={() => setCategory("")}>Tutti</button>
            {CATEGORIES.map((c) => (
              <button key={c.value} className={`chip ${category === c.value ? "on" : ""}`} onClick={() => setCategory(c.value)}>{c.label}</button>
            ))}
          </div>
        </div>
        <MapContainer ref={mapRef} center={[42.5, 12.5]} zoom={6} scrollWheelZoom>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {list.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lon]}
              radius={p.id === selectedId ? 13 : 9}
              pathOptions={{ color: "#fff", weight: 2, fillColor: CATEGORY_COLORS[p.category] ?? "#444", fillOpacity: 0.95 }}
              eventHandlers={{ click: () => setSelectedId(p.id) }}
            />
          ))}
        </MapContainer>
        <button className="map-area" onClick={searchHere}>Cerca in quest'area</button>
      </div>

      <section className="sheet" aria-label="Pezzi">
        <ErrorNote error={parts.error} />
        {selected ? (
          <div className="card stack">
            <div className="row between">
              <strong>{selected.title}</strong>
              <button onClick={() => setSelectedId(undefined)} aria-label="Chiudi dettaglio">✕</button>
            </div>
            <div className="muted">{selected.make} {selected.model} · {CATEGORIES.find((c) => c.value === selected.category)?.label}
              {selected.distance_km != null ? ` · ${selected.distance_km} km` : ""}</div>
            {selected.description ? <p>{selected.description}</p> : null}
            <p>Di <Link to={`/p/${selected.seller.handle}`}>{selected.seller.display_name}</Link>
              {selected.seller.status === "unclaimed" ? " · profilo non riscattato" : ""}</p>
            <ContactBox part={selected} />
          </div>
        ) : null}
        {parts.loading && list.length === 0 ? <p className="muted">Caricamento…</p> : null}
        {!parts.loading && list.length === 0 && !parts.error ? <p className="muted">Nessun pezzo in quest'area. Prova ad allargare la ricerca.</p> : null}
        {list.map((p) => (
          <button key={p.id} className="card part-item" onClick={() => setSelectedId(p.id)}>
            <strong>{p.title}</strong>
            <div className="muted">{p.make} {p.model} · {p.seller.display_name}{p.distance_km != null ? ` · ${p.distance_km} km` : ""}</div>
          </button>
        ))}
      </section>
    </main>
  );
}
