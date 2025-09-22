#!/usr/bin/env bash
# update-snapshots-from-latest-run.sh
# Downloads the "updated-snapshots" artifact from the latest GitHub Actions run
# in the current repo, extracts updated-snapshots.zip (flat list of PNGs),
# and replaces/adds them into:
#   src/governance-app-frontend/tests/e2e/snapshots/

set -euo pipefail

ARTIFACT_NAME="updated-snapshots"
ZIP_NAME="updated-snapshots.zip"

# --- Preconditions ---
command -v gh >/dev/null 2>&1 || { echo "❌ gh CLI is required: https://cli.github.com/"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ git is required."; exit 1; }
command -v unzip >/dev/null 2>&1 || { echo "❌ unzip is required."; exit 1; }
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
echo "ℹ️ Latest run id: ${RUN_ID}"

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

ZIP_PATH="$(find "$ART_DIR" -maxdepth 2 -type f -name "$ZIP_NAME" | head -n1)"
if [[ -z "${ZIP_PATH:-}" ]]; then
  echo "❌ ${ZIP_NAME} not found inside artifact '${ARTIFACT_NAME}'."
  echo "   Make sure the workflow uploaded ${ZIP_NAME} into the '${ARTIFACT_NAME}' artifact."
  exit 1
fi
echo "📦 Found: $(basename "$ZIP_PATH")"

# --- Extract and copy PNGs (flat structure expected) ---
unzipped_dir="${tmp_dir}/unzipped"
mkdir -p "$unzipped_dir"
unzip -q -o "$ZIP_PATH" -d "$unzipped_dir"

# Count PNGs and copy
mapfile -t PNGS < <(find "$unzipped_dir" -maxdepth 1 -type f -iname '*.png' | sort)
if (( ${#PNGS[@]} == 0 )); then
  echo "ℹ️ No PNGs found in ${ZIP_NAME}. Nothing to update."
  exit 0
fi

echo "🔁 Updating $((${#PNGS[@]})) PNG file(s) in:"
echo "   $TARGET_DIR"
cp -f "${PNGS[@]}" "$TARGET_DIR/"

echo "✅ Done."