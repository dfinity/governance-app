#!/usr/bin/env bash
set -e

# Get the project root directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$DIR/.."

# Read IC_COMMIT from config.json
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed."
    exit 1
fi

IC_COMMIT=$(jq -r .IC_COMMIT "$ROOT_DIR/config.json")

if [ -z "$IC_COMMIT" ] || [ "$IC_COMMIT" == "null" ]; then
  echo "Error: Could not read IC_COMMIT from config.json"
  exit 1
fi

# Detect Platform
PLATFORM="x86_64-linux"
if [[ "$OSTYPE" == "darwin"* ]]; then
  PLATFORM="x86_64-darwin"
fi

# Target directory and file
TARGET_DIR="$ROOT_DIR/pocket-ic"
TARGET_FILE="$TARGET_DIR/$IC_COMMIT"

if [ -f "$TARGET_FILE" ]; then
  echo "PocketIC binary already exists at $TARGET_FILE"
  exit 0
fi

mkdir -p "$TARGET_DIR"

# URL Construction
BINARY_NAME="pocket-ic-head-nns.gz"
URL="https://download.dfinity.systems/ic/${IC_COMMIT}/binaries/${PLATFORM}/${BINARY_NAME}"

echo "Attempting to download PocketIC from: $URL"

if curl --fail --location --silent "$URL" | gzip -d > "$TARGET_FILE"; then
  echo "Download successful."
else
  echo "Failed to download $BINARY_NAME. Trying pocket-ic.gz..."
  BINARY_NAME="pocket-ic.gz"
  URL="https://download.dfinity.systems/ic/${IC_COMMIT}/binaries/${PLATFORM}/${BINARY_NAME}"
  echo "Attempting to download PocketIC from: $URL"

  if curl --fail --location --silent "$URL" | gzip -d > "$TARGET_FILE"; then
    echo "Download successful."
  else
    echo "Error: Failed to download PocketIC binary."
    rm -f "$TARGET_FILE"
    exit 1
  fi
fi

chmod +x "$TARGET_FILE"
echo "PocketIC binary set up at $TARGET_FILE"
