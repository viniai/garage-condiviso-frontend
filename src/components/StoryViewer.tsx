import { useEffect, useState } from "react";
import { mediaUrl } from "../api/client";
import type { Highlight } from "../api/types";

export const STORY_DURATION_MS = 5000;

interface Props {
  highlight: Highlight;
  onClose: () => void;
  /** Se presente (proprietario), mostra il pulsante per eliminare la foto corrente. */
  onDeleteItem?: (itemId: string) => void;
}

/** Visualizzatore a schermo intero stile storie: barre di avanzamento, tocco sx/dx, Esc per chiudere. */
export default function StoryViewer({ highlight, onClose, onDeleteItem }: Props) {
  const [index, setIndex] = useState(0);
  const total = highlight.items.length;
  const item = highlight.items[Math.min(index, total - 1)];

  const next = () => (index >= total - 1 ? onClose() : setIndex(index + 1));
  const prev = () => setIndex(Math.max(0, index - 1));

  useEffect(() => {
    if (total === 0) return;
    const timer = window.setTimeout(next, STORY_DURATION_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total]);

  if (!item) {
    return (
      <div className="story" role="dialog" aria-modal="true" aria-label={highlight.title}>
        <p className="story-empty">Questa raccolta è vuota.</p>
        <button className="story-close" onClick={onClose} aria-label="Chiudi">✕</button>
      </div>
    );
  }

  return (
    <div className="story" role="dialog" aria-modal="true" aria-label={highlight.title}>
      <div className="story-bars" aria-hidden>
        {highlight.items.map((it, i) => (
          <span key={it.id} className={i < index ? "done" : i === index ? "active" : ""} />
        ))}
      </div>
      <div className="story-head">
        <strong>{highlight.title}</strong>
        <span className="row">
          {onDeleteItem ? (
            <button className="story-btn" onClick={() => onDeleteItem(item.id)}>Elimina foto</button>
          ) : null}
          <button className="story-close" onClick={onClose} aria-label="Chiudi">✕</button>
        </span>
      </div>
      <img key={item.id} className="story-img" src={mediaUrl(item.url)} alt={item.caption || highlight.title} />
      {item.caption ? <p className="story-caption">{item.caption}</p> : null}
      <button className="story-zone left" onClick={prev} aria-label="Foto precedente" />
      <button className="story-zone right" onClick={next} aria-label="Foto successiva" />
    </div>
  );
}
