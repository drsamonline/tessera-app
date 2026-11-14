# Changelog

## [1.9.1] - 2026-11-14

### Fixed

- **Boot no longer waits on storage.** `await loadState()` ran before the first render, so the app showed an empty
  shell for however long IndexedDB took — and forever in a private window, where it is blocked. It now paints from
  the in-memory defaults, then hydrates and re-renders. Verified at a 2-second budget: ten records visible.
- The ledger table shows "Building the chain…" instead of an empty body while the chain is hashed.

Found by a DOM dump that returned `records: 0` — the test was flaky because the app genuinely was.

## [1.9.0] - 2026-11-14

### Added

- **IndexedDB storage.** The state document is written to IndexedDB and mirrored to `localStorage`. The mirror keeps
  every call site synchronous and the UI instant; IndexedDB is the copy that survives the 5 MB ceiling and an
  eviction of the small store. On first boot an existing `localStorage` document is migrated across.
- **Workspace backup.** Settings gains **Download** and **Restore**: one JSON file containing your resolutions,
  standing rules, imported records and the ledger. Restoring is undoable.
- **Live storage report.** Backend, bytes used, quota, record count and ledger length, read from
  `navigator.storage.estimate()` rather than estimated by hand.

### Measured

`Backend: IndexedDB + localStorage mirror · Used: 72 KB of 10240 MB available · Records: 10 · ledger events: 5`

## [1.8.0] - 2026-11-14

### Added

- **Print.** A `@media print` stylesheet that overrides the **design tokens** rather than every rule — the cards keep
  their own background, and a dark card on white paper is unreadable. The output is the record with provenance under
  every value, unresolved conflicts marked, the chain head in the header, then the activity on a second page.
  A sample is committed at `assets/one-pager.pdf`.
- **Share target.** The manifest registers the app as an OS share destination; shared text or a URL lands in the
  search box on open.

### Note on the first attempt

The first print stylesheet set `body { background: #fff }` and left the cards dark, so the whole record printed
dark-on-dark. Rendering the PDF and looking at it caught it in one pass; nothing about the CSS looked wrong.

## [1.7.0] - 2026-11-14

### Added

- **Command palette.** `⌘K` or `Ctrl+K` opens one input over twelve actions and every customer. Arrow keys move,
  Enter runs, Escape closes. `#command` opens it directly.
- **Assign to me.** One tap assigns the waiting task to the first human position and logs a `task.assigned` event
  with the actor set to `human`, not `system`.
- **Undo for assign and escalate.** Assigning is undoable, and so is escalating — withdrawing an escalation writes
  `task.escalation_withdrawn` and clears the packet.

### Measured

The app is **80 KB raw, 20 KB gzipped**, up from 43 KB. The enhancements list flagged the trend; at 20 KB over the
wire it is a watch item, not a problem, and splitting the file would break opening `index.html` from disk.

## [1.6.0] - 2026-11-14

### Added

- **Connector strip.** Above every record: each system with its last sync, error count and staleness, coloured green,
  amber or red. One row, and it is the row an operator actually looks at first.
- **Saved resolver rules.** **Always** on any candidate turns a repeated decision into a standing rule, applied to
  every record, listed on the Resolve screen with a Remove button, and written to the ledger as `rule.saved`.
  Precedence is: a choice for this record, then your rule, then the engine's.

### Changed

- The record actions (All records, Export, Copy link) moved to their own row; they were crowding the subtitle.

## [1.5.0] - 2026-11-14

### Added

- **Conflict preview.** Every candidate on the Resolve screen is marked **current** or **changes**, so the button
  that would do nothing says so. The rule and both trust scores were already there; this is the part that turns a
  guess into a decision.
- **CSV import with a dry run.** Paste a CSV or choose a file; columns are auto-mapped from a header alias table and
  can be corrected; the preview counts ready and rejected rows and shows the first few of each; nothing is written
  until **Import**, and the toast offers a one-press rollback that removes the records and keeps the events.
- `#records/import` opens the sheet directly.

### Fixed

