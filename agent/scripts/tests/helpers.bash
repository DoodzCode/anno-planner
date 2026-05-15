#!/usr/bin/env bash
# Shared bats helpers.

REPO_ROOT_FROM_HELPERS="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# Create a temp git repo with seeded agent/ state for isolation.
make_temp_repo() {
  local tmp
  tmp="$(mktemp -d)"
  cd "$tmp"
  git init -q
  git config user.email "test@example.com"
  git config user.name "Test"
  mkdir -p agent/state/sessions agent/scripts/lib
  cp -r "$REPO_ROOT_FROM_HELPERS"/agent/state/{tasks.json,milestones.json,decisions.json,blockers.md} agent/state/
  cp "$REPO_ROOT_FROM_HELPERS"/agent/scripts/lib/common.sh agent/scripts/lib/
  cp -r "$REPO_ROOT_FROM_HELPERS"/agent/scripts/tests/fixtures agent/scripts/tests/ 2>/dev/null || true
  echo "$tmp"
}

# Add mocks to PATH ahead of real binaries.
use_mocks() {
  export PATH="$REPO_ROOT_FROM_HELPERS/agent/scripts/tests/mocks:$PATH"
  export NOTIFY_LOG="$BATS_TMPDIR/notify.log"
  export KOAD_LOG="$BATS_TMPDIR/koad.log"
  : > "$NOTIFY_LOG"
  : > "$KOAD_LOG"
}

# Assert helpers.
assert_exit_code() {
  local expected="$1"
  [ "$status" -eq "$expected" ] || {
    echo "expected exit $expected, got $status"
    echo "output: $output"
    return 1
  }
}

assert_json_field() {
  local file="$1" path="$2" expected="$3"
  local actual
  actual="$(jq -r "$path" "$file")"
  [ "$actual" = "$expected" ] || {
    echo "$file $path: expected '$expected', got '$actual'"
    return 1
  }
}

assert_file_contains() {
  local file="$1" pattern="$2"
  grep -q "$pattern" "$file" || {
    echo "$file missing pattern: $pattern"
    return 1
  }
}

assert_notify_sent() {
  local pattern="$1"
  grep -q "$pattern" "$NOTIFY_LOG" || {
    echo "notify log missing pattern: $pattern"
    cat "$NOTIFY_LOG"
    return 1
  }
}
