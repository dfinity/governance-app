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

# Generate .env (ensures CANISTER_ID_SELF is available)
"$DIR/config.sh" -n local

# Source .env to get canister IDs
source "$ROOT_DIR/.env"

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

# Construct dfx start arguments (always start in background first to deploy canisters)
DFX_LOGFILE="$ROOT_DIR/.dfx/replica.log"
mkdir -p "$(dirname "$DFX_LOGFILE")"
DFX_START_ARGS="--system-canisters --artificial-delay $DELAY --background --log tee --logfile $DFX_LOGFILE"

if [ "${CLEAN:-false}" = "true" ]; then
    DFX_START_ARGS="$DFX_START_ARGS --clean"
fi

echo "Starting dfx with arguments: $DFX_START_ARGS"
dfx start $DFX_START_ARGS

# Generate TypeScript declarations from the .did file
dfx generate governance-app-backend

# Deploy the governance-app-backend canister with the same ID as production (skip if already created)
if ! dfx canister id governance-app-backend 2>/dev/null; then
    dfx canister create governance-app-backend --specified-id "$CANISTER_ID_SELF"
    dfx deploy governance-app-backend
fi

# If foreground mode, attach to replica logs (Ctrl+C stops the replica)
if [ "${BACKGROUND:-false}" != "true" ]; then
    trap "echo ''; echo 'Stopping replica...'; dfx stop; exit 0" INT TERM
    echo ""
    echo "Attached to replica logs. Press Ctrl+C to stop."
    tail -f "$DFX_LOGFILE" &
    wait
fi
