# Install

Requirements: Node.js 20 or later. No other runtime dependencies — the CLI is a single
bundled file (`skills/answer-me-with-mermaid/scripts/amm.mjs`) that includes Pele.

## Option A — skills CLI

```bash
npx skills add <owner>/answer-me-with-mermaid
```

## Option B — copy the skill folder

Copy `skills/answer-me-with-mermaid/` into your agent's skills directory, for example:

| Agent        | Directory                          |
|--------------|------------------------------------|
| Claude Code  | `~/.claude/skills/`                |
| Codex        | `~/.codex/skills/`                 |
| Other        | wherever your agent loads skills   |

## Build from source

```bash
npm install
npm run build      # bundles src/cli.js + pele → skills/answer-me-with-mermaid/scripts/amm.mjs
npm test
```

## Try it

```bash
node skills/answer-me-with-mermaid/scripts/amm.mjs check  examples/order-states.md
node skills/answer-me-with-mermaid/scripts/amm.mjs render examples/order-states.md -o /tmp/order.html
```
