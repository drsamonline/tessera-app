# Security Policy

Version: 1.0
Effective: 15 November 2026

## Supported versions

| Version | Supported |
|---|---|
| 1.19 and later | yes |
| earlier | no — upgrade; the earlier builds had no CSP and no focus management |

## Reporting a vulnerability

**Do not open a public issue.**

Report privately to **sohilmomin2000@gmail.com**, or through a GitHub private security advisory on this repository.

Please include what you did, what happened, what you expected, and the version (shown in `VERSION` and in Settings).

## What to expect

| Stage | Target |
|---|---|
| Acknowledgement | 48 hours |
| Initial assessment | 7 days |
| Fix for a critical issue | 30 days |
| Public disclosure | coordinated with you, after a fix ships |

These are targets, not a service commitment. This is a single-maintainer project.

## What is in scope

- The app in this repository, as distributed: `index.html`, `sw.js`, `manifest.webmanifest`, and the Android build
  under `android/`.
- Anything that lets one origin read another's data through the app, escapes the bearer token handling, or writes to
  an engine the user did not configure.

## What is out of scope

- **The demo data.** It is seeded in the source and is not personal data.
- **The engine.** It has its own policy at `drsamonline/tessera`.
- **GitHub Pages, and the browser.** Their security is theirs.
- **A device that is already compromised**, or an attacker with access to the unlocked device — the app stores its
  state in browser storage, unencrypted, because a browser is not a vault.
- **Volume-based denial of service.**

## Known limits, stated rather than discovered

| Limit | Consequence |
|---|---|
| State is stored unencrypted in IndexedDB and `localStorage` | Anyone with access to the browser profile can read it. Use a device you control |
| The bearer token is stored beside the data | Same exposure. It is scoped to the engine you configured |
| No integrity check on the cached shell beyond the service worker's own | A compromised host serves a compromised app |
| The Android build is debug-signed | It is for sideloading, not for distribution through a store |

## Testing rules

Test against your own instance and your own data. Do not access, modify or retain another person's data. If you
encounter personal data during testing, stop and tell me.

## Safe harbour

I will not pursue legal action against a researcher who reports in good faith, stays within the scope above, and does
not exfiltrate or publish personal data.
