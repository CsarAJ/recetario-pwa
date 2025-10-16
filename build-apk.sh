#!/bin/bash
# ===============================================
#  Script: build-apk.sh
#  Autor: CesarAugust
#  Descripción: genera un APK Android desde tu PWA
# ===============================================

APP_NAME="Mis Recetas"
PACKAGE_ID="app.csaraugust.recetas"
KEYSTORE_FILE="misrecetas.keystore"
KEY_ALIAS="recetas"
KEY_PASSWORD="123456"
THEME_COLOR="#ff7b00"
BACKGROUND_COLOR="#ffffff"
MANIFEST_URL="http://localhost:8080/manifest.json"
OUTPUT_DIR="mis-recetas-android"

echo "🧰 Verificando dependencias..."
if ! command -v bubblewrap &> /dev/null
then
    echo "⚙️ Instalando Bubblewrap..."
    npm install -g @bubblewrap/cli
else
    echo "✅ Bubblewrap ya instalado."
fi

echo "🌐 Asegúrate de que tu PWA esté sirviendo en: $MANIFEST_URL"
echo "   Por ejemplo ejecuta: python3 -m http.server 8080"
read -p "Presiona ENTER cuando esté disponible..."

echo "🚀 Iniciando proyecto Android..."
rm -rf "$OUTPUT_DIR"
bubblewrap init --manifest "$MANIFEST_URL" \
--directory "$OUTPUT_DIR" \
--fallbackType none \
--host "localhost" \
--packageId "$PACKAGE_ID" \
--name "$APP_NAME" \
--launcherName "Recetas" \
--display "standalone" \
--themeColor "$THEME_COLOR" \
--backgroundColor "$BACKGROUND_COLOR" \
--signingKey "$KEYSTORE_FILE" \
--signingKeyPassword "$KEY_PASSWORD" \
--signingKeyAlias "$KEY_ALIAS"

echo "🏗  Compilando APK..."
cd "$OUTPUT_DIR"
bubblewrap build

APK_PATH="output/app-release-signed.apk"

if [ -f "$APK_PATH" ]; then
    echo "✅ APK generado correctamente:"
    echo "📦 $APK_PATH"
    echo ""
    echo "👉 Puedes instalarlo con:"
    echo "adb install $APK_PATH"
else
    echo "❌ No se generó el APK. Revisa los mensajes anteriores."
fi
