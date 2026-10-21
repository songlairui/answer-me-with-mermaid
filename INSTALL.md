# Install

Requirements: Node.js 20 or later. No other runtime dependencies — the CLI is a bundled
file (`skills/answer-me-with-mermaid/scripts/amm.mjs`, includes Ondine's JavaScript glue)
plus Ondine's WebAssembly compiler (`scripts/ondine.wasm`, ~3.7 MB). Keep both together.

## Build the compiler first

`ondine.wasm` (Ondine's WebAssembly compiler, ~3.7 MB) is **not committed**. Generate it
next to `amm.mjs` once after cloning (Node 20+):

```bash
git clone https://github.com/<owner>/answer-me-with-mermaid.git
cd answer-me-with-mermaid
npm install && npm run build   # writes skills/answer-me-with-mermaid/scripts/ondine.wasm
```

Without it the CLI exits with a message telling you to run `npm run build`.

## Option A — skills CLI

```bash
npx skills add <owner>/answer-me-with-mermaid
```

Then run `npm install && npm run build` in a clone (above) and copy
`scripts/ondine.wasm` into the installed skill's `scripts/` folder, or use Option B.

## Option B — copy the skill folder

After building, copy `skills/answer-me-with-mermaid/` (including `scripts/ondine.wasm`) into your agent's skills directory, for example:

| Agent        | Directory                          |
|--------------|------------------------------------|
| Claude Code  | `~/.claude/skills/`                |
| Codex        | `~/.codex/skills/`                 |
| Other        | wherever your agent loads skills   |

## Build from source

```bash
npm install
npm run build      # bundles src/cli.js + ondine → scripts/amm.mjs, copies ondine.wasm beside it
npm test
```

## Try it

```bash
node skills/answer-me-with-mermaid/scripts/amm.mjs check  examples/order-states.md
node skills/answer-me-with-mermaid/scripts/amm.mjs render examples/order-states.md -o /tmp/order.html
```
