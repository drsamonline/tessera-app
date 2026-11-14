# Building binaries

The console is a static page. That makes every packaging route short, and none of them are built in this
repository — what is here is the path and the trade-offs.

| Target | Route | What you get | What it costs |
|---|---|---|---|
| **Web / PWA** | Already works | Installable, offline, no store | Nothing |
| **Android APK** | Trusted Web Activity, or Capacitor | A real APK, updates with the site | A signing key, a Play listing |
| **Windows / macOS / Linux** | Tauri, or Electron | A desktop binary | 3–10 MB with Tauri, ~90 MB with Electron |
| **Single file** | Already is one | `index.html` opens from disk | No install, no offline cache |

## Android APK — Trusted Web Activity

A TWA is a thin native shell around the hosted app. It gives a real APK without maintaining a second codebase, and
it inherits the service worker, so it works offline exactly as the PWA does.

```bash
# 1. the app must be served over HTTPS at a stable URL
#    https://drsamonline.github.io/tessera-app/

# 2. generate the wrapper
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://drsamonline.github.io/tessera-app/manifest.webmanifest

# 3. build and sign
bubblewrap build
```

Bubblewrap adds `assetlinks.json` for verification — publish it at
`https://drsamonline.github.io/.well-known/assetlinks.json` or the app shows a URL bar.

**Trade-off:** a TWA needs a network for the first load after install. If you need a fully self-contained APK,
use Capacitor and copy this folder into the web root instead.

## Desktop — Tauri

Tauri produces the smallest binary because it uses the system webview.

```bash
npm create tauri-app@latest tessera-desktop -- --template vanilla
cp -r ./* tessera-desktop/dist/
cd tessera-desktop && npm run tauri build
```

Point `tauri.conf.json` at `dist/index.html`, set `withGlobalTauri: false`, and set the window to 1280×860 with a
900×600 minimum. **Trade-off:** Web Crypto and service workers behave slightly differently inside a webview; test
the ledger verification there before shipping.

## Desktop — Electron

Larger, but the webview is Chromium and behaves exactly like the browser you tested in.

```bash
npm init -y && npm i -D electron
# main.js: new BrowserWindow({ width: 1280, height: 860 }).loadFile('index.html')
npx electron .
npx electron-builder --win --mac --linux
```

**Trade-off:** ~90 MB per platform for identical behaviour. Choose Electron when fidelity matters more than size.

## What is not built here

- **No APK, no EXE, no DMG.** This environment has no Android SDK, no signing keys and no Windows target, and
  shipping a binary built without them would be a file that does not run.
- **No CI packaging workflow.** The commands above are a person's job today.
- **No store listings.** A Play or Microsoft Store submission needs an account, a privacy policy URL and screenshots
  at four densities; all four exist here and none are submitted.
