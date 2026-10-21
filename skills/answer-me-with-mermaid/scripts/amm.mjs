#!/usr/bin/env node

// src/cli.js
import { readFileSync, writeFileSync, mkdirSync, realpathSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// node_modules/ondine/dist/internal/Wasm.js
var decoder = new TextDecoder();
var encoder = new TextEncoder();
function instantiate(input) {
  const module = typeof input === "string" ? new WebAssembly.Module(bytes(input)) : input;
  const exports = new WebAssembly.Instance(module, {}).exports;
  const reader = read(exports.memory);
  const fresh = () => {
    if (reader.bytes.byteLength === 0)
      Object.assign(reader, read(exports.memory));
    return reader;
  };
  const write = (text2, at) => text2 === "" ? 0 : encoder.encodeInto(text2, reader.bytes.subarray(at, at + text2.length * 3)).written;
  return {
    render(source, options, now) {
      exports.reset();
      const sourceAt = exports.alloc((source.length + options.length) * 3);
      fresh();
      const sourceLength = write(source, sourceAt);
      const optionsAt = sourceAt + sourceLength;
      const optionsLength = write(options, optionsAt);
      const at = exports.render(sourceAt, sourceLength, optionsAt, optionsLength, now);
      fresh().at = at;
      return decode(reader);
    }
  };
}
function bytes(base64) {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++)
    out[i] = binary.charCodeAt(i);
  return out;
}
function read(memory) {
  return { at: 0, bytes: new Uint8Array(memory.buffer), view: new DataView(memory.buffer) };
}
function decode(reader) {
  const status = reader.bytes[reader.at++];
  if (status === 1) {
    const code = text(reader);
    const type2 = text(reader);
    const line = reader.view.getUint32(field(reader), true);
    const column = reader.view.getUint32(field(reader), true);
    const snippet = text(reader);
    const message = text(reader);
    return { code, column, line, message, ok: false, snippet, type: type2 || void 0 };
  }
  const type = text(reader);
  const width = reader.view.getFloat64(field(reader), true);
  const height = reader.view.getFloat64(field(reader), true);
  const count = reader.view.getUint32(field(reader), true);
  const links = [];
  for (let i = 0; i < count; i++)
    links.push({
      href: text(reader),
      id: text(reader),
      internal: reader.bytes[field(reader)] === 1
    });
  const svg = text(reader);
  return { height, links, ok: true, svg, type, width };
}
function field(reader) {
  const length = reader.view.getUint32(reader.at, true);
  reader.at += 4 + length;
  return reader.at - length;
}
function text(reader) {
  const start = field(reader);
  return start === reader.at ? "" : decoder.decode(reader.bytes.subarray(start, reader.at));
}

// node_modules/ondine/dist/Render.js
var RenderError = class extends Error {
  name = "Render.RenderError";
  /** The kind of failure. */
  code;
  /** One-based UTF-16 column, or 0 when the error has no position. */
  column;
  /** One-based line, or 0 when the error has no position. */
  line;
  /** The offending source line with a caret under the column, or empty. */
  snippet;
  /** The detected diagram type, when known. */
  type;
  constructor(options) {
    super(options.message);
    this.code = options.code;
    this.column = options.column;
    this.line = options.line;
    this.snippet = options.snippet;
    this.type = options.type;
  }
};
function create(options) {
  const instances = /* @__PURE__ */ new Map();
  const instance = (type) => {
    let found = instances.get(type);
    if (found)
      return found;
    const module = options.modules[type];
    if (module === void 0)
      return void 0;
    found = instantiate(module);
    instances.set(type, found);
    return found;
  };
  const types = Object.keys(options.modules);
  return {
    render(source, renderOptions = {}) {
      const first = types[0] === void 0 ? void 0 : instance(types[0]);
      if (first === void 0)
        throw new Error("Render.create needs at least one module.");
      const json = serialize(renderOptions);
      const time = renderOptions.now ?? Date.now();
      const now = typeof time === "number" ? time : Number.NaN;
      const result = first.render(source, json, now);
      if (!result.ok && result.code === "unsupported-diagram" && result.type !== void 0) {
        const owner = instance(result.type);
        if (owner)
          return unwrap(owner.render(source, json, now));
      }
      return unwrap(result);
    }
  };
}
function serialize(options) {
  for (const _ in options)
    return JSON.stringify({ ...options, now: void 0 });
  return "";
}
function unwrap(result) {
  if (!result.ok)
    throw new RenderError({ ...result, code: result.code });
  return {
    height: result.height,
    links: result.links,
    svg: result.svg,
    type: result.type,
    width: result.width
  };
}

