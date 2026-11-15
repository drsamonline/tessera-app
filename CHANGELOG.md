# Changelog

## [1.25.0] - 2026-11-15

### Changed

- **The script moved to `app.js`.** 98 KB of JavaScript out of the HTML, loaded with `<script src="app.js" defer>`. It
  still works when `index.html` is opened from disk — a classic script in the same directory is not blocked the way a
  module would be.
- **`script-src` is now `'self'`.** No `unsafe-inline`. That was the one thing the review said it would not ship
  without, and it is met.

### Fixed

- **A claim I got wrong.** The CSP carried `frame-ancestors 'none'` in the meta tag and `REVIEW.md` said framing was
  closed. Chrome: *"The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a `<meta>`
  element."* It is header-only. The directive is gone, `SECURITY.md` states that clickjacking protection is unavailable
  on a static host without headers, and the review records the correction.

### Verified

Ten records render, the palette opens, the accessibility harness passes 64/64 with the stricter policy, and the console
reports **no CSP violations**.

## [1.24.0] - 2026-11-15

### Security

- **Stored XSS, fixed.** Twenty-three interpolations of record, company, deal and note data into `innerHTML` were
  unescaped. A CSV with `<img src=x onerror=...>` in a name column executed on import, in the origin holding the bearer
  token. One `esc()` helper, applied everywhere. Proven: a hostile name now renders as escaped text and no `<img>`
  element exists in the body.
- **The token no longer sits in the address bar.** It is stripped with `history.replaceState` before the connection,
  and the one outbound link gained `rel="noopener noreferrer" referrerpolicy="no-referrer"` — the `Referer` header was
  sending the token to a third party.
- **A Content-Security-Policy**, with `object-src`, `base-uri`, `form-action` and `frame-ancestors` all closed.

### Fixed

- CSV import is capped at 2 MB. A 200 MB paste froze the tab silently.

### Added

- **[REVIEW.md](REVIEW.md)** — eight findings with file and line, the failing case for each, and a ship-or-block
  verdict. Four fixed here; four accepted with reasons.

### The honest limit of the CSP

`script-src` still allows `'unsafe-inline'` because the app is one inline script. Splitting it into a file is a
build-step change, and until that happens the CSP is defence in depth behind `esc()`, not a substitute for it.

## [1.23.0] - 2026-11-15

### Added

- **`PRIVACY.md`, `TERMS.md`, `SECURITY.md`.** The app stores customer records in the browser and ships as an
  installable APK, and it had a licence and nothing else. That is the wrong order.
- The privacy document states what is stored, where, and what leaves the device: **two things, both chosen by you** —
  requests to the engine address you configure, and the sponsor link if you click it. It says plainly that the author
  receives nothing and that the organisation deploying the app is the Data Fiduciary.
- `SECURITY.md` lists the known limits up front: unencrypted browser storage, the token stored beside the data, no
  integrity check beyond the service worker, and a debug-signed APK.

### Why this release exists

A scanner run over the repository reported `LICENSE` only, with `network_call` in 7 files and `on_device_storage` in
5. Those two signals are exactly what a privacy notice has to describe, and there was no notice.

## [1.22.0] - 2026-11-15

### Added

- **Pipeline board.** Deals as columns by stage, each column carrying its count and value. A card opens the deal; the
  arrow moves it to the next stage and writes that to the system of record — `POST /v1/objects/Deal/{id}/fields/stage`
  — with an undo that writes the old stage back.
- Verified: moving *Acme renewal* from `proposal` to `negotiation` returned `negotiation` via node `hubspot`, and the
  board re-rendered as `proposal 0 · ₹0.00`, `negotiation 2 · ₹1,65,000.00`.

### Why a board and not a table

A pipeline is the one CRM screen where the shape of the data is the point: how much sits at each stage. A table sorted
by stage answers it slowly; columns answer it at a glance. It is also the first screen that writes a *Deal* field
rather than a Contact one, which is what stops the console being a contact viewer with extras.

