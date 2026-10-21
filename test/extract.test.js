// Placeholder tests. Run with `npm test` after `npm install`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractMermaidBlocks } from '../src/cli.js';

test('finds mermaid blocks with 1-based start lines', () => {
  const md = 'Intro\n\n```mermaid\nflowchart LR\n  A --> B\n```\n';
  const blocks = extractMermaidBlocks(md);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].startLine, 4);
  assert.match(blocks[0].code, /A --> B/);
});

test.todo('check reports PeleError line:column mapped to the markdown file');
test.todo('render writes one offline HTML plus one SVG per diagram');
