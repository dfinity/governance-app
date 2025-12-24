#!/usr/bin/env bash
set -e

# Get the project root directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$DIR/.."

# Source the clap.bash file
source "$DIR/clap.sh"

# Define options
clap.define short=b long=background desc="Run dfx in background" variable=BACKGROUND nargs=0
clap.define short=d long=delay desc="Artificial delay in milliseconds" variable=DELAY default="2000"
clap.define short=c long=clean desc="Start the replica in a clean state" variable=CLEAN nargs=0

# Source the output file
source "$(clap.build)"

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

# Construct dfx start arguments
DFX_ARGS="--system-canisters --artificial-delay $DELAY"

if [ "${BACKGROUND:-false}" = "true" ]; then
    DFX_ARGS="$DFX_ARGS --background"
fi

if [ "${CLEAN:-false}" = "true" ]; then
    DFX_ARGS="$DFX_ARGS --clean"
fi

# Start dfx
dfx start $DFX_ARGS
