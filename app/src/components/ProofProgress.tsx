const STEPS = [
  ['reading pool state', 'Reading pool state'],
  ['loading', 'Loading proving keys'],
  ['generating proof', 'Generating proof in your browser'],
  ['sending to relayer', 'Handing the proof to the relayer'],
] as const;

/** Staged view of a spend. `message` is the raw progress string from lib/zip. */
export function ProofProgress({ message }: { message: string }) {
  const idx = STEPS.findIndex(([key]) => message.startsWith(key));
  const active = idx === -1 ? STEPS.length : idx;
  return (
    <div className="proof" aria-live="polite">
      {STEPS.map(([key, label], i) => (
        <div key={key} className={`step ${i < active ? 'is-done' : i === active ? 'is-active' : ''}`}>
          <span className="dot" />
          <span>{i === active && message.startsWith('loading') ? message : label}</span>
        </div>
      ))}
      <p className="fine">Nothing leaves this browser until the proof is complete. Ten to thirty seconds is normal.</p>
    </div>
  );
}
