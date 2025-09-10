#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

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

# --- Parse command-line flags ---

for arg in "$@"; do
  case $arg in
    --keep-wasm)
      KEEP_WASM=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      # Unrecognized argument
      echo "Error: Unrecognized argument '$arg'" >&2
      show_help
      exit 1
      ;;
  esac
done

# --- Main build process ---

echo "Building Docker image..."
docker buildx build --platform linux/amd64 -t "$DOCKER_IMAGE_NAME" . -f docker/Dockerfile.build

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
