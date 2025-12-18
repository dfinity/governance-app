#!/usr/bin/env bash
set -e

# Get the project root directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$DIR/.."

# Change to root directory
cd "$ROOT_DIR"

# Ensure PocketIC binary is available
./scripts/download-pocket-ic.sh

# Get the commit hash again to construct the path
IC_COMMIT=$(jq -r .IC_COMMIT "$ROOT_DIR/config.json")
POCKET_IC_BIN="./pocket-ic/$IC_COMMIT"

export POCKET_IC_BIN

echo ""
echo "🚀 Initializing local replica with required canisters..."

echo ""
echo "Following canisters will be available in the following urls:"
echo "  - NNS dapp: http://qoctq-giaaa-aaaaa-aaaea-cai.localhost:8080"
echo "  - SNS Aggregator: http://3r4gx-wqaaa-aaaaq-aaaia-cai.localhost:8080"
echo "  - Internet Identity: http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:8080"
echo ""

# Start dfx in the background
dfx start --system-canisters --artificial-delay 2000
