/**
 * Drives the real app in a headless Chromium-based browser through the wallet-free path: unlock with the
 * rehearsal phrase, recover notes, write a Book entry, prove in the browser and relay it. Prints console errors.
 *
 * Usage: node scripts/browser-e2e.mjs   (dev server on http://localhost:5173, node on :8080)
 * Set BROWSER_PATH to a Chrome, Chromium or Edge executable if none is found automatically.
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CANDIDATES = [
  process.env.BROWSER_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  `${process.env.ProgramFiles ?? ''}/Google/Chrome/Application/chrome.exe`,
  `${process.env['ProgramFiles(x86)'] ?? ''}/Google/Chrome/Application/chrome.exe`,
  `${process.env.ProgramFiles ?? ''}/Microsoft/Edge/Application/msedge.exe`,
  `${process.env['ProgramFiles(x86)'] ?? ''}/Microsoft/Edge/Application/msedge.exe`,
].filter(Boolean);
const BROWSER = CANDIDATES.find((p) => existsSync(p));
if (!BROWSER) {
  console.error('No Chromium-based browser found. Set BROWSER_PATH to a Chrome, Chromium or Edge executable.');
  process.exit(1);
}
const URL = process.env.APP_URL ?? 'http://localhost:5173/book';
const MNEMONIC = 'test test test test test test test test test test test junk';
const TEXT = `Spoken from a browser. ${new Date().toISOString()}`;

const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true, args: ['--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 1000 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));

const clickByText = async (selector, text) => {
  await page.waitForFunction((sel, t) => Array.from(document.querySelectorAll(sel)).some((el) => (el.textContent ?? '').trim() === t), { timeout: 30_000 }, selector, text);
  const handles = await page.$$(selector);
  for (const h of handles) {
    const t = (await h.evaluate((el) => el.textContent ?? '')).trim();
    if (t === text) { await h.click(); return; }
  }
  throw new Error(`no ${selector} with text "${text}"`);
};

console.log('open', URL);
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60_000 });

console.log('unlock with phrase');
await clickByText('button', 'unlock key');
await clickByText('.modal .seg button', 'Phrase');
await page.waitForSelector('.modal textarea.input');
await page.type('.modal textarea.input', MNEMONIC);
await clickByText('.modal button', 'Use this phrase');

console.log('wait for notes');
await page.waitForFunction(() => /taken from note/i.test(document.body.innerText), { timeout: 90_000 });
const paidFrom = await page.evaluate(() => document.body.innerText.match(/taken from note\s+[^\n]+/i)?.[0]);
console.log('paid from:', paidFrom);

console.log('write entry');
await page.waitForSelector('textarea.input:not(:disabled)');
await page.type('textarea.input', TEXT);
await clickByText('button', 'Burn and post');

console.log('proving in browser...');
const t0 = Date.now();
await page.waitForFunction(
  () => document.querySelector('.alert-ok')?.textContent?.includes('Posted') || document.querySelector('.alert-bad'),
  { timeout: 300_000, polling: 1000 },
);
const ok = await page.$('.alert-ok');
const bad = await page.$('.alert-bad');
console.log(ok ? `POSTED in ${Math.round((Date.now() - t0) / 1000)}s` : `FAILED: ${await bad.evaluate((e) => e.textContent)}`);

console.log('wait for live feed update');
await page.waitForFunction(() => document.querySelector('.pill') !== null || false, { timeout: 30_000 }).catch(() => null);
const pill = await page.$('.pill');
if (pill) { console.log('new-entry pill appeared:', await pill.evaluate((e) => e.textContent)); await pill.click(); }
await new Promise((r) => setTimeout(r, 2500));
const feedHasIt = await page.evaluate((t) => document.body.innerText.includes(t), TEXT);
console.log('entry visible in feed:', feedHasIt);
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });
console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
if (!ok || !feedHasIt) process.exit(1);
