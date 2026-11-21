import { formatEuro, type PhaseTotal } from "../lib/budget";

const COLORS = ["#e5a93c", "#141619", "#8c929a", "#a67c14", "#5b616a", "#f0cf85"];

/** Ciambella SVG delle spese per fase. Solo dati locali. */
export default function Donut({ data }: { data: PhaseTotal[] }) {
  const total = data.reduce((a, d) => a + d.total, 0);
  if (total === 0) return <p className="muted">Nessuna spesa registrata.</p>;
  const r = 40;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="row">
      <svg viewBox="0 0 100 100" width="120" height="120" role="img" aria-label="Spese per fase">
        <g transform="rotate(-90 50 50)">
          {data.map((d, i) => {
            const len = (d.total / total) * c;
            const el = (
              <circle key={d.phase} cx="50" cy="50" r={r} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="16" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
            );
            offset += len;
            return el;
          })}
        </g>
      </svg>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {data.map((d, i) => (
          <li key={d.phase}>
            <span style={{ color: COLORS[i % COLORS.length] }}>●</span> {d.phase}: <strong>{formatEuro(d.total)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
