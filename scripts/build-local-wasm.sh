#!/usr/bin/env bash
# Builds the gzipped governance-app-backend wasm (with the frontend) for a local network.
# icp.yaml runs this script for `icp deploy`. Mainnet wasms come from scripts/build.sh.
#
# Usage: build-local-wasm.sh <output.wasm.gz>
#
# When GOVERNANCE_APP_WASM is set, the script copies that wasm and builds nothing. CI builds the
# wasm while the network starts, and then deploys it this way.

set -euo pipefail

OUTPUT="${1:?Usage: $0 <output.wasm.gz>}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -n "${GOVERNANCE_APP_WASM:-}" ]]; then
  echo "Using the prebuilt wasm: $GOVERNANCE_APP_WASM"
  cp "$GOVERNANCE_APP_WASM" "$OUTPUT"
  exit 0
fi

./scripts/config.sh -n local
npm run generate:candid-bindings
npm run build
cargo build --target wasm32-unknown-unknown --release -p governance-app-backend --locked --features testnet
gzip --no-name --stdout target/wasm32-unknown-unknown/release/governance_app_backend.wasm > "$OUTPUT"
