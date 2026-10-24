import { useState, type ReactNode } from 'react';

export function Redact({ children, label }: { children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);
  return (
    <span
      className={`redact${open ? ' is-open' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={open}
      aria-label={label}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
    >
      {children}
    </span>
  );
}
