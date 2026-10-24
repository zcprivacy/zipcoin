import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { fmtZC, short } from '../lib/format';
import { useZip } from '../state';

/** The frosted pane as an effect: a noise canvas the pointer wipes clear. */
function useFrost(pane: React.RefObject<HTMLDivElement>, canvasRef: React.RefObject<HTMLCanvasElement>, theme: string) {
  useEffect(() => {
    const el = pane.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const off = document.createElement('canvas');
    const octx = off.getContext('2d')!;
    let W = 0;
    let H = 0;
    let raf = 0;
    let lastFrost = 0;
    let lastX: number | null = null;
    let lastY: number | null = null;

    const rgb = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--frost-rgb').trim().split(',').map((x) => parseInt(x, 10));
      return v.length === 3 && !Number.isNaN(v[0]) ? v : [166, 212, 255];
    };
    const paintNoise = () => {
      const [R, G, B] = rgb() as [number, number, number];
      const img = octx.createImageData(off.width, off.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = Math.random();
        d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = (n * n * 215) | 0;
      }
      octx.putImageData(img, 0, 0);
    };
    const size = () => {
      const r = el.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width + 96));
      H = Math.max(1, Math.round(r.height + 80));
      const dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      off.width = Math.max(1, Math.round(W / 2));
      off.height = Math.max(1, Math.round(H / 2));
      paintNoise();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = reduce ? 0.55 : 1;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(off, 0, 0, W, H);
      ctx.globalAlpha = 1;
    };
    const wipe = (x: number, y: number, rad: number) => {
      ctx.globalCompositeOperation = 'destination-out';
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(0,0,0,.9)');
      g.addColorStop(0.6, 'rgba(0,0,0,.45)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    };
    const refrost = (ts: number) => {
      if (!reduce && ts - lastFrost > 120) {
        ctx.globalAlpha = 0.035;
        ctx.drawImage(off, 0, 0, W, H);
        ctx.globalAlpha = 1;
        lastFrost = ts;
      }
      raf = requestAnimationFrame(refrost);
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left + 48;
      const y = e.clientY - r.top + 48;
      if (lastX !== null && lastY !== null) {
        const dx = x - lastX;
        const dy = y - lastY;
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 12));
        for (let i = 1; i <= steps; i++) wipe(lastX + (dx * i) / steps, lastY + (dy * i) / steps, 110);
      } else wipe(x, y, 110);
      lastX = x;
      lastY = y;
    };
    const leave = () => {
      lastX = lastY = null;
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    const ro = new ResizeObserver(size);
    ro.observe(el);
    size();
    if (document.fonts?.ready) void document.fonts.ready.then(size);
    if (!reduce) raf = requestAnimationFrame(refrost);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [pane, canvasRef, theme]);
}

export function Hero() {
  const zip = useZip();
  const pane = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useFrost(pane, canvas, zip.theme);

  const pool = zip.pool;
  const stats = zip.stats;
  const poolLive = !!pool;
  const bookLive = !!pool?.spenders.book;
  const phase = poolLive && !bookLive ? 'III · The Pool' : 'IV · The Book';

  return (
    <section className="hero" id="top">
      <div className="wrap">
        <div className="hero-main">
          <div className="frost-pane" ref={pane}>
            <canvas ref={canvas} aria-hidden="true" />
            <p className="eyebrow hero-line">Zipcoin reborn · Privacy protocol · Ethereum mainnet</p>
            <h1 className="hero-line">Privacy <em>lives on.</em></h1>
            <p className="lede hero-line">
              Zipcoin is reborn as a shielded pool for ZC on Ethereum, built by a new team on audited open-source
              cryptography. Deposit in the open, then pay, speak, gift and swap from inside the pool with zero-knowledge
              proofs. <strong>The chain sees a payment. It cannot see who made it.</strong>
            </p>
          </div>
          <div className="cta-row hero-line">
            <Link className="btn btn-primary" to="/pool">Open the app</Link>
            <a className="btn btn-ghost" href="#how">See how it works</a>
            <span className="hero-links">
              <a href="https://github.com/zcprivacy/zipcoin" target="_blank" rel="noopener">GitHub</a>
              <a href="https://x.com/zcprivacy" target="_blank" rel="noopener">X · @zcprivacy</a>
            </span>
          </div>
        </div>

        <aside className="hero-side">
          <div className="status" aria-label="Protocol status">
            <div className="status-head"><span className="eyebrow">Status · live</span><span className="pulse" aria-hidden="true" /></div>
            <dl>
              <div><dt>Token</dt><dd>ZC on {zip.chainName}<small>Fixed supply · no team allocation</small></dd></div>
              <div><dt>Phase</dt><dd>{phase}<small>{poolLive ? (bookLive ? 'Pool and Book deployed' : 'Pool deployed') : 'Live · node unreachable'}</small></dd></div>
              <div>
                <dt>Shielded pool</dt>
                <dd>
                  {poolLive ? `${stats?.deposits ?? '…'} deposits` : '…'}
                  <small>{poolLive ? `${fmtZC(stats?.inPool ?? '0', 0)} ZC inside · ${short(pool.pool)}` : 'Node unreachable'}</small>
                </dd>
              </div>
              <div>
                <dt>The Book</dt>
                <dd>
                  {bookLive ? `${stats?.posts ?? 0} posts` : '…'}
                  <small>{bookLive ? `${fmtZC(stats?.totalBurned ?? '0', 0)} ZC burned to speak` : 'Node unreachable'}</small>
                </dd>
              </div>
            </dl>
            <p className="status-foot"><a href="#roadmap">Roadmap and completion criteria</a></p>
          </div>
        </aside>
      </div>
    </section>
  );
}
