// Regenerates src/abi/*.ts from the Foundry build in ../../protocol/out.
// Run `forge build` in protocol/ first, then `npm run gen:abi` here.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', '..', '..', 'protocol', 'out');
const dst = join(here, '..', 'src', 'abi');
mkdirSync(dst, { recursive: true });

const targets = {
  Entrypoint: 'Entrypoint.sol/Entrypoint.json',
  PrivacyPool: 'PrivacyPoolComplex.sol/PrivacyPoolComplex.json',
  ZipBook: 'ZipBook.sol/ZipBook.json',
  ZipDoorstep: 'ZipDoorstep.sol/ZipDoorstep.json',
};

const names = [];
for (const [name, rel] of Object.entries(targets)) {
  const { abi } = JSON.parse(readFileSync(join(out, rel), 'utf8'));
  writeFileSync(
    join(dst, `${name}.ts`),
    `// Generated from protocol/out/${rel} by scripts/gen-abi.mjs. Do not edit.\nexport const ${name}Abi = ${JSON.stringify(abi, null, 2)} as const;\n`,
  );
  names.push(name);
  console.log(`${name}: ${abi.length} entries`);
}
writeFileSync(join(dst, 'index.ts'), names.map((n) => `export * from './${n}.js';\n`).join(''));
