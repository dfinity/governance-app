#!/usr/bin/env bash
# Updates src/governance-app-frontend/tests/e2e/durations.json with the E2E test times of a
# GitHub Actions run. CI uses this file to balance the E2E shards.
#
# Usage: update-e2e-durations.sh [run_id]
#   run_id  A run that has "e2e-timings-*" artifacts. The default is the last successful
#           "Pipeline Main" run.

set -euo pipefail

command -v gh >/dev/null 2>&1 || { echo "❌ gh CLI is required: https://cli.github.com/"; exit 1; }

TOP_DIR="$(git rev-parse --show-toplevel)"
RUN_ID="${1:-}"

if [[ -z "$RUN_ID" ]]; then
  RUN_ID="$(gh run list --workflow pipeline_main.yaml --branch main --status success --limit 1 \
    --json databaseId --jq '.[0].databaseId')"
  [[ -n "$RUN_ID" ]] || { echo "❌ Found no successful Pipeline Main run."; exit 1; }
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

echo "⬇️  Downloading the e2e-timings-* artifacts of run $RUN_ID..."
gh run download "$RUN_ID" --pattern 'e2e-timings-*' --dir "$tmp_dir"

mapfile -t REPORTS < <(find "$tmp_dir" -type f -name '*.json' | sort)
if (( ${#REPORTS[@]} == 0 )); then
  echo "⚠️ The run has no test times. The artifacts are kept for 30 days."
  exit 1
fi

node "$TOP_DIR/src/governance-app-frontend/scripts/e2e-shards.ts" record "${REPORTS[@]}"
