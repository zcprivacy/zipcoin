import { EventEmitter } from 'node:events';

/** In-process bus: the indexer and postman publish, the SSE endpoint fans out to browsers. */
export type LiveEvent =
  | { type: 'post'; post: { id: number; reply_to: number; burned: string; text: string; tx: string; ts: number } }
  | { type: 'delivery'; delivery: { id: number; door: string; burned: string; text: string; cipher: string; tx: string; ts: number } }
  | { type: 'deposit'; deposit: { label: string; value: string; tx: string; ts: number } }
  | { type: 'approval'; label: string; status: 'approved' | 'rejected' }
  | { type: 'root'; root: string; cid: string; ts: number }
  | { type: 'block'; lastSynced: string };

class Bus extends EventEmitter {
  publish(event: LiveEvent) {
    this.emit('live', event);
  }
  subscribe(fn: (event: LiveEvent) => void): () => void {
    this.on('live', fn);
    return () => this.off('live', fn);
  }
}

export const bus = new Bus();
bus.setMaxListeners(1000);
