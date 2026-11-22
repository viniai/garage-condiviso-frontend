import { useRef, useState } from "react";
import { api } from "../api/endpoints";
import { mediaUrl } from "../api/client";
import type { Part } from "../api/types";
import { resizeImage } from "../lib/image";
import { ErrorNote } from "./ui";

export const MAX_PART_PHOTOS = 3;

/** Strisce di foto di un annuncio (sola lettura). */
export function PartPhotoStrip({ part }: { part: Pick<Part, "photos" | "title"> }) {
  if (!part.photos.length) return null;
  return (
    <div className="part-photos">
      {part.photos.map((p) => (
        <img key={p.id} src={mediaUrl(p.url)} alt={part.title} loading="lazy" width={p.width} height={p.height} />
      ))}
    </div>
  );
}

/** Miniatura per le liste. */
export function PartThumb({ part }: { part: Pick<Part, "photos" | "title"> }) {
  const first = part.photos[0];
  return first ? <img className="part-thumb" src={mediaUrl(first.url)} alt="" loading="lazy" /> : null;
}

/** Il titolare aggiunge o toglie le foto (max 3). */
export function PartPhotoManager({ part, token, onChange }: { part: Part; token: string; onChange: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const room = MAX_PART_PHOTOS - part.photos.length;

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(undefined);
    try {
      for (const file of Array.from(files).slice(0, room)) {
        await api.uploadPartPhoto(token, part.id, await resizeImage(file));
      }
      onChange();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(id: string) {
    try {
      await api.deletePartPhoto(token, id);
      onChange();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div className="stack">
      <div className="part-photos">
        {part.photos.map((p) => (
          <span key={p.id} className="part-photo-edit">
            <img src={mediaUrl(p.url)} alt={part.title} loading="lazy" />
            <button type="button" aria-label="Elimina foto" onClick={() => void remove(p.id)}>✕</button>
          </span>
        ))}
        {room > 0 ? (
          <button type="button" className="part-photo-add" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? "…" : "+ Foto"}
          </button>
        ) : null}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => void add(e.target.files)} />
      <span className="muted">{part.photos.length}/{MAX_PART_PHOTOS} foto</span>
      <ErrorNote error={error} />
    </div>
  );
}