// src/cli.js
var renderer;
var MissingWasmError = class extends Error {
};
function wasmPath() {
  const beside = fileURLToPath(new URL("./ondine.wasm", import.meta.url));
  if (existsSync(beside)) return beside;
  try {
    const dev = fileURLToPath(import.meta.resolve("ondine/compiler/wasm/all.fast.wasm"));
    if (existsSync(dev)) return dev;
  } catch {
  }
  throw new MissingWasmError(
    `amm: Ondine compiler not found (expected ${beside}).
ondine.wasm is not committed to the repo; generate it from the project root with:
  npm install && npm run build   (Node 20+)`
  );
}
function render(source, options) {
  renderer ??= create({ modules: { all: new WebAssembly.Module(readFileSync(wasmPath())) } });
  return renderer.render(source, options);
}
var USAGE = `usage:
  amm check  <answer.md>
  amm render <answer.md> [-o <out.html>] [--svg-dir <dir>] [--theme light|dark|auto]`;
function extractMermaidBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let inBlock = false;
  let fence = "";
  let buf = [];
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inBlock) {
      const m = line.match(/^\s*(`{3,}|~{3,})\s*mermaid\s*$/i);
      if (m) {
        inBlock = true;
        fence = m[1];
        buf = [];
        start = i + 2;
      }
    } else if (line.trim().startsWith(fence) && line.trim().replace(/[`~]/g, "") === "") {
      blocks.push({ code: buf.join("\n"), startLine: start });
      inBlock = false;
    } else {
      buf.push(line);
    }
  }
  if (inBlock) blocks.push({ code: buf.join("\n"), startLine: start, unterminated: true });
  return blocks;
}
function checkBlock(block) {
  if (block.unterminated) {
    return { code: "unterminated-fence", line: block.startLine - 1, column: 1, message: "mermaid code fence is never closed", snippet: "" };
  }
  try {
    render(block.code);
    return null;
  } catch (err) {
    if (err instanceof RenderError) {
      const hasPos = err.line > 0;
      return {
        code: err.code,
        // Map the block-relative line to the markdown file; errors without a
        // position point at the opening fence.
        line: hasPos ? block.startLine + err.line - 1 : block.startLine - 1,
        column: hasPos ? err.column : 1,
        message: diagnostic(err),
        snippet: err.snippet ?? ""
      };
    }
    if (err instanceof MissingWasmError) throw err;
    return { code: "internal", line: block.startLine, column: 1, message: String(err?.message ?? err), snippet: "" };
  }
}
function diagnostic(err) {
  const msg = String(err.message ?? "");
  if (!/^Parse error on line \d+:/.test(msg)) return msg;
  const snippetLines = new Set((err.snippet ?? "").split("\n"));
  const rest = msg.split("\n").slice(1).filter((l) => !snippetLines.has(l)).join(" ").trim();
  return rest || msg.split("\n")[0];
}
function formatError(file, e) {
  let out = `${file}:${e.line}:${e.column} [${e.code}] ${e.message}`;
  if (e.snippet) out += "\n" + e.snippet.split("\n").map((l) => `  | ${l}`).join("\n");
  return out;
}
var THEME_CSS = `
:root{--bg:#fffcf0;--fg:#100f0f;--muted:#6f6e69}
.ondine{--ondine-bg:#fffcf0;--ondine-fg:#100f0f;--ondine-muted:#6f6e69;--ondine-surface:#f2f0e5;
--ondine-surface-alt:#e6e4d9;--ondine-accent:#205ea6;--ondine-radius:4px}
[data-theme=dark]{--bg:#100f0f;--fg:#cecdc3;--muted:#878580}
[data-theme=dark] .ondine{--ondine-bg:#100f0f;--ondine-fg:#cecdc3;--ondine-muted:#878580;
--ondine-surface:#1c1b1a;--ondine-surface-alt:#282726;--ondine-accent:#4385be}
@media (prefers-color-scheme:dark){[data-theme=auto]{--bg:#100f0f;--fg:#cecdc3;--muted:#878580}
[data-theme=auto] .ondine{--ondine-bg:#100f0f;--ondine-fg:#cecdc3;--ondine-muted:#878580;
--ondine-surface:#1c1b1a;--ondine-surface-alt:#282726;--ondine-accent:#4385be}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,sans-serif}
main{max-width:860px;margin:2rem auto;padding:0 1rem}
figure{margin:1.5rem 0;overflow-x:auto}
pre{background:rgba(127,127,127,.12);padding:.75rem;border-radius:6px;overflow-x:auto}
`;
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function buildHtml(markdown, svgs, { title, theme }) {
  const out = [];
  let i = 0;
  let fence = null;
  for (const line of markdown.split(/\r?\n/)) {
    if (fence === null) {
      const m = line.match(/^\s*(`{3,}|~{3,})\s*mermaid\s*$/i);
      if (m) {
        fence = m[1];
        continue;
      }
      out.push(line);
    } else if (line.trim().startsWith(fence) && line.trim().replace(/[`~]/g, "") === "") {
      out.push("", `\0SVG${i++}\0`, "");
      fence = null;
    }
  }
  const body = out.join("\n").split(/\n{2,}/).map((chunk) => {
    const m = chunk.trim().match(/^\u0000SVG(\d+)\u0000$/);
    if (m) return `<figure>${svgs[Number(m[1])] ?? ""}</figure>`;
    const h = chunk.match(/^(#{1,6})\s+(.*)$/);
    if (h) return `<h${h[1].length}>${escapeHtml(h[2])}</h${h[1].length}>`;
    if (/^```/.test(chunk)) return `<pre>${escapeHtml(chunk.replace(/^```.*\n?|```$/g, ""))}</pre>`;
    return chunk.trim() ? `<p>${escapeHtml(chunk.trim()).replace(/\n/g, "<br>")}</p>` : "";
  }).filter(Boolean).join("\n");
  return `<!doctype html>
<html lang="en" data-theme="${theme}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>${THEME_CSS}</style></head>
<body><main>
${body}
</main></body></html>
`;
}
function readInput(file) {
  try {
    return readFileSync(file, "utf8");
  } catch (e) {
    console.error(`amm: cannot read ${file}: ${e.message}`);
    process.exit(2);
  }
}
function runCheck(file) {
  const md = readInput(file);
  const blocks = extractMermaidBlocks(md);
  if (blocks.length === 0) {
    console.error(`${file}: no \`\`\`mermaid blocks found`);
    return 1;
  }
  const errors = blocks.map(checkBlock).filter(Boolean);
  for (const e of errors) console.error(formatError(file, e));
  if (errors.length) {
    console.error(`
${errors.length} of ${blocks.length} diagram(s) failed. Fix them and run again.`);
    return 1;
  }
  console.log(`ok: ${blocks.length} diagram(s) valid`);
  return 0;
}
function runRender(file, opts) {
  if (runCheck(file) !== 0) return 1;
  const md = readInput(file);
  const blocks = extractMermaidBlocks(md);
  const svgs = blocks.map((b, i) => render(b.code, { idPrefix: `amm-${i + 1}` }).svg);
  const stem = basename(file, extname(file));
  const outHtml = resolve(opts.out ?? join(dirname(file), `${stem}.html`));
  const svgDir = resolve(opts.svgDir ?? join(dirname(outHtml), `${stem}.svg`));
  mkdirSync(svgDir, { recursive: true });
  svgs.forEach((svg, i) => writeFileSync(join(svgDir, `diagram-${i + 1}.svg`), svg));
  writeFileSync(outHtml, buildHtml(md, svgs, { title: stem, theme: opts.theme ?? "auto" }));
  console.log(outHtml);
  console.log(svgDir);
  return 0;
}
function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const opts = { _: [] };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "-o" || a === "--out") opts.out = rest[++i];
    else if (a === "--svg-dir") opts.svgDir = rest[++i];
    else if (a === "--theme") opts.theme = rest[++i];
    else opts._.push(a);
  }
  return { cmd, opts };
}
function main(argv) {
  const { cmd, opts } = parseArgs(argv);
  const file = opts._[0];
  if (!file || !["check", "render"].includes(cmd)) {
    console.error(USAGE);
    return 2;
  }
  try {
    return cmd === "check" ? runCheck(file) : runRender(file, opts);
  } catch (err) {
    if (err instanceof MissingWasmError) {
      console.error(err.message);
      return 2;
    }
    throw err;
  }
}
var entry = process.argv[1] ? pathToFileURL(realpathSync(process.argv[1])).href : "";
if (entry === import.meta.url) process.exit(main(process.argv.slice(2)));
export {
  MissingWasmError,
  buildHtml,
  checkBlock,
  extractMermaidBlocks,
  render
};
