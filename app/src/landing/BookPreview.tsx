import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../lib/api';
import { ago, fmtZC } from '../lib/format';
import { useZip } from '../state';

/** The Book section on the landing: live, read-only, the latest three posts and the running totals. */
export function BookPreview() {
  const zip = useZip();
  const feed = useQuery({ queryKey: ['posts', 'preview'], queryFn: () => api.posts(), staleTime: 10_000, refetchInterval: 30_000 });
  useEffect(() => zip.onLive((e) => e.type === 'post' && void feed.refetch()), [zip, feed]);
  const posts = feed.data?.posts.slice(0, 3) ?? [];
  const live = !!zip.pool?.spenders.book;

  return (
    <div className="book" aria-label="Latest entries from the Book">
      <div className="book-head">
        <span className="eyebrow">{live ? 'The Book · live' : 'The Book · example entries'}</span>
        <span className="eyebrow">{live && zip.stats ? `${fmtZC(zip.stats.totalBurned, 0)} ZC burned · ${zip.stats.posts} posts` : 'Authors unknown by design'}</span>
      </div>
      <ol>
        {(live ? posts : SAMPLE).map((p) => (
          <li key={p.id}>
            <div className="burn"><span className="num">{fmtZC(p.burned, 0)} zc</span><small>burned</small></div>
            <div>
              <p className="book-msg">{p.text}</p>
              <p className="book-meta">{live ? `#${p.id} · ${ago(p.ts)} · ` : ''}proof verified · no sender</p>
            </div>
          </li>
        ))}
        {live && posts.length === 0 && (
          <li><div className="burn"><span className="num">0 zc</span><small>burned</small></div><div><p className="book-msg">Nothing has been said yet. The first burn writes the first line.</p></div></li>
        )}
      </ol>
      <div className="book-head" style={{ borderTop: '1px solid var(--line)', borderBottom: 0 }}>
        <Link className="btn btn-sm" to="/book">{live ? 'Open the Book' : 'See the Book in the app'}</Link>
      </div>
    </div>
  );
}

const SAMPLE = [
  { id: 1, burned: '1000000000000000000000', text: 'The lantern is lit on the north bridge until the snow stops.', ts: 0 },
  { id: 2, burned: '4000000000000000000000', text: 'Rent for the reading room is paid through spring. Keep the door open.', ts: 0 },
  { id: 3, burned: '12500000000000000000000', text: 'To whoever returned the ledger: it was never about the money.', ts: 0 },
];