- `[hidden]` was losing to `.btn { display: inline-flex }`, so a button marked hidden rendered anyway. Caught by
  screenshotting the sheet. One `[hidden] { display: none !important }` fixes the whole class of it.
- Disabled buttons had no disabled appearance.

## [1.4.0] - 2026-11-14

### Added

- **Saved views.** Filter the list by conflicts or agreement, sort by name, health or conflict count, and save the
  combination under a name. Saved views live in `localStorage` and restore from the dropdown.
- **Export.** The unified record downloads as JSON with full provenance, or as CSV for a spreadsheet. Both write a
  `record.exported` event, because an export is an action.
- **Deep links.** `#unified/c4` opens that customer, `#records` opens the list, and a **Copy link** button puts the
  current one on the clipboard. The hash updates as you move.

### Fixed

- The mobile toolbar took four rows and put "Save view" above the field it saves. The `.search` order rule was
  scoped to the card header and the toolbar now fits three compact rows.

## [1.3.0] - 2026-11-14

### Added

- **Bulk resolve.** One button applies the engine's own rule to every open conflict on a record, as a single
  ledger event, and tells you how many it took.
- **Undo.** Resolving a field, or all of them, shows an Undo button in the toast for nine seconds. Undo writes a
  **compensating event** - `conflict.reopened` - and restores the previous state. The original choice stays in the
  chain, because a ledger that deletes is not a ledger.

### Why undo matters here

Every other tool in this category implements undo as a state rollback. In an append-only ledger the honest version
is a new event that reverses the old one, which is also the version that survives an audit. The app now demonstrates
that rather than describing it.

## [1.2.0] - 2026-11-14

### Added

- **Records.** Ten customers, one row each, with the number of disagreeing systems and a relationship-health
  score. `/` searches by name, company or email; Enter opens the first match; clicking a row loads it into the
  Unified view.
- Per-record resolutions. A choice made on one customer no longer applies to another.
- The record header, health chip and activity feed follow the selection.
- The rail and the bottom bar gain a seventh section; keyboard **1–7** switches.

### Changed

- `.nm` on a list row is a block, so a name and a role no longer run together on a phone.
- On a phone the card header wraps and the search field takes a full-width row.

## [1.1.0] - 2026-11-14

### Added

- **Field history.** Click any value on the Unified screen and a sheet opens with every ledger event that
  touched that field: sequence, actor, the value written, and the hash prefix. It is a bottom sheet on a phone and
  a centred dialog on a laptop, closed with Escape or the backdrop.

### Changed

- The app is served from the repository root. There is one landing page, in the engine repository, and it carries
  the link; this repository is the app.

## [1.0.0] - 2026-11-14

### Added

- The console: a single-file, dependency-free app for the TESSERA reference core, with six sections — Unified,
  Resolve, Ledger, Workforce, Automate, Settings.
- Field-level merge with an authority map, trust tiebreak and per-field provenance, ported from `tessera/conflict.py`.
- In-browser SHA-256 chain verification with a deliberate tamper button, ported from `tessera/ledger.py`.
- Weighted routing with a printed term-by-term breakdown, ported from `tessera/routing.py`.
- The agent-proposal gate: a workflow authored by an agent cannot run until approved, from `tessera/automation.py`.
- Installable PWA: manifest, service worker, offline after first load, state in `localStorage`.
- Responsive from 320px to 1440px: a left rail becomes a bottom tab bar, rows collapse to label, value, provenance.
- Both themes measured at WCAG AA contrast; 44px touch targets; keyboard shortcuts 1–6 and T; reduced-motion honoured.
- Landing page, README with badges and screenshots, `ENHANCEMENTS.md`, `BUILDING.md`, PolyForm Noncommercial licence.

### Changed

- The app is served from the repository root, not from `app/`. One URL, no separate landing page: the engine
  repository already has the landing page and it is the one that should carry the link.

### Notes

- The demo data is invented. No real person, company or tenant is described.
- The console is a demonstration of behaviour, not a product: no server, no database, no auth, no live connectors.
