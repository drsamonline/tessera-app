#!/usr/bin/env bash
# Build a sideloadable APK without Gradle.
#
# Needs: a JDK (17+), and the Android SDK with build-tools and one platform.
# Nothing here downloads at build time, and nothing here needs a signing key you
# have to create in advance: the keystore below is a debug key, generated on the
# spot, which is what "sideload only" means.
#
#   ANDROID_HOME=~/Android/Sdk ./android/scripts/build.sh
#
# Produces android/out/tessera-debug.apk
set -euo pipefail

: "${ANDROID_HOME:?set ANDROID_HOME to your Android SDK}"
BUILD_TOOLS="${BUILD_TOOLS:-$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)}"
PLATFORM="${PLATFORM:-$(ls -d "$ANDROID_HOME"/platforms/* | sort -V | tail -1)}"
JAR="$PLATFORM/android.jar"

HERE="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$HERE/app/src/main"
OUT="$HERE/out"
rm -rf "$OUT" && mkdir -p "$OUT/classes" "$OUT/gen"

echo "==> resources"
"$BUILD_TOOLS/aapt2" compile --dir "$SRC/res" -o "$OUT/resources.flata"
"$BUILD_TOOLS/aapt2" link -o "$OUT/base.apk" -I "$JAR" \
  --manifest "$SRC/AndroidManifest.xml" --java "$OUT/gen" \
  --min-sdk-version 24 --target-sdk-version 34 "$OUT/resources.flata"

echo "==> java"
javac --release 17 -classpath "$JAR" -d "$OUT/classes" \
  $(find "$SRC/java" -name '*.java')

echo "==> dex"
# d8 defaults to a 2 GB heap, which a small container cannot reserve
java -Xmx512m -cp "$BUILD_TOOLS/lib/d8.jar" com.android.tools.r8.D8 \
  --lib "$JAR" --min-api 24 --output "$OUT" $(find "$OUT/classes" -name '*.class')

echo "==> package"
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT" && zip -q -j unsigned.apk classes.dex)
"$BUILD_TOOLS/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

echo "==> sign with a generated debug key"
if [ ! -f "$OUT/debug.keystore" ]; then
  keytool -genkeypair -keystore "$OUT/debug.keystore" -storepass android -keypass android \
    -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Android Debug,O=Android,C=US"
fi
java -Xmx256m -jar "$BUILD_TOOLS/lib/apksigner.jar" sign \
  --ks "$OUT/debug.keystore" --ks-pass pass:android --key-pass pass:android \
  --ks-key-alias androiddebugkey --out "$OUT/tessera-debug.apk" "$OUT/aligned.apk"

echo "==> verify"
java -Xmx256m -jar "$BUILD_TOOLS/lib/apksigner.jar" verify --print-certs "$OUT/tessera-debug.apk"
"$BUILD_TOOLS/aapt2" dump badging "$OUT/tessera-debug.apk" | head -6
ls -lh "$OUT/tessera-debug.apk"
