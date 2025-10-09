#!/usr/bin/env bash

set -euo pipefail

# Configuration
SCRIPT_DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

# --- Default values ---
NETWORK="local"
USERNAME=""

# --- Function to display script help ---
print_help() {
  echo "Generate .env file for the governance app"
  echo
  echo "This script generates the appropriate .env file based on the target network."
  echo "It will overwrite any existing .env file."
  echo
  echo "EXAMPLES:"
  echo "  config.sh                           # Generate for local network"
  echo "  config.sh --network ic              # Generate for ic"
  echo "  config.sh -n devenv -u peterp       # Generate for devenv with username"
  echo
  echo "NETWORKS:"
  echo "  local    - Local development (default)"
  echo "  ic       - Production mainnet"
  echo "  devenv   - Development environment (requires --user)"
}

# Source the clap.bash file
source "$SCRIPT_DIR/clap.sh"

# Define options using clap
clap.define short=n long=network desc="Target network (local|ic|devenv)" variable=NETWORK default="$NETWORK"
clap.define short=u long=user desc="Username for devenv network (required when network=devenv)" variable=USERNAME default="$USERNAME"

# Source the generated argument parser
source "$(clap.build)"

# --- Validation ---
if [[ "$NETWORK" != "local" && "$NETWORK" != "ic" && "$NETWORK" != "devenv" ]]; then
  echo "Error: Network must be 'local', 'ic', or 'devenv', got: $NETWORK"
  exit 1
fi

if [[ "$NETWORK" == "devenv" && -z "$USERNAME" ]]; then
  echo "Error: Username is required when using devenv network"
  echo "Usage: $0 --network devenv --user <username>"
  exit 1
fi

generate_env_content() {
  local network=$1
  local username=$2

  cat << EOF
CANISTER_ID_ICP_INDEX=qhbym-qaaaa-aaaaa-aaafq-cai
CANISTER_ID_ICP_LEDGER=ryjl3-tyaaa-aaaaa-aaaba-cai
CANISTER_ID_INTERNET_IDENTITY=rdmx6-jaaaa-aaaaa-aaadq-cai
CANISTER_ID_NNS_GOVERNANCE=rrkah-fqaaa-aaaaa-aaaaq-cai
CANISTER_ID_CKUSD_LEDGER=xevnm-gaaaa-aaaar-qafnq-cai
ICP_SWAP_URL=https://uvevg-iyaaa-aaaak-ac27q-cai.raw.ic0.app/
EOF

  case "$network" in
    "ic")
      echo "DFX_HOST=ic0.app"
      echo "DFX_NETWORK=ic"
      ;;
    "devenv")
      echo "DFX_HOST=${username}-ingress.devenv.dfinity.network"
      echo "DFX_NETWORK=local"
      ;;
    "local"|*)
      echo "DFX_HOST=localhost:8080"
      echo "DFX_NETWORK=local"
      ;;
  esac
}

echo "Generating .env file for '$NETWORK' network..."

if [[ -f "$ENV_FILE" ]]; then
  echo "Overwriting existing .env file"
fi

# Generate the .env file
if [[ "$NETWORK" == "devenv" ]]; then
  echo "Using devenv with user: $USERNAME"
fi

generate_env_content "$NETWORK" "$USERNAME" > "$ENV_FILE"

echo "✅ Generated .env file: $ENV_FILE"
echo
echo "─────────────────────────────────────"
cat "$ENV_FILE"
echo "─────────────────────────────────────"
