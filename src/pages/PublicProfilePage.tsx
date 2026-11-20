import { useState } from "react";
import { useParams } from "react-router-dom";
import { mediaUrl } from "../api/client";
import { api } from "../api/endpoints";
import { CATEGORIES, type Review } from "../api/types";
import { useSession } from "../auth/session";
import { ErrorNote, Page, Stars } from "../components/ui";
import { useAsync } from "../lib/useAsync";

type Tab = "showcase" | "diaries" | "reviews";

function Diaries({ handle }: { handle: string }) {
  const vehicles = useAsync(() => api.profileVehicles(handle), [handle]);
  const entries = useAsync(async () => {
    const list = vehicles.data ?? [];
    return Promise.all(list.map(async (v) => ({ vehicle: v, entries: await api.vehicleEntries(v.id) })));
  }, [vehicles.data]);
  if (!entries.data?.length) return <p className="muted">Nessun diario pubblico.</p>;
  return (
    <>
      {entries.data.map(({ vehicle, entries: items }) => (
        <section key={vehicle.id}>
          <h2>{vehicle.title} <span className="muted">· {vehicle.make} {vehicle.model} {vehicle.year}</span></h2>
          {items.map((e) => (
            <div key={e.id} className="card stack">
              <div className="row between"><strong>{e.title}</strong><span className="muted">{e.occurred_on}</span></div>
              {e.body ? <p>{e.body}</p> : null}
              {e.photos.length ? <div className="photos">{e.photos.map((p) => <img key={p.id} src={mediaUrl(p.url)} alt="" loading="lazy" />)}</div> : null}
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

function ReviewForm({ handle, onDone }: { handle: string; onDone: () => void }) {
  const { token, me } = useSession();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [error, setError] = useState<unknown>();
  if (!token || !me?.profile || me.profile.handle === handle) return null;
  async function submit() {
    try {
      await api.createReview(token as string, handle, { rating, text });
      setText("");
      setError(undefined);
      onDone();
    } catch (err) {
      setError(err);
    }
  }
  return (
    <div className="card stack">
      <strong>Lascia una recensione</strong>
      <p className="muted">Puoi recensire solo chi hai contattato.</p>
      <select aria-label="Valutazione" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
      </select>
      <textarea aria-label="Testo" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
      <ErrorNote error={error} />
      <button className="primary" onClick={() => void submit()}>Pubblica recensione</button>
    </div>
  );
}

function ReviewItem({ review, isOwner, onChange }: { review: Review; isOwner: boolean; onChange: () => void }) {
  const { token } = useSession();
  const [reply, setReply] = useState("");
  const [error, setError] = useState<unknown>();
  const [reported, setReported] = useState(false);

  async function send() {
    try {
      await api.replyReview(token as string, review.id, reply);
      onChange();
    } catch (err) {
      setError(err);
    }
  }
  async function report() {
    try {
      await api.report(token as string, { target_type: "review", target_id: review.id, reason: "other" });
      setReported(true);
    } catch (err) {
      setError(err);
    }
  }
  return (
    <div className="card stack">
      <div className="row between"><Stars value={review.rating} /><span className="muted">{review.reviewer.display_name}</span></div>
      {review.text ? <p>{review.text}</p> : null}
      {review.reply ? <p className="muted">Risposta: {review.reply}</p> : null}
      {isOwner && !review.reply ? (
        <div className="row"><input aria-label="Risposta" value={reply} onChange={(e) => setReply(e.target.value)} style={{ flex: 1 }} /><button onClick={() => void send()} disabled={!reply.trim()}>Rispondi</button></div>
      ) : null}
      {token ? (reported ? <span className="muted">Segnalata</span> : <button className="muted" onClick={() => void report()}>Segnala</button>) : null}
      <ErrorNote error={error} />
    </div>
  );
}

export default function PublicProfilePage() {
  const { handle = "" } = useParams();
  const { me } = useSession();
  const [tab, setTab] = useState<Tab>("showcase");
  const profile = useAsync(() => api.getProfile(handle), [handle]);
  const parts = useAsync(() => api.profileParts(handle), [handle]);
  const reviews = useAsync(() => api.reviews(handle), [handle]);

  if (profile.error) return <Page><ErrorNote error={profile.error} /></Page>;
  if (!profile.data) return <Page><p className="muted">Caricamento…</p></Page>;
  const p = profile.data;
  const isOwner = me?.profile?.handle === handle;

  return (
    <Page>
      <h1>{p.display_name}</h1>
      <p className="muted">@{p.handle} · {p.municipality}
        {p.rating_average != null ? <> · <Stars value={Math.round(p.rating_average)} /> {p.rating_average} ({p.rating_count})</> : null}
        {p.status === "unclaimed" ? " · profilo non ancora riscattato" : ""}</p>
      {p.bio ? <p>{p.bio}</p> : null}
      <div className="tabs" role="tablist">
        {([["showcase", "Vetrina"], ["diaries", "Diari"], ["reviews", "Recensioni"]] as const).map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={`chip ${tab === key ? "on" : ""}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {tab === "showcase" ? (
        <>
          {(parts.data ?? []).map((x) => (
            <div key={x.id} className="card">
              <strong>{x.title}</strong>
              <div className="muted">{x.make} {x.model} · {CATEGORIES.find((c) => c.value === x.category)?.label}</div>
              {x.description ? <p>{x.description}</p> : null}
            </div>
          ))}
          {parts.data?.length === 0 ? <p className="muted">Nessun pezzo in vetrina.</p> : null}
        </>
      ) : null}
      {tab === "diaries" ? <Diaries handle={handle} /> : null}
      {tab === "reviews" ? (
        <>
          <ReviewForm handle={handle} onDone={() => { reviews.reload(); profile.reload(); }} />
          {(reviews.data?.items ?? []).map((r) => <ReviewItem key={r.id} review={r} isOwner={isOwner} onChange={reviews.reload} />)}
          {reviews.data?.items.length === 0 ? <p className="muted">Ancora nessuna recensione.</p> : null}
        </>
      ) : null}
    </Page>
  );
}
