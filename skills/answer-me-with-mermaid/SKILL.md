---
name: answer-me-with-mermaid
description: Answer questions with standard Mermaid diagrams when structure is easier to see than to read — processes, sequences, states, relationships, hierarchies, timelines, comparisons. Diagrams are validated and rendered offline by the bundled `amm` CLI (built on Ondine) into SVG and a single-file HTML page.
---

# Answer me with Mermaid

You answer with **a short text answer plus one or more standard Mermaid diagrams**.
You never hand-write SVG or HTML. You write Mermaid; the `amm` CLI checks it and renders it.

## 1. Decide whether a diagram helps

Draw when the answer has **shape**: steps, actors talking to each other, states and
transitions, things that relate to or contain other things, events over time, or
numbers to compare.

Do **not** draw when:
- the answer is a single fact, a yes/no, a definition, or a short code fix;
- the diagram would just restate a list of 2–3 items;
- the user asked for text only.

If you are unsure, answer in text first and offer a diagram in one line.

## 2. Pick the diagram type from the shape of the question

| The question is about…                          | Use                     |
|-------------------------------------------------|-------------------------|
| How does X work / what are the steps / decisions | `flowchart`            |
| Who calls whom, in what order (requests, APIs)   | `sequenceDiagram`      |
| What states can X be in, what moves it between   | `stateDiagram-v2`      |
| How entities / tables relate                     | `erDiagram`            |
| Types, interfaces, inheritance                   | `classDiagram`         |
| Parts of a whole, a hierarchy, a topic map       | `mindmap` or `flowchart TD` |
| What happened when / roadmap / phases            | `timeline` or `gantt`  |
| Branches and merges                              | `gitGraph`             |
| Proportions of a whole                           | `pie`                  |
| Trade-offs on two axes                           | `quadrantChart`        |
| Trends or comparisons of numbers                 | `xychart-beta`         |
| Flows of quantity between stages                 | `sankey-beta`          |
| System context / containers                      | `C4Context` / `flowchart` with subgraphs |

Prefer the simplest type that fits. One clear diagram beats three busy ones.

## 3. Write the reply

Format:

1. **One to three sentences** that answer the question directly.
2. **The diagram(s)** in fenced ```` ```mermaid ```` blocks — standard Mermaid syntax only,
   so they also display on GitHub, Obsidian, and other Mermaid-aware viewers.
3. **Optional short notes** below, only for what the diagram cannot show (caveats, numbers, links).

Diagram style rules:
- Keep it under ~15 nodes. Split into several diagrams rather than cramming.
- Short labels (≤ 5 words). Put detail in the notes, not inside nodes.
- Quote labels that contain punctuation: `A["Parse (strict)"]`.
- Use the user's language for labels; keep ids ASCII (`A`, `parse`, `db`).
- No custom colors or `%%{init}%%` theme blocks — theming is handled by the renderer.

Write the whole reply to a Markdown file (e.g. `answer.md`) in a temp or output directory.

## 4. Check, fix, render — at most 2 retries

```bash
node <skill-dir>/scripts/amm.mjs check answer.md
```

- **Exit 0** → go to render.
- **Exit 1** → each error is printed as `answer.md:LINE:COL [code] message` with the
  offending snippet. Fix exactly those lines and run `check` again.
- Retry at most **2 times**. If it still fails, simplify the diagram (fewer nodes, plainer
  syntax, or a more basic diagram type). If that also fails, ship the text answer and the
  Mermaid source without rendering, and say the diagram did not validate.

Then render:

```bash
node <skill-dir>/scripts/amm.mjs render answer.md -o answer.html
```

`amm.mjs` needs `ondine.wasm` (the Ondine compiler) in the same folder; keep them together.

This writes one self-contained offline HTML file (light/dark via CSS variables, follows the
system setting by default; `--theme light|dark|auto`) and an `answer.svg/` folder with one SVG
per diagram. It prints both paths.

## 5. Deliver

Reply with the text answer, the Mermaid blocks as written, and the path to the HTML file.
Do not paste the SVG into the chat.
