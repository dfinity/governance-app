#!/usr/bin/env bash
set -euo pipefail
SOURCE_DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")/.."
PATH="$SOURCE_DIR:$PATH"

# --- Configuration ---

WASM_FILE_NAME="governance_app_backend.wasm"
DOCKER_IMAGE_NAME="builder-deploy"
CONTAINER_APP_PATH="/app/target/wasm32-unknown-unknown/release/${WASM_FILE_NAME}"
KEEP_WASM=false

# --- Function to display script usage ---

show_help() {
  echo "Usage: build.sh [--keep-wasm]"
  echo
  echo "Builds the project using a Docker container, extracts the WASM file, and prints its SHA."
  echo "By default, the WASM file is deleted. Use --keep-wasm to preserve it."
}

# Source the clap.bash file ---------------------------------------------------
source "$SOURCE_DIR/scripts/clap.sh"

# Define options
clap.define short=k long=keep-wasm desc="Keep the generated WASM file." variable=KEEP_WASM default="$KEEP_WASM" nargs=0

# Source the output file ----------------------------------------------------------
source "$(clap.build)"

# --- Main build process ---

GIT_COMMIT="$(git rev-parse HEAD)"

echo "Building Docker image for commit ${GIT_COMMIT:0:10}..."
docker buildx build --platform linux/amd64 --build-arg GIT_COMMIT="$GIT_COMMIT" -t "$DOCKER_IMAGE_NAME" . -f docker/Dockerfile.build

echo "Extracting WASM file from container..."
CONTAINER_ID=$(docker create "$DOCKER_IMAGE_NAME")
docker cp "$CONTAINER_ID":"$CONTAINER_APP_PATH" "./$WASM_FILE_NAME"
docker rm "$CONTAINER_ID"

echo "WASM file extracted to: $WASM_FILE_NAME"

echo -e "\033[1m\033[32mCalculating SHA256 of the WASM file...\033[0m"
sha256sum "./$WASM_FILE_NAME" | awk '{ print $1 }' | echo -e "\033[1m\033[32m$(cat)\033[0m"

# --- Conditional cleanup ---

if [ "$KEEP_WASM" = false ]; then
  echo "Removing WASM file..." # E.g. hash verification
  rm "./$WASM_FILE_NAME"
else
  echo "Keeping WASM file as requested." # E.g. CI/deploy
fi
