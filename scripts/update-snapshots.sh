#!/usr/bin/env bash
set -euo pipefail

# download-updated-snapshots.sh
# Downloads the "changed-only" screenshots artifact from a GitHub Actions run
# and merges PNGs into your repo's E2E snapshots directory.

print_help() {
  cat <<'EOF'
Downloads updated screenshots from a specific GitHub CI run and places them into:
  src/governance-app-frontend/tests/e2e

Usage:
  ./download-updated-snapshots.sh -r <run_id> [-a <artifact_name>] [-R <owner/repo>] [-t <target-dir>] [--commit]

Options:
  -r, --run_id        GitHub run_id to download from (required)
  -a, --artifact      Artifact name (default: updated-screenshots)
  -R, --repo          OWNER/REPO if not the current repo (optional)
  -t, --target        Target dir (default: <repo>/src/governance-app-frontend/tests/e2e)
      --commit        Create a local git commit after updating files
  -h, --help          Show this help
EOF
}

# --- Parse args (uses clap.bash if present; otherwise simple getopts fallback) ---
SOURCE_DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")"
if [[ -f "$SOURCE_DIR/clap.bash" ]]; then
  # Prefer your existing clap.bash
  # shellcheck disable=SC1091
  source "$SOURCE_DIR/clap.bash"
  clap.define short=r long=run_id   desc="GitHub run_id" variable=GITHUB_RUN_ID
  clap.define short=a long=artifact desc="Artifact name" variable=ARTIFACT_NAME default="updated-screenshots"
  clap.define short=R long=repo     desc="OWNER/REPO"    variable=GH_REPO_OPT   default=""
  clap.define short=t long=target   desc="Target dir"    variable=TARGET_DIR    default=""
  clap.define        long=commit    desc="Create commit" variable=DO_COMMIT     default="false" flag=true
  clap.define short=h long=help     desc="Help"          variable=SHOW_HELP     default="false" flag=true
  # shellcheck disable=SC1091
  source "$(clap.build)"
  [[ "${SHOW_HELP:-false}" == "true" ]] && print_help && exit 0
else
  # Minimal getopts fallback
  GITHUB_RUN_ID=""
  ARTIFACT_NAME="updated-screenshots"
  GH_REPO_OPT=""
  TARGET_DIR=""
  DO_COMMIT="false"

  while (( "$#" )); do
    case "${1:-}" in
      -r|--run_id)    GITHUB_RUN_ID="${2:?}"; shift 2 ;;
      -a|--artifact)  ARTIFACT_NAME="${2:?}"; shift 2 ;;
      -R|--repo)      GH_REPO_OPT="${2:?}";   shift 2 ;;
      -t|--target)    TARGET_DIR="${2:?}";    shift 2 ;;
      --commit)       DO_COMMIT="true";       shift 1 ;;
      -h|--help)      print_help;             exit 0 ;;
      --) shift; break ;;
      *) echo "Unknown arg: $1"; print_help; exit 1 ;;
    esac
  done
fi

# --- Preconditions ---
command -v gh >/dev/null 2>&1 || { echo "❌ gh CLI is required: https://cli.github.com/"; exit 1; }
command -v rsync >/dev/null 2>&1 || { echo "❌ rsync is required."; exit 1; }
git rev-parse --show-toplevel >/dev/null 2>&1 || { echo "❌ Not inside a git repo."; exit 1; }
[[ -n "${GITHUB_RUN_ID:-}" ]] || { echo "❌ --run_id is required."; print_help; exit 1; }

TOP_DIR="$(git rev-parse --show-toplevel)"
TARGET_DIR="${TARGET_DIR:-"$TOP_DIR/src/governance-app-frontend/tests/e2e"}"
mkdir -p "$TARGET_DIR"

# --- Download artifact into temp dir ---
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

echo "⬇️  Downloading artifact '${ARTIFACT_NAME}' from run ${GITHUB_RUN_ID}..."
if [[ -n "$GH_REPO_OPT" ]]; then
  gh run download "$GITHUB_RUN_ID" -R "$GH_REPO_OPT" -n "$ARTIFACT_NAME" --dir "$tmp_dir"
else
  gh run download "$GITHUB_RUN_ID" -n "$ARTIFACT_NAME" --dir "$tmp_dir"
fi

# --- If a single tar.gz is present (older workflow variant), unpack it; otherwise proceed ---
shopt -s nullglob
tarballs=("$tmp_dir"/*.tar.gz)
if (( ${#tarballs[@]} == 1 )); then
  echo "📦 Detected tarball $(basename "${tarballs[0]}"), extracting..."
  tar -xzf "${tarballs[0]}" -C "$tmp_dir"
fi

# --- Ensure there are PNGs to apply ---
mapfile -t FOUND_PNGS < <(find "$tmp_dir" -type f -iname '*.png')
if (( ${#FOUND_PNGS[@]} == 0 )); then
  echo "ℹ️  No PNG files found in the artifact. Nothing to update."
  exit 0
fi

# --- Merge PNGs into target tree (preserve structure, only PNGs) ---
echo "🔁 Merging PNGs into: $TARGET_DIR"
# --itemize-changes prints a short report of updated files
rsync -a --itemize-changes --prune-empty-dirs \
  --include '*/' --include '*.png' --exclude '*' \
  "$tmp_dir"/ "$TARGET_DIR"/ | sed 's/^/  /' || true

# --- Optional commit ---
if [[ "${DO_COMMIT}" == "true" ]]; then
  echo "📝 Creating commit..."
  pushd "$TOP_DIR" >/dev/null
  git add "$TARGET_DIR"
  if git diff --cached --quiet; then
    echo "ℹ️  No changes to commit."
  else
    git commit -m "chore: update Playwright snapshots"
    echo "✅ Commit created."
  fi
  popd >/dev/null
fi

echo "✅ Screenshots updated in: $TARGET_DIR"