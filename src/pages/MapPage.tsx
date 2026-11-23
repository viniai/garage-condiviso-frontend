import L, { type Map as LeafletMap } from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/endpoints";
import { CATEGORIES, CATEGORY_COLORS, type MapDiary, type Part } from "../api/types";
import { useSession } from "../auth/session";
import { PartPhotoStrip, PartThumb } from "../components/PartPhotos";
import { mediaUrl } from "../api/client";
import { formatPrice } from "../lib/money";
import ReportMenu from "../components/ReportMenu";
import { ErrorNote, LoginPrompt } from "../components/ui";
import { currentPosition, radiusFromBounds } from "../lib/geo";
import { useAsync } from "../lib/useAsync";

const RADII = [10, 25, 50, 100, 200];
const TOP_PAD = 160; // altezza della barra di ricerca sopra la mappa

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

type View = "pezzi" | "diari";

function DiaryCard({ diary, onClose }: { diary: MapDiary; onClose: () => void }) {
  const { me } = useSession();
  const isOwn = me?.profile?.id === diary.owner.id;
  return (
    <div className="card stack">
      <div className="row between">
        <strong>{diary.title}</strong>
        <span className="row">
          {isOwn ? null : <ReportMenu targetType="profile" targetId={diary.owner.id} label="questo profilo" />}
          <button onClick={onClose} aria-label="Chiudi dettaglio">✕</button>
        </span>
      </div>
      <div className="muted">{diary.make} {diary.model} · {diary.year}
        {diary.distance_km != null ? <span className="mono"> · {diary.distance_km} km</span> : ""}</div>
      {diary.cover ? <img className="diary-cover" src={mediaUrl(diary.cover.url)} alt="" loading="lazy" /> : null}
      {diary.last_entry_title ? (
        <p>Ultimo aggiornamento: <strong>{diary.last_entry_title}</strong>{diary.last_entry_on ? <span className="muted mono"> · {diary.last_entry_on}</span> : null}</p>
      ) : <p className="muted">Ancora nessun aggiornamento pubblico.</p>}
      <p className="muted approx">Posizione approssimativa: la zona del comune, non l'indirizzo né il garage.</p>
      <p>Di <Link to={`/p/${diary.owner.handle}`}>{diary.owner.display_name}</Link>
        {diary.entries_count ? <span className="muted"> · {diary.entries_count} aggiornamenti</span> : null}</p>
      <Link className="btn primary" to={`/p/${diary.owner.handle}?tab=diari`}>Vedi il diario</Link>
    </div>
  );
}