## [1.21.0] - 2026-11-15

### Added

- **An Android APK.** `android/tessera-1.20.0-debug.apk`, 17 KB, built from source by `android/scripts/build.sh` with
  no Gradle and no Maven: `aapt2` → `javac` → `d8` → `zipalign` → `apksigner`, with a debug keystore generated on the
  spot. A JDK and the Android SDK are the only requirements.
- Verified: `apksigner verify` reports `CN=Android Debug`, the dex contains `MainActivity`, and `aapt2 dump badging`
  shows the package, the icon, the label and the launcher activity.

### What it is not

A Trusted Web Activity. A TWA hides the URL bar only when the site publishes `assetlinks.json` naming this app's
signing certificate — and a debug certificate is generated fresh on every machine, so that verification can never
pass. A WebView shell needs no verification and is honest about being a shell.

**It has never been run on a device.** There is no emulator in the environment that built it. The APK verifies, the
dex contains the activity, the manifest resolves — that is the limit of what was checked.

## [1.20.0] - 2026-11-15

### Added

- **Deals open.** Clicking a deal on the Related card shows it with the same per-field provenance a contact gets —
  `HubSpot + NetSuite · agreement` — read from `/v1/mesh/view/Deal/{id}`. `#deal/<id>` deep-links to one.
- **The company is a link.** Clicking it filters the Records list to everyone at that company.
- Verified: `#deal/018f…0001` renders *Acme renewal · proposal · ₹45,000.00 · INR · Acme Industrial*, every row sourced.

### Fixed

- **The deal sheet's element id collided with the route name.** `applyRoute` found `<div id="deal">` and treated it as a
  view, then `go("deal")` rewrote the hash and threw away the record id, so a deep link opened an empty sheet. The
  element is `#dealSheet` now.
- **A deep link resolved before the engine connected**, so the sheet said "No engine connected" on a page that was
  about to connect. The route is applied again once the connection succeeds.
- **A uuid was printed on a customer screen.** `company_ref` now renders as the company name.

## [1.19.0] - 2026-11-15

### Added

- **Tombstone.** The delete action on a record asks for a reason before it will submit, then calls
  `DELETE /v1/objects/Contact/{id}`. The record leaves the list, the reason stays on the record, and the toast says
  *tombstoned* rather than *deleted* — one of those is true.
- Verified against a standalone engine: three contacts, a delete through the sheet's exact call, `200`, list drops to
  two.

### Why the word matters

Nothing is destroyed. An append-only chain cannot un-write a hash, so "delete" here means the record stops being
served and the deletion is attributable. Calling that a delete would be the small lie that costs trust the first time
someone asks for the bytes.

### Complete CRUD

Create, read, update, delete — all four now exist against the engine, and every one of them is an event.

## [1.18.0] - 2026-11-15

### Added

- **Related.** A record now shows its company and that company's deals, with stage and value — the relational spine any
  CRM needs, read from the engine through `company_ref`.
- **Log an email.** Direction, when, subject and body, stored as an `email.logged` ledger event and shown at the top of
  the activity feed. It does not send mail: TESSERA keeps the record of the conversation, your mail client sends it.

### Fixed

- The Related card showed **"No deals for this company"** against a company that had one. The cause was in the engine's
  demo data — deals carried `company_ref` values in the old id shape, so the reference named nothing. Fixed in the
  engine at `v1.35.1`, with three referential-integrity tests.

## [1.17.0] - 2026-11-15

### Added

- **Edit any field.** A pencil on each row of the Unified view opens a sheet with the current value and where it came
  from; saving writes to the system of record and the ledger records who changed it, from what, to what. Undo is a
  compensating write, not a rollback.
- **Report.** An eighth section: contacts, open conflicts, deals and pipeline value; pipeline by stage; which system
  supplied what share of the fields; per-record completeness. Verified against a live engine — six contacts, four
  deals, ₹2,04,000.00 of pipeline.

