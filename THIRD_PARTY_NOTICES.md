# Third-party notices — @sdcorejs/nova

This package does not bundle or vendor third-party source code. Upstream
projects are either installed by npm as declared dependencies, or used only as a
design/API reference. Copied or adapted files, if any are added later, must be
listed in `third_party/provenance.json` with a pinned upstream commit and carry a
`@nova-provenance: <id>` marker (enforced by `scripts/check-provenance.mjs`).

Copied or adapted upstream files in this version: **none**.

- shadcn/ui (https://github.com/shadcn-ui/ui, MIT) — visual and API reference only; no shadcn/ui code or Tailwind class lists were copied.

## @base-ui/react

- Role: the only runtime dependency (`~1.8.0`, locked at 1.8.0), installed by npm, not bundled.
- License: MIT — https://github.com/mui/base-ui
- Copyright notice and permission notice, from `@base-ui/react@1.8.0/LICENSE`:

```text
MIT License

Copyright (c) 2019 Material-UI SAS

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

### Transitive runtime dependencies of @base-ui/react

Read from `package-lock.json` / installed `package.json` files on 2026-10-08
(`npm ls --omit=dev --all`); all are installed by npm under their own licenses:

| Package | Version | License |
|---|---|---|
| @base-ui/utils | 0.4.0 | MIT |
| @babel/runtime | 7.29.10 | MIT |
| @floating-ui/core | 1.8.0 | MIT |
| @floating-ui/dom | 1.8.0 | MIT |
| @floating-ui/react-dom | 2.1.9 | MIT |
| @floating-ui/utils | 0.2.12 | MIT |
| reselect | 5.3.0 | MIT |
| use-sync-external-store | 1.7.0 | MIT |

`react` and `react-dom` are peer dependencies supplied by the consuming
application. `date-fns` and `@date-fns/tz` are optional peers of Base UI that
Nova does not use or install. A full dependency license audit remains a
release gate (not performed here).
