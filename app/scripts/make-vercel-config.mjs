// Writes vercel.json from vercel.template.json with NODE_ORIGIN filled in.
// NODE_ORIGIN is the public https origin of the Zipcoin node this deployment proxies /api/* to.
// The generated vercel.json is git-ignored so that no operator's hostname lives in the repository.
import { readFileSync, writeFileSync } from 'node:fs';

const origin = (process.env.NODE_ORIGIN ?? '').trim().replace(/\/+$/, '');
if (!/^https:\/\/[^/\s]+$/.test(origin)) {
  console.error('Set NODE_ORIGIN to your node\'s https origin, for example: NODE_ORIGIN=https://node.example.org npm run vercel:config');
  process.exit(1);
}
const template = readFileSync(new URL('../vercel.template.json', import.meta.url), 'utf8');
writeFileSync(new URL('../vercel.json', import.meta.url), template.replaceAll('__NODE_ORIGIN__', origin));
console.log(`vercel.json written: /api/* proxies to ${origin}`);
