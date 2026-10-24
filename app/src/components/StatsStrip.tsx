export interface Stat {
  k: string;
  v: string;
  unit?: string;
  d?: string;
  ember?: boolean;
}

export function StatsStrip({ items }: { items: Stat[] }) {
  return (
    <div className="stats">
      {items.map((s) => (
        <div className={`stat${s.ember ? ' stat-ember' : ''}`} key={s.k}>
          <div className="k">{s.k}</div>
          <div className="v num">
            {s.v}
            {s.unit && <small>{s.unit}</small>}
          </div>
          {s.d && <div className="d">{s.d}</div>}
        </div>
      ))}
    </div>
  );
}
