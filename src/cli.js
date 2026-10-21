#!/usr/bin/env node
// answer-me-with-mermaid CLI (amm)
//
//   amm check  <answer.md>                  validate every ```mermaid block
//   amm render <answer.md> [-o out.html]    validate, then write SVGs + one offline HTML
//
// Exit codes: 0 ok, 1 diagram error(s), 2 usage / IO error.
// Error lines are machine-friendly so the model can fix and retry:
//   answer.md:14:7 [code] message
//     | offending snippet

import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { parse, render, PeleError } from 'pele';

const USAGE = `usage:
  amm check  <answer.md>
  amm render <answer.md> [-o <out.html>] [--svg-dir <dir>] [--theme light|dark|auto]`;

// ---------- markdown → blocks ----------

/** Find ```mermaid fenced blocks. Returns { code, startLine } (1-based line of first code line). */
export function extractMermaidBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let inBlock = false;
  let fence = '';
  let buf = [];
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inBlock) {
      const m = line.match(/^\s*(`{3,}|~{3,})\s*mermaid\s*$/i);
      if (m) { inBlock = true; fence = m[1]; buf = []; start = i + 2; }
    } else if (line.trim().startsWith(fence) && line.trim().replace(/[`~]/g, '') === '') {
      blocks.push({ code: buf.join('\n'), startLine: start });
      inBlock = false;
    } else {
      buf.push(line);
    }
  }
  if (inBlock) blocks.push({ code: buf.join('\n'), startLine: start, unterminated: true });
  return blocks;
}

// ---------- validation ----------

/** Validate one block; returns null or a normalized error with file-relative line numbers. */
export function checkBlock(block) {
  if (block.unterminated) {
    return { code: 'unterminated-fence', line: block.startLine - 1, column: 1, message: 'mermaid code fence is never closed', snippet: '' };
  }
  try {
    parse(block.code);
    render(block.code); // render too: some problems only show up at layout time
    return null;
  } catch (err) {
    if (err instanceof PeleError) {
      return {
        code: err.code,
        line: block.startLine + (err.line ?? 1) - 1,
        column: err.column ?? 1,
        message: err.message,
        snippet: err.snippet ?? '',
      };
    }
    return { code: 'internal', line: block.startLine, column: 1, message: String(err?.message ?? err), snippet: '' };
  }
}

function formatError(file, e) {
  let out = `${file}:${e.line}:${e.column} [${e.code}] ${e.message}`;
  if (e.snippet) out += '\n' + e.snippet.split('\n').map((l) => `  | ${l}`).join('\n');
  return out;
}

// ---------- HTML ----------

const THEME_CSS = `
:root{--bg:#fffcf0;--fg:#100f0f;--muted:#6f6e69}
.pele{--pele-bg:#fffcf0;--pele-fg:#100f0f;--pele-muted:#6f6e69;--pele-line:#100f0f;
--pele-surface:#f2f0e5;--pele-surface-alt:#e6e4d9;--pele-border:#cecdc3;--pele-accent:#205ea6;
--pele-font:system-ui,sans-serif;--pele-radius:4px}
[data-theme=dark]{--bg:#100f0f;--fg:#cecdc3;--muted:#878580}
[data-theme=dark] .pele{--pele-bg:#100f0f;--pele-fg:#cecdc3;--pele-muted:#878580;--pele-line:#cecdc3;
--pele-surface:#1c1b1a;--pele-surface-alt:#282726;--pele-border:#403e3c;--pele-accent:#4385be}
@media (prefers-color-scheme:dark){[data-theme=auto]{--bg:#100f0f;--fg:#cecdc3;--muted:#878580}
[data-theme=auto] .pele{--pele-bg:#100f0f;--pele-fg:#cecdc3;--pele-muted:#878580;--pele-line:#cecdc3;
--pele-surface:#1c1b1a;--pele-surface-alt:#282726;--pele-border:#403e3c;--pele-accent:#4385be}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,sans-serif}
main{max-width:860px;margin:2rem auto;padding:0 1rem}
figure{margin:1.5rem 0;overflow-x:auto}
pre{background:rgba(127,127,127,.12);padding:.75rem;border-radius:6px;overflow-x:auto}
`;

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

