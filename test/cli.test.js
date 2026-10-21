import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { extractMermaidBlocks, checkBlock, buildHtml, render } from '../src/cli.js';

const CLI = new URL('../src/cli.js', import.meta.url).pathname;

test('finds mermaid blocks with 1-based start lines', () => {
  const md = 'Intro\n\n```mermaid\nflowchart LR\n  A --> B\n```\n';
  const blocks = extractMermaidBlocks(md);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].startLine, 4);
  assert.match(blocks[0].code, /A --> B/);
});

test('flags an unterminated fence', () => {
  const [b] = extractMermaidBlocks('```mermaid\nflowchart LR\n A-->B\n');
  assert.equal(checkBlock(b).code, 'unterminated-fence');
});

test('valid diagram passes', () => {
  const [b] = extractMermaidBlocks('```mermaid\nflowchart LR\n  A --> B\n```\n');
  assert.equal(checkBlock(b), null);
});

test('maps RenderError line:column to the markdown file', () => {
  const md = 'Intro\n\nmore\n\n```mermaid\nsequenceDiagram\n  A->>B hi\n```\n';
  const [b] = extractMermaidBlocks(md);
  const e = checkBlock(b);
  assert.equal(e.code, 'syntax');
  assert.equal(e.line, 7); // "  A->>B hi" is line 7 of the file
  assert.ok(e.column > 0);
  assert.ok(!/Parse error on line/.test(e.message), 'block-relative header stripped');
  assert.ok(e.snippet.includes('A->>B hi'));
});

test('error without a position points at the opening fence', () => {
  const [b] = extractMermaidBlocks('x\n```mermaid\nnot a diagram\n```\n');
  const e = checkBlock(b);
  assert.equal(e.code, 'unsupported-diagram');
  assert.equal(e.line, 2);
});

test('buildHtml inlines SVG and leaves no mermaid fences or external refs', () => {
  const md = '# T\n\nText\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\nAfter';
  const svg = render('flowchart LR\n  A --> B').svg;
  const html = buildHtml(md, [svg], { title: 'T', theme: 'auto' });
  assert.match(html, /<figure><svg[^>]*class="ondine/);
  assert.ok(!html.includes('```'));
  assert.ok(!/(src|href)="https?:/.test(html));
  assert.match(html, /<p>After<\/p>/);
});

test('CLI check exits 1 with file:line:col, render writes HTML + SVGs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'amm-'));
  const bad = join(dir, 'bad.md');
  writeFileSync(bad, 'Hi\n\n```mermaid\nsequenceDiagram\n  A->>B hi\n```\n');
  const r1 = spawnSync(process.execPath, [CLI, 'check', bad], { encoding: 'utf8' });
  assert.equal(r1.status, 1);
  assert.match(r1.stderr, /bad\.md:5:\d+ \[syntax\]/);

  const good = join(dir, 'good.md');
  writeFileSync(good, 'Hi\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\n```mermaid\npie\n  "A" : 1\n  "B" : 2\n```\n');
  const out = join(dir, 'good.html');
  const r2 = spawnSync(process.execPath, [CLI, 'render', good, '-o', out], { encoding: 'utf8' });
  assert.equal(r2.status, 0, r2.stderr);
  assert.equal((readFileSync(out, 'utf8').match(/<svg/g) ?? []).length, 2);
  assert.deepEqual(readdirSync(join(dir, 'good.svg')).sort(), ['diagram-1.svg', 'diagram-2.svg']);
});

test('usage error exits 2', () => {
  assert.equal(spawnSync(process.execPath, [CLI], { encoding: 'utf8' }).status, 2);
});

test('bundled CLI without ondine.wasm explains how to build it', (t) => {
  const bundled = new URL('../skills/answer-me-with-mermaid/scripts/amm.mjs', import.meta.url).pathname;
  if (!existsSync(bundled)) return t.skip('run `npm run build` first');
  const dir = mkdtempSync(join(tmpdir(), 'amm-nowasm-')); // outside the project: no node_modules
  copyFileSync(bundled, join(dir, 'amm.mjs'));
  writeFileSync(join(dir, 'a.md'), '```mermaid\nflowchart LR\n  A --> B\n```\n');
  const r = spawnSync(process.execPath, [join(dir, 'amm.mjs'), 'check', join(dir, 'a.md')], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /ondine\.wasm/);
  assert.match(r.stderr, /npm run build/);
});
