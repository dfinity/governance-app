#!/usr/bin/env bash
set -euo pipefail
SOURCE_DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")/.."
PATH="$SOURCE_DIR:$PATH"

# Default configuration
DEFAULT_IC_COMMIT="699e0c3351d44e7acdd2e743fede7c835b3b3558"
DEFAULT_OS="darwin"
DEFAULT_DIR="dev-env-$(date +%d-%m-%Y)"
BUNDLE_NAME="sns_testing_bundle"

print_help() {
  cat <<-EOF

	Setup script for SNS testing environment.

	Downloads and extracts the SNS testing bundle from the IC CDN.

	EXAMPLES:
	    $0                            # Use latest commit from IC repo
	    $0 --commit abc123def456      # Use specific commit
	    $0 --os linux                 # Latest commit for Linux
	    $0 --force                    # Force download with latest commit

	EOF
}

# Source the clap.bash file ---------------------------------------------------
source "$SOURCE_DIR/scripts/clap.sh"

# Define options
clap.define short=c long=commit desc="Use specific IC commit hash" variable=IC_COMMIT
clap.define short=o long=os desc="Target OS (darwin, linux)" variable=OS default="$DEFAULT_OS"
clap.define short=d long=directory desc="Bundle directory" variable=BUNDLE_DIR default="$DEFAULT_DIR"
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

# Determine which commit to use
if [ -z "${IC_COMMIT:-}" ]; then
    # No commit specified - fetch and use latest
    echo "No specific commit provided - fetching latest..."
    IC_COMMIT=$(get_latest_commit)
else
    # Specific commit provided - use it
    echo "Using specified commit: $IC_COMMIT"
fi

# Display configuration
echo "=== SNS Testing Environment Setup ==="
echo "IC Commit: $IC_COMMIT"
echo "OS: $OS"
echo "CDN: $CDN"
echo "Bundle DirName: $BUNDLE_DIR"
echo "Force Download: ${FORCE_DOWNLOAD:-false}"
echo ""

# Check if directory exists and handle accordingly
if [ -d "$BUNDLE_DIR" ]; then
    if [ "${FORCE_DOWNLOAD:-false}" = "true" ]; then
        echo "Directory $BUNDLE_DIR exists. Force download enabled - removing existing directory..."
        rm -rf "$BUNDLE_DIR"
    else
        echo "Directory $BUNDLE_DIR already exists."
        echo "Use --force to re-download or choose a different name with --name"
        exit 1
    fi
fi

# Create and enter directory
echo "Creating directory: $BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR"
cd "$BUNDLE_DIR"

# Construct download URL
DOWNLOAD_URL="$CDN/ic/${IC_COMMIT}/binaries/x86_64-${OS}/${BUNDLE_NAME}.tar.gz"
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
tar -xvf "$BUNDLE_NAME.tar.gz"

# Verify extraction
if [ ! -f "sns_testing_env.sh" ]; then
    echo "Warning: sns_testing_env.sh not found after extraction"
    echo "The bundle may be incomplete or have a different structure"
fi

echo ""
echo "✅ Setup complete!"
echo "📁 Bundle extracted to: $(pwd)"
echo "🚀 Next steps:"
echo "   1. Run './scripts/pocketic-server.sh -d $BUNDLE_DIR' to start the PocketIC server"
echo "   2. In a new terminal, run './scripts/init-replica.sh -d $BUNDLE_DIR' to initialize the replica"

# Save configuration for reference
cat > setup_info.txt << EOF
Setup Configuration:
IC Commit: $IC_COMMIT
OS: $OS
CDN: $CDN
Bundle Dir: $BUNDLE_DIR
Setup Date: $(date)
Download URL: $DOWNLOAD_URL
EOF

echo "📋 Configuration saved to setup_info.txt"
