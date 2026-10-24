import { useEffect, useState } from 'react';

const ITEMS = [
  ['thesis', 'Thesis'],
  ['how', 'Protocol'],
  ['architecture', 'Architecture'],
  ['book', 'The Book'],
  ['roadmap', 'Roadmap'],
  ['token', 'Token'],
  ['commitments', 'Commitments'],
  ['lineage', 'Lineage'],
  ['faq', 'FAQ'],
] as const;

export function Rail() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) if (en.isIntersecting) setActive(en.target.id);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: 0 },
    );
    for (const [id] of ITEMS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);
  return (
    <ul className="rail" aria-label="Page index">
      {ITEMS.map(([id, label]) => (
        <li key={id}>
          <a href={`#${id}`} className={active === id ? 'is-active' : undefined}><span>{label}</span></a>
        </li>
      ))}
    </ul>
  );
}
