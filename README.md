<div align="center">

<img src="assets/icon.svg" width="88" height="88" alt="TESSERA">

# TESSERA console

**One customer view across every system, with a record you can prove.**

A working, offline, installable console for the [TESSERA reference core](https://github.com/drsamonline/tessera) —
field-level merge, conflict resolution, a hash-chained ledger, seat-based routing and the agent-proposal gate,
all running in your browser with no server and no dependencies.

<a href="https://drsamonline.github.io/tessera-app/"><img alt="Open the live app" src="https://img.shields.io/badge/▶%20open%20the%20console-live%20demo-d9a441?style=for-the-badge"></a>

<img alt="Status" src="https://img.shields.io/badge/status-working%20demo-1F3552">
<img alt="Offline" src="https://img.shields.io/badge/offline-yes-3FB950">
<img alt="Dependencies" src="https://img.shields.io/badge/dependencies-none-3FB950">
<img alt="Installable" src="https://img.shields.io/badge/PWA-installable-5FB3AC">
<img alt="Licence" src="https://img.shields.io/badge/licence-PolyForm%20Noncommercial%201.0.0-8A6416">
<img alt="Size" src="https://img.shields.io/badge/payload-one%20HTML%20file-1F3552">

[**Open the console**](https://drsamonline.github.io/tessera-app/) ·
[The console, live](https://drsamonline.github.io/tessera-app/) ·
[The engine](https://github.com/drsamonline/tessera) ·
[Enhancements](ENHANCEMENTS.md) ·
[Building APK / EXE](BUILDING.md)

</div>

---

<img src="assets/shot-desktop.png" alt="The console: one customer record with provenance on every field and three conflicts flagged" width="100%">

## What you are looking at

Four systems hold a slice of the same customer and they disagree. This console merges them **field by field**,
shows **where every value came from**, and records the whole thing in a hash chain you can verify in the page.

| Screen | What it does |
|---|---|
| **Records** | Ten customers, one row each. `/` searches, filter by conflicts, sort by health, save the view you use every morning, and **import a CSV** with a dry run and a one-press rollback. |
| **Unified** | One record. Every field names the system it came from and the rule that chose it. Click any value for its write history; export the record as JSON or CSV; copy a link that opens it. |
| **Resolve** | Both values, both trust scores, the rule the engine would apply, and whether each candidate is the **current** value or a **change**. Choose one, or resolve all. Every choice is logged and undoable. |
| **Ledger** | Every event, SHA-256 chained. **Verify chain** recomputes it locally. **Tamper** proves the verification works. An undo is a new event, never a deleted one. |
| **Workforce** | Work goes to a position, not a person. The router shows its term-by-term arithmetic. Escalation produces a signed handoff packet. |
| **Automate** | A workflow written by an agent is a proposal. The run button is disabled until a person approves it. |
| **Settings** | Theme and density, stored on this device. Nothing leaves the browser. |

<img src="assets/shot-records.png" alt="The records list: ten customers with their conflict counts and relationship health" width="100%">

<div align="center">
<img src="assets/shot-mobile.png" width="270" alt="The console on a phone">
&nbsp;&nbsp;&nbsp;
<img src="assets/shot-conflicts.png" width="520" alt="The Resolve screen">
</div>

## Why it exists

The [engine repository](https://github.com/drsamonline/tessera) is 45 documents and 709 tests of specification and
Python. That is the right artefact for an engineer and the wrong one for anybody deciding whether the idea is
worth an afternoon. This console is the answer to "show me".

Everything on screen is the engine's logic, ported and running client-side:

| Behaviour | Where it comes from |
|---|---|
| Field-level merge with an authority map | `tessera/conflict.py` |
| Trust, then node id, as the tiebreak | `tessera/conflict.py` |
| Weighted routing with a printed breakdown | `tessera/routing.py` |
| SHA-256 chain with sequence and previous hash | `tessera/ledger.py` |
| A proposal cannot run until a human approves | `tessera/automation.py` |

## Run it

```bash
# in place — no build step, no install
open app/index.html

# or over any static server
python3 -m http.server 8000        # then http://localhost:8000/

# or install it
# open /the root in Chrome or Edge → "Install TESSERA" in the address bar
```

Installed, it runs with the network switched off. The service worker caches the shell; the state lives in
`localStorage`; the ledger is rebuilt locally if you clear site data.

## Properties

| | |
|---|---|
| Dependencies | **none** — no framework, no bundler, no build |
| Payload | one HTML file (~43 KB) plus a service worker and an icon |
| Contrast | every text pair measured at **≥ 4.5:1** in both themes |
| Touch targets | **44px** minimum; the rail becomes a bottom bar under 860px |
| Keyboard | **1–7** switch sections, **/** searches, **T** toggles theme, full focus rings |
| Deep links | `#unified/c4` opens that customer; `#records` opens the list |
| Motion | honours `prefers-reduced-motion` |
| Network | none after first load; no analytics, no fonts, no CDN |

## What this is not

- **Not connected to your systems.** The console runs on seeded data. The real connectors exist in the engine and
  have never touched a live tenant — that gap is documented there, not hidden here.
- **Not a backend.** No server, no database, no auth. It demonstrates behaviour so you can judge it before
  reading 45 documents.
- **Not audited.** Hashing is Web Crypto. Do not put real customer data in it.

## Building binaries

An installable PWA covers desktop and Android today. Native wrappers are a packaging step, not a rewrite:

- **Android APK** — a Trusted Web Activity over the hosted URL, or a Capacitor wrap of this folder.
- **Windows / macOS / Linux** — Tauri or Electron around `app/`.
- **Single-file HTML** — already is one; `index.html` opens from disk.

Step-by-step, with the trade-offs: [BUILDING.md](BUILDING.md).

## Enhancements

The exhaustive list of what would make this more useful, more offline and faster — and what to add without
bloating it — is in [ENHANCEMENTS.md](ENHANCEMENTS.md).

## Attribution

| | |
|---|---|
| **Author** | Dr Sohil Momin — [github.com/drsamonline](https://github.com/drsamonline) |
| **Engine** | [drsamonline/tessera](https://github.com/drsamonline/tessera) — specification and reference core |
| **Licence** | [PolyForm Noncommercial 1.0.0](LICENSE) — commercial use requires a licence |
| **Typeface** | system UI fonts only; no webfonts are loaded or redistributed |
| **Icons** | drawn for this project as inline SVG; no icon library is bundled |
| **Hashing** | Web Crypto `SHA-256`, a browser standard, no third-party code |

No third-party code, fonts, images or data are included. The demo record, the activity feed and the seats are
invented for the demonstration and describe no real person or company.

## Sponsor

This is unfunded work. If it saved you an afternoon:

- [ko-fi.com/matneo](https://ko-fi.com/matneo)
- [GitHub Sponsors](https://github.com/sponsors/drsamonline)

Commercial use, white-labelling or a support agreement: open an issue and say what you need.

---

<div align="center">
<sub>PolyForm Noncommercial 1.0.0 · built by Dr Sohil Momin · <a href="https://drsamonline.github.io/tessera-app/">open the console</a></sub>
</div>
