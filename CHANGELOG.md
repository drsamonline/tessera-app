# Changelog

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