export default function MapPage() {
  const mapRef = useRef<LeafletMap | null>(null);
  const [params, setParams] = useSearchParams();
  const view: View = params.get("vista") === "diari" ? "diari" : "pezzi";
  const { me: session } = useSession();
  const [category, setCategory] = useState<string>("");
  const [q, setQ] = useState("");
  const [area, setArea] = useState<Area | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [me, setMe] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string>();

  const fitArea = useCallback((a: Area) => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = L.latLng(a.lat, a.lon).toBounds(a.radius_km * 2000);
    map.flyToBounds(bounds, { paddingTopLeft: [12, TOP_PAD], paddingBottomRight: [12, 56] });
  }, []);

  const locate = useCallback(
    async (radius_km = 50) => {
      setLocating(true);
      setLocError(undefined);
      try {
        const pos = await currentPosition();
        setMe(pos);
        const a = { ...pos, radius_km };
        setArea(a);
        fitArea(a);
      } catch {
        setLocError("Posizione non disponibile: attiva la localizzazione nel browser oppure sposta la mappa e usa \"Cerca in quest'area\".");
      } finally {
        setLocating(false);
      }
    },
    [fitArea],
  );

  // Se l'utente ha già concesso il permesso, parte da solo dalla sua zona.
  useEffect(() => {
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((r) => r.state === "granted" && void locate())
      .catch(() => undefined);
  }, [locate]);

  function pickMarker(p: Part) {
    setSelectedId(p.id);
    const map = mapRef.current;
    if (!map) return;
    const pt = map.latLngToContainerPoint([p.lat, p.lon]);
    if (pt.y < TOP_PAD + 20) map.panBy([0, pt.y - (TOP_PAD + 60)]); // non lasciare il pin sotto la barra
  }

  const parts = useAsync(
    () => (view === "pezzi" ? api.searchParts({ category, q: q.trim() || undefined, ...(area ?? {}) }) : Promise.resolve([] as Part[])),
    [view, category, q, area],
  );
  const diaries = useAsync(
    () => (view === "diari" ? api.mapDiaries({ q: q.trim() || undefined, ...(area ?? {}) }) : Promise.resolve([] as MapDiary[])),
    [view, q, area],
  );
  const list = useMemo(() => parts.data ?? [], [parts.data]);
  const diaryList = useMemo(() => diaries.data ?? [], [diaries.data]);
  const selected = list.find((p) => p.id === selectedId);
  const selectedDiary = diaryList.find((d) => d.id === selectedId);

  /** Sui propri annunci il menu ⋯ ha Modifica (apre "Da parte" sul pezzo) al posto di Segnala. */
  function ownActions(p: Part) {
    return session?.profile?.id === p.seller.id ? [{ label: "Modifica", to: `/da-parte?modifica=${p.id}` }] : undefined;
  }

  function setView(next: View) {
    setSelectedId(undefined);
    setParams(next === "diari" ? { vista: "diari" } : {}, { replace: true });
  }

  function pickDiary(d: MapDiary) {
    setSelectedId(d.id);
    const map = mapRef.current;
    if (!map) return;
    const pt = map.latLngToContainerPoint([d.lat, d.lon]);
    if (pt.y < TOP_PAD + 20) map.panBy([0, pt.y - (TOP_PAD + 60)]);
  }

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
          <div className="view-switch" role="group" aria-label="Cosa mostrare sulla mappa">
            <button aria-pressed={view === "pezzi"} onClick={() => setView("pezzi")}>Pezzi</button>
            <button aria-pressed={view === "diari"} onClick={() => setView("diari")}>Diari</button>
          </div>
          <input type="search" placeholder={view === "pezzi" ? "Cerca pezzo o modello" : "Cerca diario, marca o modello"} aria-label={view === "pezzi" ? "Cerca pezzo o modello" : "Cerca diario, marca o modello"} value={q} onChange={(e) => setQ(e.target.value)} />
          {view === "pezzi" ? (
            <div className="chips" role="group" aria-label="Categoria">
              <button className={`chip ${category === "" ? "on" : ""}`} onClick={() => setCategory("")}>Tutti</button>
              {CATEGORIES.map((c) => (
                <button key={c.value} className={`chip ${category === c.value ? "on" : ""}`} onClick={() => setCategory(c.value)}>{c.label}</button>
              ))}
            </div>
          ) : null}
        </div>
        <MapContainer ref={mapRef} center={[42.5, 12.5]} zoom={6} scrollWheelZoom zoomControl={false}>
          <ZoomControl position="bottomright" />
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {area ? <Circle center={[area.lat, area.lon]} radius={area.radius_km * 1000} pathOptions={{ color: "#e5a93c", weight: 2, fillOpacity: 0.06 }} /> : null}
          {me ? <CircleMarker center={[me.lat, me.lon]} radius={7} pathOptions={{ color: "#fff", weight: 3, fillColor: "#1a73e8", fillOpacity: 1 }} /> : null}
          {list.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lon]}
              radius={p.id === selectedId ? 13 : 9}
              pathOptions={{ color: "#fff", weight: 2, fillColor: CATEGORY_COLORS[p.category] ?? "#444", fillOpacity: 0.95 }}
              eventHandlers={{ click: () => pickMarker(p) }}
            />
          ))}
          {diaryList.map((d) => (
            <CircleMarker
              key={d.id}
              center={[d.lat, d.lon]}
              radius={d.id === selectedId ? 14 : 11}
              pathOptions={{ color: "#141619", weight: 3, fillColor: "#e5a93c", fillOpacity: 1 }}
              eventHandlers={{ click: () => pickDiary(d) }}
            />
          ))}
        </MapContainer>
        <button className="map-locate" onClick={() => void locate(area?.radius_km ?? 50)} disabled={locating} aria-label="Mostra la mia posizione" title="Mostra la mia posizione">{locating ? "…" : "◎"}</button>
        <div className="map-bottom">
          <button className="map-area" onClick={searchHere}>Cerca in quest'area</button>
          {area ? (
            <div className="chips radius" role="group" aria-label="Raggio di ricerca">
              {RADII.map((r) => (
                <button key={r} className={`chip ${area.radius_km === r ? "on" : ""}`} onClick={() => { const a = { ...area, radius_km: r }; setArea(a); fitArea(a); }}>{r} km</button>
              ))}
              <button className="chip" onClick={() => setArea(null)}>Tutta Italia</button>
            </div>
          ) : null}
        </div>
        {locError ? <p className="map-note error" role="alert">{locError}</p> : null}
      </div>

      {view === "diari" ? (
        <section className="sheet" aria-label="Diari">
          <ErrorNote error={diaries.error} />
          {selectedDiary ? <DiaryCard diary={selectedDiary} onClose={() => setSelectedId(undefined)} /> : null}
          {diaries.loading && diaryList.length === 0 ? <p className="muted">Caricamento…</p> : null}
          {!diaries.loading && diaryList.length === 0 && !diaries.error ? (
            <p className="muted">Nessun diario in quest'area. Per comparire qui, apri il tuo diario in Restauro e attiva «Mostra sulla mappa».</p>
          ) : null}
          {diaryList.map((d) => (
            <div key={d.id} className="card part-item row between">
              <button className="part-main" onClick={() => pickDiary(d)}>
                <strong>{d.title}</strong>
                <div className="muted">{d.make} {d.model} · {d.year} · {d.owner.display_name}{d.distance_km != null ? <span className="mono"> · {d.distance_km} km</span> : ""}</div>
              </button>
            </div>
          ))}
        </section>
      ) : (
      <section className="sheet" aria-label="Pezzi">
        <ErrorNote error={parts.error} />
        {selected ? (
          <div className="card stack">
            <div className="row between">
              <strong>{selected.title}</strong>
              <span className="row">
                <ReportMenu targetType="part" targetId={selected.id} label="questo annuncio" ownerActions={ownActions(selected)} />
                <button onClick={() => setSelectedId(undefined)} aria-label="Chiudi dettaglio">✕</button>
              </span>
            </div>
            <div className="muted">{selected.make} {selected.model} · {CATEGORIES.find((c) => c.value === selected.category)?.label}
              {selected.distance_km != null ? ` · ${selected.distance_km} km` : ""}</div>
            <div><strong>{formatPrice(selected.price_cents)}</strong></div>
            <PartPhotoStrip part={selected} />
            {selected.description ? <p>{selected.description}</p> : null}
            <p>Di <Link to={`/p/${selected.seller.handle}`}>{selected.seller.display_name}</Link>
              {selected.seller.status === "unclaimed" ? " · profilo non riscattato" : ""}</p>
            <ContactBox part={selected} />
          </div>
        ) : null}
        {parts.loading && list.length === 0 ? <p className="muted">Caricamento…</p> : null}
        {!parts.loading && list.length === 0 && !parts.error ? <p className="muted">Nessun pezzo in quest'area. Prova ad allargare la ricerca.</p> : null}
        {list.map((p) => (
          <div key={p.id} className="card part-item row between">
            <button className="part-main" onClick={() => pickMarker(p)}>
              <PartThumb part={p} />
              <strong>{p.title}</strong> <span className="mono">· {formatPrice(p.price_cents)}</span>
              <div className="muted">{p.make} {p.model} · {p.seller.display_name}{p.distance_km != null ? <span className="mono"> · {p.distance_km} km</span> : ""}</div>
            </button>
            <ReportMenu targetType="part" targetId={p.id} label="questo annuncio" ownerActions={ownActions(p)} />
          </div>
        ))}
      </section>
      )}
    </main>
  );
}