/**
 * Minimal markdown → HTML: replaces mermaid blocks with inline SVG, keeps other text
 * as escaped paragraphs / code. TODO: swap in a real (bundled) markdown renderer.
 */
export function buildHtml(markdown, svgs, { title, theme }) {
  let i = 0;
  const body = markdown
    .replace(/^\s*(`{3,}|~{3,})\s*mermaid\s*\n[\s\S]*?\n\s*\1\s*$/gim, () => `\u0000SVG${i++}\u0000`)
    .split(/\n{2,}/)
    .map((chunk) => {
      const m = chunk.match(/\u0000SVG(\d+)\u0000/);
      if (m) return `<figure class="pele">${svgs[Number(m[1])]}</figure>`;
      const h = chunk.match(/^(#{1,6})\s+(.*)$/);
      if (h) return `<h${h[1].length}>${escapeHtml(h[2])}</h${h[1].length}>`;
      if (/^```/.test(chunk)) return `<pre>${escapeHtml(chunk.replace(/^```.*\n?|```$/g, ''))}</pre>`;
      return chunk.trim() ? `<p>${escapeHtml(chunk).replace(/\n/g, '<br>')}</p>` : '';
    })
    .join('\n');
  return `<!doctype html>
<html lang="en" data-theme="${theme}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>${THEME_CSS}</style></head>
<body><main>
${body}
</main></body></html>
`;
}

// ---------- commands ----------

function readInput(file) {
  try { return readFileSync(file, 'utf8'); }
  catch (e) { console.error(`amm: cannot read ${file}: ${e.message}`); process.exit(2); }
}

function runCheck(file) {
  const md = readInput(file);
  const blocks = extractMermaidBlocks(md);
  if (blocks.length === 0) { console.error(`${file}: no \`\`\`mermaid blocks found`); return 1; }
  const errors = blocks.map(checkBlock).filter(Boolean);
  for (const e of errors) console.error(formatError(file, e));
  if (errors.length) { console.error(`\n${errors.length} of ${blocks.length} diagram(s) failed. Fix them and run again.`); return 1; }
  console.log(`ok: ${blocks.length} diagram(s) valid`);
  return 0;
}

function runRender(file, opts) {
  if (runCheck(file) !== 0) return 1;
  const md = readInput(file);
  const blocks = extractMermaidBlocks(md);
  const svgs = blocks.map((b) => render(b.code).svg);
  const stem = basename(file, extname(file));
  const outHtml = resolve(opts.out ?? join(dirname(file), `${stem}.html`));
  const svgDir = resolve(opts.svgDir ?? join(dirname(outHtml), `${stem}.svg`));
  mkdirSync(svgDir, { recursive: true });
  svgs.forEach((svg, i) => writeFileSync(join(svgDir, `diagram-${i + 1}.svg`), svg));
  writeFileSync(outHtml, buildHtml(md, svgs, { title: stem, theme: opts.theme ?? 'auto' }));
  console.log(outHtml);
  console.log(svgDir);
  return 0;
}

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const opts = { _: [] };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '-o' || a === '--out') opts.out = rest[++i];
    else if (a === '--svg-dir') opts.svgDir = rest[++i];
    else if (a === '--theme') opts.theme = rest[++i];
    else opts._.push(a);
  }
  return { cmd, opts };
}

function main(argv) {
  const { cmd, opts } = parseArgs(argv);
  const file = opts._[0];
  if (!file || !['check', 'render'].includes(cmd)) { console.error(USAGE); return 2; }
  return cmd === 'check' ? runCheck(file) : runRender(file, opts);
}

// Run only when executed directly (dev: src/cli.js, bundled: scripts/amm.mjs), not when imported by tests.
const entry = process.argv[1] ? pathToFileURL(realpathSync(process.argv[1])).href : '';
if (entry === import.meta.url) process.exit(main(process.argv.slice(2)));
