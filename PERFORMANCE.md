# Performance

A number without a budget is an opinion. These are the budgets this app holds, the measurement that checks them, and
the one thing the measurement found.

## The budgets

| Asset | Budget (gzipped) | Measured | |
|---|---|---|---|
| `app.js` | 32 KB | 26.3 KB | ok |
| `index.html` | 14 KB | 11.4 KB | ok |
| `sw.js` | 2 KB | 0.5 KB | ok |
| `manifest.webmanifest` | 2 KB | 0.4 KB | ok |
| **Total** | **48 KB** | **38.7 KB** | ok |

| Metric | Budget | Measured (lab) |
|---|---|---|
| First contentful paint | 1500 ms | 496 ms |
| Largest contentful paint | 2000 ms | 496 ms |
| Cumulative layout shift | 0.1 | **0.021** |
| Worst long task | 200 ms | 136 ms |
| DOMContentLoaded | 2000 ms | 550 ms |

Checked by `scripts/perf_budget.py` (bytes, in CI) and `tests/perf-harness.html` (a real browser).

## Evidence type, stated

The browser numbers are **a single-session lab observation**, not field data. They measure this page, in this browser,
on this machine. That is enough to catch a regression and not enough to describe a user's experience. There is no RUM
here because there are no users; the day there are, this document needs a field column and not a bigger caveat.

## The finding: CLS 0.291 → 0.021

The first measurement failed the layout-shift budget by three times. The harness reported the sources, which is the only
reason it was fixable:

```
0.291 at 762 ms — DIV.grid2, DIV.ws, BUTTON#delRecord.rowaction
```

The shell paints first — by design, because awaiting IndexedDB before the first render leaves an empty screen — and then
`app.js` fills it. The content landed into a zero-height box and pushed everything below it down.

Two changes, both measured:

1. **A redundant re-render removed.** Hydration was repainting the record even when the stored state was identical to
   what was already on screen. `if (changed) renderAll()` — the comparison is a string equality on the state, which is
   cheap at this size and wrong at a thousand records, where the fix would be a version counter.
2. **The space reserved.** `#fields`, `.grid2` and `#recordList` now hold the height their content will occupy, so the
   shell does not reflow when the data arrives.

**0.291 → 0.021**, a fourteen-fold improvement, and the remaining 0.021 is the two-column grid settling once.

## What the budget forces

The app is 38.7 KB gzipped because it has no framework, no web font, no image on the critical path, and one script.
That is not restraint for its own sake — it is what makes the Android build 17 KB and the first paint under half a
second on a laptop with a cold cache.

**When a change breaches the budget, remove work.** Raising the number is the one fix this document forbids, because a
budget that moves to meet the code is a budget that measures nothing.

## What is not measured

- **No field data.** No CrUX, no RUM, no real users.
- **No throttled network.** Every number above is local, unthrottled. A 3G profile would multiply the paint times by
  roughly ten, and that number is a guess — which is why it is not in the table.
- **No low-end device.** A mid-range Android phone is the device that matters for the APK, and there is none here.
- **Interaction latency (INP)** is not measured at all. The app has no long-running interaction, but "no measurement" and
  "no problem" are different claims.
