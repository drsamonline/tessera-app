# The Android app

A WebView shell around the console. 17 KB, one activity, no dependencies, no Gradle.

```
android/tessera-1.20.0-debug.apk    the built artefact
android/scripts/build.sh            the whole build, from source to signed APK
android/app/src/main/               the source
```

## Install it

Download `tessera-1.20.0-debug.apk` to an Android device and open it. Android will warn about installing from an unknown
source — that is what sideloading means, and it is why the certificate says `CN=Android Debug`.

## Build it yourself

```bash
ANDROID_HOME=~/Android/Sdk ./android/scripts/build.sh
```

Needs a JDK 17+ and the Android SDK with `build-tools` and one `platforms` entry. No Gradle, no Maven, no network at
build time, and **no signing key to create in advance**: the script generates a debug keystore on the spot, because
that is the only key a sideload needs.

## Why a WebView and not a Trusted Web Activity

A TWA removes the browser chrome only when the site publishes `assetlinks.json` listing **this app's signing
certificate**. A debug certificate is generated fresh on every machine, so that verification can never pass — a TWA
signed with a debug key shows the URL bar anyway, and pretending otherwise is a build that fails the first time
somebody else builds it.

A WebView shell needs no verification, loads the same page with the same storage and the same service worker, and is
honest about being a shell.

## What it does

| | |
|---|---|
| Loads | `https://drsamonline.github.io/tessera-app/` |
| JavaScript, DOM storage, database | enabled — the console keeps its state in IndexedDB |
| Cleartext traffic | refused (`usesCleartextTraffic="false"`) |
| Back button | goes back in the page, then leaves the app |
| Zoom | off — the console is already responsive |
| Permissions | `INTERNET`, `ACCESS_NETWORK_STATE`. Nothing else |

## What it is not

- **Not on Play.** A store listing needs a key you keep, a signed AAB, and a review. Sideload only, by design.
- **Not tested on a device.** There is no emulator in the environment that built it. The APK verifies, the dex
  contains the activity, the manifest resolves, and that is the limit of what was checked. **It has never been run on
  Android.**
- **Not offline-first on install.** The service worker caches the shell on first load, so the second launch works
  without a network; the first does not.