### Fixed

- **The report's bars were invisible.** `.track` and `.fill` are `<span>` elements, and a span is inline — `height` and
  `width` did nothing, so every bar painted as a one-pixel line. `display:block` fixes it.
- **Deals were never fetched.** `loadEngineDeals()` existed but nothing called it, so the Report showed "—" for deals
  and pipeline against a connected engine that had four of them.
- The accessibility harness pointed at `index.html` from inside `tests/`, which 404'd.

## [1.16.0] - 2026-11-14

### Added

- **New customer.** A form on the Records screen that creates a record through the engine — `POST /v1/objects/Contact`
  — and lands on the new record's Unified view. With no engine it creates locally and the toast can undo it.
- **Consent, lawful basis and purpose are required and not defaulted.** A record created with an invented lawful basis
  is a compliance claim nobody made; the form asks, and the API refuses if it is not told.
- Verified end to end against `python3 -m tessera.demo --standalone`: 3 contacts, create through the form's exact
  call, 201 from the `native` node, list grows to 4.

### Why this release matters

Until now the console could only read. A CRM that cannot create a record is a viewer. This closes the gap that made
"it is a CRM too" a claim rather than a description.

## [1.15.1] - 2026-11-14

### Fixed

- **A source the console has never heard of crashed the view.** The engine returns a combined source — `hubspot+zendesk`
  — when two systems agree, and every `NODES[id]` lookup assumed one of the four known ids. Connecting to a real engine
  with three nodes threw `Cannot read properties of undefined (reading 'authority')`. All lookups now go through
  `nodeInfo()`, which synthesises an entry for an unknown or combined source instead of throwing.

### Note

Found by running `python3 -m tessera.demo` against the new three-node seed. It would not have been found against the
old single-contact demo, because that one only ever produced `hubspot` and `hubspot+zendesk` on fields the console
happened not to resolve.

## [1.15.0] - 2026-11-14

### Fixed

- **Control borders were at 1.34:1.** An outlined button on a card had a `1px` border barely distinguishable from the
  card behind it, which is a WCAG 1.4.11 failure — the boundary that identifies a control needs 3:1. A second token,
  `--line-control`, now carries every interactive boundary at **3.28:1 dark / 3.42:1 light**; `--line` stays quiet for
  decorative borders.

### Added

- **`A11Y.md`** and **`tests/a11y-harness.html`** — a real browser harness that loads the app in an iframe and runs
  eight checks: accessible names (50/50), palette focus trap (25/25 tabs stayed inside), Escape, table headers,
  heading structure, positive `tabindex`, reduced-motion block, and the contrast matrix.

### What the audit did not test, and says so

No screen reader, no 400% reflow, no axe, and the toast's `aria-live` behaviour was not verified with a reader. The
document states each of those rather than implying coverage.

## [1.14.0] - 2026-11-14

### Added

- **Notes per record.** A note is a `note.added` ledger event, not a row in a second store — so it is as durable as
  everything else, it carries an actor and a sequence number, and it appears in the chain. Retracting one appends
  `note.retracted`; the original stays, because a ledger that deletes is not a ledger.
- **Undo for a fired workflow**, on the same compensating-event pattern as resolve and assign.
- **Focus management for all three overlays.** Each one remembers where focus came from, returns it on close, and
  keeps Tab inside itself. A dialog you can tab out of strands a keyboard user behind the backdrop.

### Why notes went in the ledger

The alternative — a notes table beside the chain — is the shape that produces the question "which one is true?" six
months later. One store, one answer, and the audit trail comes free.

## [1.13.0] - 2026-11-14

### Added

- **The live view is the engine's merge, not the console's guess.** When connected, each record is loaded from
  `/v1/mesh/view/Contact/{id}` and every field shows the source the engine chose and the rule it applied —
  `HubSpot + Zendesk · agreement`, `HubSpot · authority map`. Recomputing the merge in the browser would be a second
  implementation of the same decision, which is how two answers appear.
