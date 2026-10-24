import { useEffect, useRef } from 'react';

import { NODE_URL } from './config';

export type LiveEvent =
  | { type: 'post'; post: { id: number; reply_to: number; burned: string; text: string; tx: string; ts: number } }
  | { type: 'delivery'; delivery: { id: number; door: string; burned: string; text: string; cipher: string; tx: string; ts: number } }
  | { type: 'deposit'; deposit: { label: string; value: string; tx: string; ts: number } }
  | { type: 'approval'; label: string; status: 'approved' | 'rejected' }
  | { type: 'root'; root: string; cid: string; ts: number }
  | { type: 'block'; lastSynced: string };

const TYPES: LiveEvent['type'][] = ['post', 'delivery', 'deposit', 'approval', 'root', 'block'];

/**
 * Subscribes to the node's server-sent event stream. One EventSource per mounted hook; the browser
 * reconnects on its own. Falls silent, never throws, when the node is unreachable.
 */
export function useLiveEvents(handler: (event: LiveEvent) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const source = new EventSource(`${NODE_URL}/events/stream`);
    const listeners = TYPES.map((type) => {
      const fn = (e: MessageEvent) => {
        try {
          ref.current(JSON.parse(e.data as string) as LiveEvent);
        } catch {
          /* ignore malformed frames */
        }
      };
      source.addEventListener(type, fn);
      return [type, fn] as const;
    });
    return () => {
      for (const [type, fn] of listeners) source.removeEventListener(type, fn);
      source.close();
    };
  }, []);
}
