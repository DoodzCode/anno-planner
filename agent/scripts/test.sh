#!/usr/bin/env bash
# Run all bats tests under agent/scripts/tests/.
# Usage: test.sh [--filter <pattern>] [--integration] [--verbose]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BATS="$ROOT/scripts/tests/bats/bin/bats"
TESTS_DIR="$ROOT/scripts/tests"

FILTER=""
INTEGRATION=false
VERBOSE=false

while [ $# -gt 0 ]; do
  case "$1" in
    --filter)
      [ $# -ge 2 ] || { echo "--filter requires a value" >&2; exit 1; }
      FILTER="$2"; shift 2 ;;
    --integration) INTEGRATION=true; shift ;;
    --verbose|-v)  VERBOSE=true; shift ;;
    --help|-h)     sed -n '2,4p' "$0"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [ ! -x "$BATS" ]; then
  echo "bats not found at $BATS. Run: git submodule update --init --recursive" >&2
  exit 3
fi

files=()
if [ -n "$FILTER" ]; then
  while IFS= read -r f; do files+=("$f"); done < <(find "$TESTS_DIR" -maxdepth 1 -name "*${FILTER}*.bats")
else
  while IFS= read -r f; do files+=("$f"); done < <(find "$TESTS_DIR" -maxdepth 1 -name "*.bats")
fi

if [ "$INTEGRATION" = true ]; then
  while IFS= read -r f; do files+=("$f"); done < <(find "$TESTS_DIR/integration" -name "*.bats" 2>/dev/null)
fi

[ "${#files[@]}" -gt 0 ] || { echo "no test files matched" >&2; exit 1; }

opts=()
[ "$VERBOSE" = true ] && opts+=(--verbose-run)

"$BATS" "${opts[@]}" "${files[@]}"
