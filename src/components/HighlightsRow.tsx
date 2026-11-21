import { type FormEvent, useState } from "react";
import { mediaUrl } from "../api/client";
import { api } from "../api/endpoints";
import type { Highlight } from "../api/types";
import { useSession } from "../auth/session";
import { resizeImage } from "../lib/image";
import { useAsync } from "../lib/useAsync";
import StoryViewer from "./StoryViewer";
import { ErrorNote } from "./ui";

/** Raccolte "in evidenza" del profilo. Il proprietario può crearle e aggiungere foto. */
export default function HighlightsRow({ handle, isOwner }: { handle: string; isOwner: boolean }) {
  const { token } = useSession();
  const list = useAsync(() => api.highlights(handle), [handle]);
  const config = useAsync(() => api.config().catch(() => null), []);
  const [openId, setOpenId] = useState<string>();
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  const highlights = list.data ?? [];
  const opened = highlights.find((h) => h.id === openId);
  const maxHighlights = config.data?.max_highlights_per_profile ?? 6;
  const maxItems = config.data?.max_items_per_highlight ?? 12;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      list.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const title = String(new FormData(form).get("title")).trim();
    void run(async () => {
      await api.createHighlight(token as string, title);
      form.reset();
    });
  }

  async function addPhotos(h: Highlight, files: FileList | null, caption: string) {
    if (!files?.length) return;
    await run(async () => {
      for (const file of Array.from(files)) {
        await api.addHighlightItem(token as string, h.id, await resizeImage(file), caption);
      }
    });
  }

  if (!isOwner && highlights.length === 0) return null;

  return (
    <section aria-label="In evidenza">
      <div className="hl-row">
        {highlights.map((h) => (
          <button key={h.id} className="hl-item" onClick={() => setOpenId(h.id)} aria-label={`Apri ${h.title}`}>
            <span className="hl-ring">
              {h.cover_url ? <img src={mediaUrl(h.cover_url)} alt="" loading="lazy" /> : <span className="hl-empty">{h.title.slice(0, 1).toUpperCase()}</span>}
            </span>
            <span className="hl-title">{h.title}</span>
          </button>
        ))}
        {isOwner ? (
          <button className="hl-item" onClick={() => setManaging((v) => !v)} aria-expanded={managing} aria-label="Gestisci in evidenza">
            <span className="hl-ring hl-add">+</span>
            <span className="hl-title">Gestisci</span>
          </button>
        ) : null}
      </div>

      {isOwner && managing ? (
        <div className="card stack">
          <strong>In evidenza ({highlights.length}/{maxHighlights})</strong>
          <p className="muted">Raccogli le foto più belle in gruppi, come "Restauro 500" o "Pezzi rari". Max {maxItems} foto per gruppo. Le foto vengono ridimensionate e senza posizione.</p>
          <ErrorNote error={error} />
          {highlights.map((h) => (
            <div key={h.id} className="row between">
              <span>{h.title} <span className="muted">({h.items.length}/{maxItems})</span></span>
              <span className="row">
                <label className="btn" style={{ marginBottom: 0 }}>
                  Aggiungi foto
                  <input type="file" accept="image/*" multiple hidden disabled={busy || h.items.length >= maxItems}
                    onChange={(e) => { void addPhotos(h, e.target.files, ""); e.target.value = ""; }} />
                </label>
                <button className="danger" disabled={busy} onClick={() => void run(() => api.deleteHighlight(token as string, h.id))}>Elimina</button>
              </span>
            </div>
          ))}
          {highlights.length < maxHighlights ? (
            <form className="row" onSubmit={create}>
              <input name="title" placeholder="Nome della raccolta" required maxLength={40} style={{ flex: 1 }} aria-label="Nome della raccolta" />
              <button className="primary" disabled={busy}>Crea</button>
            </form>
          ) : null}
        </div>
      ) : null}

      {opened ? (
        <StoryViewer
          highlight={opened}
          onClose={() => setOpenId(undefined)}
          onDeleteItem={isOwner ? (id) => void run(() => api.deleteHighlightItem(token as string, id)) : undefined}
        />
      ) : null}
    </section>
  );
}
