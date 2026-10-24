// Copies the Groth16 proving artifacts from the pinned Privacy Pools core submodule into public/artifacts
// and checks each file against the hash recorded in artifacts.manifest.json. Runs before every build.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const core = resolve(app, '../protocol/lib/privacy-pools-core/packages/circuits');
const manifest = JSON.parse(readFileSync(resolve(app, 'artifacts.manifest.json'), 'utf8'));
const outDir = resolve(app, 'public/artifacts');
mkdirSync(outDir, { recursive: true });

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
let ok = true;
for (const [name, { source, sha256: expected }] of Object.entries(manifest.files)) {
  const dest = resolve(outDir, name);
  if (existsSync(dest) && sha256(dest) === expected) {
    console.log(`ok       ${name}`);
    continue;
  }
  const src = resolve(core, source);
  if (!existsSync(src)) {
    console.error(`missing  ${name}: ${src}\n         run: git submodule update --init --recursive`);
    ok = false;
    continue;
  }
  if (sha256(src) !== expected) {
    console.error(`mismatch ${name}: ${src} does not match the pinned hash`);
    ok = false;
    continue;
  }
  copyFileSync(src, dest);
  console.log(`copied   ${name}`);
}
if (!ok) process.exit(1);
