#!/usr/bin/env bash
set -euo pipefail
SOURCE_DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")/.."
PATH="$SOURCE_DIR:$PATH"

# Default configuration
DEFAULT_IC_COMMIT="699e0c3351d44e7acdd2e743fede7c835b3b3558"
DEFAULT_OS="darwin"
DEFAULT_NAME="sns_testing_bundle"

print_help() {
  cat <<-EOF

	Setup script for SNS testing environment.

	Downloads and extracts the SNS testing bundle from the IC CDN.

	EXAMPLES:
	    $0 --latest                          # Use latest commit from IC repo
	    $0 --commit abc123def456             # Use specific commit
	    $0 --latest --os linux               # Latest commit for Linux
	    $0 --force --latest                  # Force download with latest commit

	EOF
}

# Source the clap.bash file ---------------------------------------------------
source "$SOURCE_DIR/scripts/clap.sh"

# Define options
clap.define short=c long=commit desc="Use specific IC commit hash" variable=IC_COMMIT default="$DEFAULT_IC_COMMIT"
clap.define short=l long=latest desc="Fetch and use the latest commit from dfinity/ic repository" variable=USE_LATEST nargs=0
clap.define short=o long=os desc="Target OS (darwin, linux)" variable=OS default="$DEFAULT_OS"
clap.define short=n long=name desc="Bundle name" variable=NAME default="$DEFAULT_NAME"
clap.define short=f long=force desc="Force re-download even if directory exists" variable=FORCE_DOWNLOAD nargs=0

# Source the output file ----------------------------------------------------------
source "$(clap.build)"

# Function to get latest commit from dfinity/ic repository
get_latest_commit() {
    echo "Fetching latest commit from dfinity/ic repository..." >&2

    # Use GitHub API to get the latest commit from master branch
    local api_url="https://api.github.com/repos/dfinity/ic/commits/master"
    local latest_commit

    # Try to fetch using curl with error handling
    if command -v curl >/dev/null 2>&1; then
        latest_commit=$(curl -s "$api_url" | grep '"sha"' | head -1 | cut -d'"' -f4)
    else
        echo "Error: curl is required to fetch latest commit"
        exit 1
    fi

    # Validate that we got a commit hash
    if [ -z "$latest_commit" ] || [ ${#latest_commit} -ne 40 ]; then
        echo "Error: Failed to fetch latest commit or invalid commit hash received"
        echo "Falling back to default commit: $DEFAULT_IC_COMMIT"
        latest_commit="$DEFAULT_IC_COMMIT"
    else
        echo "Latest commit found: $latest_commit" >&2
    fi

    echo "$latest_commit"
}

# Function to validate OS parameter
validate_os() {
    case "$1" in
        darwin|linux)
            return 0
            ;;
        *)
            echo "Error: Unsupported OS '$1'. Supported options: darwin, linux"
            exit 1
            ;;
    esac
}

# Validate OS parameter
validate_os "$OS"

# CDN configuration
CDN="https://download.dfinity.systems"

# Get latest commit if requested - EXECUTE ONLY ONCE and store result
if [ "${USE_LATEST:-false}" = "true" ]; then
    IC_COMMIT=$(get_latest_commit)
fi

# Display configuration
echo "=== SNS Testing Environment Setup ==="
echo "IC Commit: $IC_COMMIT"
echo "OS: $OS"
echo "CDN: $CDN"
echo "Bundle Name: $NAME"
echo "Force Download: ${FORCE_DOWNLOAD:-false}"
echo ""

# Check if directory exists and handle accordingly
if [ -d "$NAME" ]; then
    if [ "${FORCE_DOWNLOAD:-false}" = "true" ]; then
        echo "Directory $NAME exists. Force download enabled - removing existing directory..."
        rm -rf "$NAME"
    else
        echo "Directory $NAME already exists."
        echo "Use --force to re-download or choose a different name with --name"
        exit 1
    fi
fi

# Create and enter directory
echo "Creating directory: $NAME"
mkdir -p "$NAME"
cd "$NAME"

# Construct download URL
DOWNLOAD_URL="$CDN/ic/${IC_COMMIT}/binaries/x86_64-${OS}/$NAME.tar.gz"
echo "Download URL: $DOWNLOAD_URL"

# Download and extract bundle
echo "Downloading bundle..."
if ! curl --fail -L -O "$DOWNLOAD_URL"; then
    echo "Error: Failed to download bundle from $DOWNLOAD_URL"
    echo "Please check:"
    echo "  - IC commit hash is valid: $IC_COMMIT"
    echo "  - OS is supported: $OS"
    echo "  - CDN is accessible: $CDN"
    exit 1
fi

echo "Extracting bundle..."
tar -xvf "$NAME.tar.gz"

# Verify extraction
if [ ! -f "sns_testing_env.sh" ]; then
    echo "Warning: sns_testing_env.sh not found after extraction"
    echo "The bundle may be incomplete or have a different structure"
fi

echo ""
echo "✅ Setup complete!"
echo "📁 Bundle extracted to: $(pwd)"
echo "🚀 Next steps:"
echo "   1. Run '../start-server.sh' to start the PocketIC server"
echo "   2. In a new terminal, run '../init-replica.sh' to initialize the replica"

# Save configuration for reference
cat > setup_info.txt << EOF
Setup Configuration:
IC Commit: $IC_COMMIT
OS: $OS
CDN: $CDN
Bundle Name: $NAME
Setup Date: $(date)
Download URL: $DOWNLOAD_URL
EOF

echo "📋 Configuration saved to setup_info.txt"
