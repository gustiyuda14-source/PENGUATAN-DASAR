// Regenerate data/paket-*.json dari formula di js/soal-bank.js.
// Jalanin manual tiap kali formula soal berubah: node scripts/generate-soal-data.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generatePaket1, generatePaket2, generatePaket3 } from '../js/soal-bank.js';

const POOL_SIZE = 300;
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'data');
mkdirSync(outDir, { recursive: true });

const generators = { 1: generatePaket1, 2: generatePaket2, 3: generatePaket3 };

for (const [id, gen] of Object.entries(generators)) {
    const pool = gen(POOL_SIZE);
    const outPath = join(outDir, `paket-${id}.json`);
    writeFileSync(outPath, JSON.stringify(pool, null, 2));
    console.log(`paket-${id}.json: ${pool.length} soal`);
}
