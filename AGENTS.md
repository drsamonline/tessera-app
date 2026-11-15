# AGENTS.md

Instructions for an AI coding agent working in this repository. Read this, then only the files a task names.
Everything here is normative.

## What this is

One HTML file, one script, one service worker, one Android shell. No framework, no build step, no bundler. The app is
`index.html` + `app.js`; everything else is evidence, paperwork or packaging.

| Path | What it is | Edit it? |
|---|---|---|
| `index.html` | Markup and CSS, with the design tokens in `:root` | yes |
| `app.js` | All the behaviour, 2,342 lines | yes |
| `sw.js` | The offline shell | yes, and bump `CACHE` when you do |
| `tests/` | Two harnesses that run in a real browser | yes |
| `scripts/check_app.py` | Eight static gates | yes |
| `android/` | The APK source and its build script | yes |
| `REVIEW.md`, `A11Y.md`, `PERFORMANCE.md`, `DESIGN-REVIEW.md`, `PRIVACY.md`, `SECURITY.md` | Findings and paperwork | only when the finding changes |
| `assets/shot-*.png` | Screenshots referenced by the README | re-shoot, do not hand-edit |

## The verification gate

**No claim of done, fixed, passing or shipped without a command run after the last edit, and its output read.**

```bash
node --check app.js                 # it parses
python3 scripts/check_app.py        # 8 static gates: escaping, CSP, shell, manifest, limits
python3 scripts/perf_budget.py      # 48 KB gzipped, total
```

And in a browser, because two of the harnesses cannot run anywhere else:

```
tests/a11y-harness.html    → 64/64 accessible names, focus trap, headings
tests/perf-harness.html    → FCP, LCP, CLS, long tasks, with shift sources
```

Serve the directory first (`python3 -m http.server 8080`), then open the harness page. Both report PASS/FAIL lines and
exit non-zero in CI on any FAIL.

**A check you have not seen fail is not a check.** When you add one, break the thing on purpose and confirm it fails.
`scripts/check_app.py` was verified against a copy with `esc()` reverted — it named the interpolation and exited 1.

## The rules that keep this honest

1. **Escape at the boundary.** Every value from a record, an engine or a file goes through `esc()` before it reaches
   `innerHTML`. The first pass at this missed 64 sites because it grepped for the pattern already known; the checker
   now walks template literals instead.
2. **One source per decision.** The engine's merge is displayed, not recomputed. A second implementation of the same
   rule is how two screens show two answers.
3. **The ledger is the store.** Notes, emails, resolutions and tombstones are events. Nothing gets a second table, and
   nothing is deleted — it is retracted by a compensating event with a stated reason.
4. **Measure before claiming.** `PERFORMANCE.md` has budgets; a breach is fixed by removing work, not by raising the
   number. The browser numbers are a single-session lab observation, and the document says so.
5. **A document that describes a repository you cannot see is wrong.** Three documents in this project described a
   system that no longer existed. Check the code, then fix the document in the same commit.

## Writing rules

- Lead with the finding, then support it.
- No hype adjectives within a sentence of a number.
- Quote the weak string and rewrite it on the same line; do not describe it.
- State what is not verified in the table where the verified things are, not in a footnote.

## When a task is not scoped

Say so. This repository has a fixed shape — one page, no framework, no build — and a task that requires a bundler, a
component library or a server-side render is a task that has not decided what it wants yet.