- A blocked field renders as a conflict, because that is what the engine means by `blocked`.
- `assets/shot-engine.png` — the console reading a real engine, committed as evidence.

### Fixed

- **The selection did not follow the engine.** After connecting, `state.selected` still pointed at a demo id, so the
  Records list showed engine records and the Unified view showed a seeded one. It now points at a record that exists.
- **The canonical envelope was rendered as customer fields** — `tenant_id`, `tx_time`, `valid_from`, `purpose_id` all
  appeared as rows. The live view is filtered to the same fields the demo record shows.

## [1.12.0] - 2026-11-14

### Added

- **The console can read from a running engine.** Settings gains an address and a token; when connected the Records
  list comes from `/v1/objects/Contact` and each record from `/v1/objects/Contact/{id}`, with a chip in the bar
  showing which host it is talking to. `?engine=http://host:port&token=…` connects on load.
- The engine is registered as a source node, so a field it resolved shows provenance like any other.

### Fixed

- **`go()` discarded the query string.** `history.replaceState` was called with the hash alone, so any link opened
  with parameters lost them the first time anything navigated.
- **`loadState()` had no deadline.** A storage engine that never answers — a private window, a blocked origin, a
  wedged profile — hung the boot forever. It now falls back to the localStorage mirror after 1.5s.

### Why this matters more than the last four releases

Everything before this read seeded data. This is the first time the console has read a record that a real engine
produced, over HTTP, with a bearer token and a CORS allowlist. It is the difference between a demo and a client.

## [1.11.0] - 2026-11-14

### Added

- **Persistent storage request.** `navigator.storage.persist()` is asked once, when Settings is opened — never at
  boot. Without it the browser may evict the workspace under pressure and the user blames the app.
- **Update prompt.** When a new service worker installs while one already controls the page, a bar says so and offers
  Reload, instead of swapping the code under a half-finished edit.
- **Deadlines on every storage API.** A permission prompt with no UI, a private window or an embedded webview can
  leave a promise that never settles; the panel now says it could not find out rather than "Checking…" forever.

### Fixed

- **The ledger no longer blocks boot.** It was awaited after hydration, so a stalled `crypto.subtle` or a slow
  IndexedDB left the whole app on the "Building the chain…" state. It is now kicked off at first paint and renders
  itself when ready.
- **Deep links resolve on the first paint.** The route used to be applied after storage hydration, so opening
  `#ledger` showed the default view for as long as the storage layer took.
- **The five seed events are hashed at build time** and embedded, so the chain is on screen immediately. Reset still
  rebuilds from scratch and Verify always recomputes — the embedded hashes are a cache, not a claim.

### A note on the harness

`crypto.subtle` and `navigator.storage` do not settle reliably under Chromium's `--virtual-time-budget`. Three
separate "bugs" this session turned out to be the harness, and one did not. The rule adopted: a headless DOM dump is
evidence, not proof — screenshot the thing before believing it.

## [1.10.0] - 2026-11-14

### Added

- **A durable outbox.** Every mutation now writes an intent to the outbox first and then drains it into the ledger.
  Intents live in IndexedDB, so a tab killed mid-write replays on the next boot; ids make the replay idempotent.
  Seventeen call sites moved from `appendEvent` to `enqueue`.
- **Queue chip** in the bar, showing how many writes are waiting, and the count in the storage report.

### What this is not

There is no server, so this is not network sync. It is the half of the pattern that can be honest here: the write
survives the process. The engine's `tessera/mobile.py` has the other half — Lamport clocks and replica merge — and
porting it needs a backend to merge against.

### Note for anyone re-running the DOM check

The ledger is built with `crypto.subtle`, so a headless dump needs a budget of about ten seconds. At eight it
sometimes catches the "Building the chain…" state.

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
