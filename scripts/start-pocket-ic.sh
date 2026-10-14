#!/usr/bin/env bash
set -euo pipefail

# Get the project root directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$DIR/.."

# Source the clap.bash file
source "$DIR/clap.sh"

# Define options
clap.define short=b long=background desc="Run the network in the background" variable=BACKGROUND nargs=0
clap.define short=e long=environment desc="icp environment: local (2s delay on update calls) or e2e (no delay)" variable=ENVIRONMENT default="local"

# Source the output file
source "$(clap.build)"

# Change to root directory
cd "$ROOT_DIR"

# icp-cli is a devDependency of the project.
export PATH="$ROOT_DIR/node_modules/.bin:$PATH"

# Each environment runs on the network with the same name (see icp.yaml).
NETWORK="$ENVIRONMENT"

# Generate .env (ensures CANISTER_ID_SELF is available)
"$DIR/config.sh" -n local

# Source .env to get canister IDs
source "$ROOT_DIR/.env"

echo ""
echo "🚀 Starting the local network with system canisters (NNS, SNS, II)..."

# icp-cli starts every network from a clean state. Stop a network that still runs on the port.
for network in local e2e; do
  icp network stop "$network" >/dev/null 2>&1 || true
done
icp network start "$NETWORK" --background

# Create governance-app-backend with the same ID as production, then deploy it.
node "$DIR/create-local-canister.mjs" "$NETWORK" "$CANISTER_ID_SELF" "$(icp identity principal)"
# The IDs from an earlier run belong to a network that no longer exists.
rm -f "$ROOT_DIR/.icp/cache/mappings/$ENVIRONMENT.ids.json"
icp canister link governance-app-backend "$CANISTER_ID_SELF" --environment "$ENVIRONMENT"
icp deploy governance-app-backend --environment "$ENVIRONMENT" --yes

echo ""
echo "The following canisters are available:"
echo "  - Governance app: http://$CANISTER_ID_SELF.localhost:8080"
echo "  - NNS dapp: http://qoctq-giaaa-aaaaa-aaaea-cai.localhost:8080"
echo "  - SNS Aggregator: http://3r4gx-wqaaa-aaaaq-aaaia-cai.localhost:8080"
echo "  - Internet Identity: http://$CANISTER_ID_INTERNET_IDENTITY.localhost:8080"
echo ""

# If foreground mode, attach to the network logs (Ctrl+C stops the network)
if [ "${BACKGROUND:-false}" != "true" ]; then
    LOG_DIR="$ROOT_DIR/.icp/cache/networks/$NETWORK/network-launcher"
    trap "echo ''; echo 'Stopping network...'; icp network stop '$NETWORK'; exit 0" INT TERM
    echo "Attached to network logs. Press Ctrl+C to stop."
    tail -f "$LOG_DIR/stdout.log" "$LOG_DIR/stderr.log" &
    wait
fi
