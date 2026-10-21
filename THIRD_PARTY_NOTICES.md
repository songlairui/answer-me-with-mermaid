# Third-party notices

answer-me-with-mermaid builds on the following projects. Their license texts are
reproduced below as required by their licenses.

The bundled CLI `skills/answer-me-with-mermaid/scripts/amm.mjs` **includes Ondine's
JavaScript** (compiled in by esbuild), and `skills/answer-me-with-mermaid/scripts/ondine.wasm`
**is Ondine's WebAssembly compiler**, copied unmodified from the `ondine` npm package by
`npm run build` (it is not committed to this repository). The
Ondine notice below applies to both files.

---

## answer-me-with-html

- Project: https://github.com/QingYunA/answer-me-with-html
- Use: inspiration and overall design (agent skill + bundled offline renderer CLI +
  validate-and-retry loop). No code or prompt text is copied.
- License: MIT

```
MIT License

Copyright (c) 2026 Answer me with HTML contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Ondine

- Project: https://github.com/wevm/ondine — https://ondine.sh — npm `ondine`
- Use: Mermaid parsing, validation, and SVG rendering; JS bundled into `amm.mjs`,
  compiler shipped as `ondine.wasm`.
- License: MIT. The upstream LICENSE names no copyright holder after the year; it is
  reproduced verbatim below. The project is published by wevm (https://github.com/wevm).

```
MIT License

Copyright (c) 2025-present 

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
