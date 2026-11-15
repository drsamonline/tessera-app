# Privacy

Version: 1.0
Effective: 15 November 2026
Owner: Dr Sohil Momin — sohilmomin2000@gmail.com
Changes: Initial version.

## What this app is

TESSERA console is a single HTML file that runs in your browser. It has no account system, no analytics, no
telemetry, no crash reporting and no tracking of any kind. There is no server belonging to the author that it talks to.

It is a tool for looking at customer records. Whether that makes you a Data Fiduciary under the Digital Personal Data
Protection Act, 2023 depends on what you put in it — see *Who is responsible* below.

## What it stores on your device

| What | Where | Why |
|---|---|---|
| Resolutions, standing rules, imported rows, saved views, engine address and token | This browser's IndexedDB, mirrored to `localStorage` under the key `tessera.console.v1` | So the app works when reopened, and survives a reload |
| The ledger — one event per action you take | The same stores, and inside `state.ledger` | The chain is the product's record of what happened |
| The application shell | The service worker cache | So the app opens without a network |

None of it is transmitted to the author. **Settings → Download** writes all of it to one JSON file on your device;
**Restore** reads it back. Clearing site data erases it, and the demo ledger is rebuilt from code on the next load.

## What leaves your device

Only two things, and you control both.

1. **Requests to the engine you configure.** If you enter an engine address in Settings — or open a link containing
   `?engine=` — the app sends your records and your changes to that address, with the bearer token you supplied. The
   default in the demo is `127.0.0.1`, your own machine. The author operates no engine and receives nothing.
2. **Opening a link.** The only outbound link in the app is the sponsor link in Settings. Following it takes you to a
   service with its own privacy policy.

The Android build loads `https://drsamonline.github.io/tessera-app/` and then behaves exactly as above.

## Who is responsible

The author does not receive your data and cannot access it. **The organisation that deploys this app decides what is
in it**, and that organisation is the Data Fiduciary for those records.

If you are using it to hold records about real people, the obligations in the Act fall on you: a lawful basis per
record, notice to the person, accuracy, security, retention and erasure, and a way for them to exercise their rights
under sections 11 to 14. The app is built to help with several of these — every record carries a consent state, a
lawful basis and a purpose, and a deletion requires a stated reason and is recorded rather than erased — but software
does not discharge an obligation.

## Your rights, if the author held your data

The author holds none. If your data is in an instance run by an organisation, ask that organisation. If you are not
satisfied with their answer, the Act provides for a complaint to the Data Protection Board of India.

## Children

The app is a business tool and is not directed at children. It has no feature that creates an account, and it does not
knowingly process children's data; if an organisation stores such data in it, section 9 and the Rules apply to that
organisation.

## Changes

If a future version adds a network call to anything other than the engine you configure, this document changes in the
same commit. The claim above — one destination, chosen by you — is checkable: `grep -n "fetch(" index.html` lists
every request the app can make.

## What a lawyer must confirm before this is published

- Whether the deployment model (a static file the user hosts, or the GitHub Pages copy) makes the author a Data
  Processor in any scenario.
- Whether the sponsor link constitutes advertising requiring a disclosure under the Consumer Protection Act, 2019.
- The exact Rule number for breach intimation under the DPDP Rules, 2025 — see the engine's `PRIVACY.md`, where the
  same question is flagged rather than guessed.

This document is a draft, not legal advice.
