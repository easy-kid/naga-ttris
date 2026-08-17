#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE COMPILACIÓN: ANDROID APP BUNDLE (.AAB) PARA GOOGLE PLAY STORE
# NAGA-TTRIS // VOID_STACK
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export JAVA_HOME="/home/sweet/.jdks/jdk-21.0.12+8"
export PATH="$JAVA_HOME/bin:$PATH"

echo "========================================================="
echo "=== COMPILANDO NAGA-TTRIS // ANDROID APP BUNDLE (.AAB) ==="
echo "========================================================="

cd "$PROJECT_ROOT"

echo "[1/4] Compilando bundle web de producción..."
npm run build

echo "[2/4] Sincronizando con Capacitor Android..."
npx cap sync android

echo "[3/4] Compilando Android App Bundle (Release)..."
cd "$PROJECT_ROOT/android"
./gradlew bundleRelease --no-daemon

AAB_OUTPUT="$PROJECT_ROOT/android/app/build/outputs/bundle/release/app-release.aab"
PLAY_STORE_DEST="$PROJECT_ROOT/play-store/release-tools/app-release.aab"

if [ -f "$AAB_OUTPUT" ]; then
  cp "$AAB_OUTPUT" "$PLAY_STORE_DEST"
  echo "[4/4] ¡ÉXITO! Android App Bundle generado en:"
  echo "      $PLAY_STORE_DEST"
  echo "      Tamaño: $(du -h "$PLAY_STORE_DEST" | cut -f1)"
else
  echo "[!] No se encontró el bundle en $AAB_OUTPUT"
fi
echo "========================================================="
