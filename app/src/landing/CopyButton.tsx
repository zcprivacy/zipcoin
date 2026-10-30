import { useState } from 'react';

export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('ok');
    } catch {
      setState('fail');
    }
    setTimeout(() => setState('idle'), 1600);
  };
  return (
    <button className="btn btn-sm" type="button" onClick={() => void copy()}>
      {state === 'ok' ? 'Copied' : state === 'fail' ? 'Select to copy' : 'Copy'}
    </button>
  );
}
