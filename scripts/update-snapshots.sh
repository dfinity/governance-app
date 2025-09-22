#!/usr/bin/env bash
# Downloads and updates PNGs from the "updated-snapshots" artifact of the latest GitHub Actions run.

set -euo pipefail

ARTIFACT_NAME="updated-snapshots"

# --- Preconditions ---
command -v gh >/dev/null 2>&1 || { echo "❌ gh CLI is required: https://cli.github.com/"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ git is required."; exit 1; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "❌ Run this inside a \"governance-app\" repository."; exit 1; }

TOP_DIR="$(git rev-parse --show-toplevel)"
TARGET_DIR="${TOP_DIR}/src/governance-app-frontend/tests/e2e/snapshots"
mkdir -p "$TARGET_DIR"

# --- Determine latest run id for the current repo ---
RUN_ID="$(gh run list -L 1 --json databaseId --jq '.[0].databaseId')"
if [[ -z "${RUN_ID:-}" ]]; then
  echo "❌ Could not find any workflow runs in this repository."
  exit 1
fi
echo "ℹ️  Latest run id: ${RUN_ID}"

# --- Download artifact ---
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

echo "⬇️  Downloading artifact '${ARTIFACT_NAME}'..."
gh run download "$RUN_ID" -n "$ARTIFACT_NAME" --dir "$tmp_dir"

# gh creates a subfolder named after the artifact
ART_DIR="${tmp_dir}/${ARTIFACT_NAME}"
if [[ ! -d "$ART_DIR" ]]; then
  # Fallback: sometimes gh may put contents directly in tmp_dir
  ART_DIR="$tmp_dir"
fi

# Count PNGs and copy
mapfile -t PNGS < <(find "$ART_DIR" -maxdepth 1 -type f -iname '*.png' | sort)
if (( ${#PNGS[@]} == 0 )); then
  echo "⚠️ No PNGs found. Nothing to update."
  exit 0
fi

echo "🔁 Updating $((${#PNGS[@]})) PNG file(s) in:"
echo "   $TARGET_DIR"
cp -f "${PNGS[@]}" "$TARGET_DIR/"

echo "✅ Done."