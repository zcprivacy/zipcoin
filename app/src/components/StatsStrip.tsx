export interface Stat {
  k: string;
  v: string;
  unit?: string;
  d?: string;
  ember?: boolean;
}

/** A row of totals in the ledger style: label, big number, one line of context. */
export function StatsStrip({ items }: { items: Stat[] }) {
  return (
    <div className="totals" style={{ '--n': items.length } as React.CSSProperties}>
      {items.map((s) => (
        <div className={`total${s.ember ? ' ember' : ''}`} key={s.k}>
          <span className="k">{s.k}</span>
          <span className="v">
            {s.v}
            {s.unit && <small>{s.unit}</small>}
          </span>
          {s.d && <span className="d">{s.d}</span>}
        </div>
      ))}
    </div>
  );
}
