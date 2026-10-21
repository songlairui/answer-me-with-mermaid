// Copies Ondine's speed-optimized WebAssembly compiler next to the bundled CLI,
// so the skill folder runs with only Node (no node_modules).
import { copyFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(import.meta.resolve('ondine/compiler/wasm/all.fast.wasm'));
const dest = fileURLToPath(new URL('../skills/answer-me-with-mermaid/scripts/ondine.wasm', import.meta.url));
copyFileSync(src, dest);
console.log(`copied ${src} -> ${dest} (${statSync(dest).size} bytes)`);
