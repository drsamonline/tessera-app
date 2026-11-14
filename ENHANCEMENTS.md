# Enhancements

Three lists and one rule: **nothing gets added that makes the first screen slower to understand.**
Every item below is judged against that, and the ones that fail it are in the last section rather than the first.

---

## 1. Make it more useful

Ordered by what a person would notice first.

| # | Enhancement | Why it matters | Effort |
|---|---|---|---|
| 1 | **Real record search** — a `/` search over all records with keyboard selection | The unified view is one record; a CRM is ten thousand. Without search it is a demo, not a tool | M |
| 2 | **Multi-record list with saved views** — filter, sort, save, restore | Turns the console from a showcase into something you would open on a Monday | M |
| 3 | **Bulk resolve** — apply one rule to every conflict of the same kind | Resolving thirty emails one at a time is where adoption dies | S |
| 4 | **Field history popover** — click any value, see every write with actor and time | The ledger is the differentiator; hiding it behind a tab wastes it | S |
| 5 | **Conflict preview before merge** — a diff of what changes if you accept a rule | Turns a guess into a decision | S |
| 6 | **Connector status strip** — per system: last sync, error count, staleness | The one screen an operator actually needs at 9am | S |
| 7 | **CSV import with dry run** — map, preview, commit, roll back | The single most requested feature of every CRM migration | M |
| 8 | **Saved resolver rules** — "always take NetSuite for amounts" as a stored policy | Repeated decisions should become policy, not habit | M |
| 9 | **Export the unified record** — JSON, CSV, and a printable one-pager | People need to send the record to somebody who is not in the app | S |
| 10 | **Keyboard-first command palette** — `⌘K` with actions, not just navigation | The power users are the ones who will keep it open | S |
| 11 | **Deep links** — `#unified/contact/123` opens that record | Makes the app shareable in Slack, which is how tools spread | S |
| 12 | **Notes and mentions** — a comment thread per record, stored locally | A record without a conversation is a report | M |
| 13 | **Assign to me** — a one-tap self-assign that logs a ledger event | The most common action in any support tool | S |
| 14 | **Undo everywhere** — a 10-second undo on every mutation, as a new event | Undo by compensating event is the ledger's superpower and nothing uses it | M |
| 15 | **Mobile share target** — register as a share target so a contact can be pasted in | The only way a phone app gets used | S |

**S = hours, M = a day or two, L = a week.** Nothing here adds a dependency.

---

## 2. Make it more offline

The console already runs with the network off. These make "offline" mean *useful on a train*, not *loads without
a network*.

| # | Enhancement | Why it matters | Effort |
|---|---|---|---|
| 1 | **IndexedDB instead of localStorage** | localStorage is 5 MB and synchronous; IndexedDB is neither. This is the gate for everything below | M |
| 2 | **Background sync** — queue writes in the outbox, replay on reconnect | The pattern is already written in the engine (`tessera/mobile.py`); port it | M |
| 3 | **Conflict-free local edits** — Lamport clock + replica id, exactly as `tessera/sync.py` | Two tabs editing one record currently last-write-wins silently | M |
| 4 | **Offline attachments** — store files in IndexedDB with a size cap and an eviction policy | Notes with a screenshot are the reason people keep a CRM open | M |
| 5 | **Precache the whole app on install, not on first visit** | `install` already does this; verify it on a cold, offline start | S |
| 6 | **Update prompt** — "a new version is ready, reload" instead of silent staleness | Silent staleness is how a PWA loses trust | S |
| 7 | **Storage persistence request** — `navigator.storage.persist()` | Without it the browser can evict the data and the user blames the app | S |
| 8 | **Export / import a workspace as one file** | The only real backup a browser app can offer | S |
| 9 | **Read-only offline mode** — a clear banner when a write cannot be queued | Honest beats silently broken | S |
| 10 | **Service worker versioning with rollback** | One bad deploy should not brick an installed app | M |

---

## 3. Make it faster

Measured, not guessed. Current payload is one HTML file of ~43 KB with no external requests.

| # | Enhancement | Why it matters | Effort |
|---|---|---|---|
| 1 | **Split the HTML into shell + views, lazy-loaded** | 43 KB is fine; 400 KB will not be. Do it before it hurts | M |
| 2 | **Virtualise the ledger table** | It renders every row today. At 10,000 events it will not | M |
| 3 | **Incremental chain verification** — verify from the last checkpoint, not genesis | O(n) per press today; the engine already does anchored verification | M |
| 4 | **Web Worker for hashing** | `crypto.subtle` is async but the canonical JSON serialisation is not; move both off the main thread | S |
| 5 | **Precompute canonical JSON once per event** | It is serialised twice today: once to hash, once to render | S |
| 6 | **`content-visibility: auto` on long panels** | Free win on the activity and ledger lists | S |
| 7 | **Debounce the density/theme re-render** | Toggling density rebuilds every row; it should patch the root attribute only | S |
| 8 | **Ship the icon as SVG only** | Two PNGs are 15 KB for a logo that is four rectangles | S |
| 9 | **Budget in CI** — fail the build over 60 KB gzipped | A budget that is not enforced is a wish | S |
| 10 | **Measure with `performance.mark` and show it in Settings** | If the app cannot report its own timings, the numbers are folklore | S |

---

## 4. Exhaustive function list — what exists, and what to add without bloat

### What the console does today

| Area | Functions |
|---|---|
| Unified view | 8 fields with provenance, per-field rule, conflict flags, relationship-health chip, activity timeline |
| Resolve | Conflict list, both values, both trust scores, the deciding rule, per-field choice, ledger event on resolve |
| Ledger | Seeded chain, append on every mutation, in-browser SHA-256 verification, single-event tamper demo, reset |
| Workforce | Three seats with human/agent occupants, weighted routing with a printed breakdown, assign, escalate with a signed packet |
| Automate | Two workflows, one approved and one proposal, condition evaluation against the live record, fire with an audit event, enable/disable |
| Shell | Section navigation (rail + bottom tabs), theme, density, keyboard shortcuts 1–6 and T, toast feedback, localStorage persistence, service worker |

### What to add — and it must earn its place

| Addition | Earns its place because | Bloat risk |
|---|---|---|
| Record list + search | Without it there is one record and nothing to search | None |
| Field history popover | Reuses the ledger that already exists | None |
| Bulk resolve | Reduces the most repeated action | Low |
| Undo as a compensating event | Same mechanism as resolve; no new state | None |
| Export JSON / CSV / print | Two functions, no dependency | None |
| Connector status strip | One row of data, high signal | None |
| Command palette | One dialog, reuses existing actions | Low |
| Saved resolver rules | Policy as data, not code | Medium |
| Notes per record | Needs storage, editing, and a decision about threads | **Medium** |
| Attachments | Needs IndexedDB, quotas, eviction | **High** |
| Multi-workspace | Needs a switcher, scoping, and a migration | **High** |
| Real-time collaboration | Needs a server, which is the thing this app does not have | **Very high** |

### Deliberately not adding

- **A chart library.** Two numbers and a timeline do not need one.
- **A component framework.** The whole point is that this is one file with no build step.
- **A settings page with twelve toggles.** Two preferences is a decision; twelve is a surrender.
- **An onboarding tour.** The first screen should explain itself; if it needs a tour, fix the screen.
- **Dark-pattern growth features.** No newsletter modal, no cookie banner, no "rate us".

---

## How to read this list

The first three tables are ordered by *what a person notices first*, not by effort. If you are going to build one
thing, build **record search with a list** — everything else is a refinement of a single-record demo until that
exists.
