#!/usr/bin/env bash
# Shared helpers for agent/scripts/*. Source via:
#   source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

set -o pipefail

repo_root() {
  git rev-parse --show-toplevel
}

state_file() {
  local name="$1"
  printf '%s/agent/state/%s\n' "$(repo_root)" "$name"
}

iso_now() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

log_info()  { printf '\033[1;34m[INFO]\033[0m  %s\n' "$*" >&2; }
log_warn()  { printf '\033[1;33m[WARN]\033[0m  %s\n' "$*" >&2; }
log_error() { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2; }

notify() {
  local title="$1" body="$2"
  if command -v notify-send >/dev/null 2>&1; then
    notify-send "$title" "$body"
  else
    printf '[NOTIFY] %s — %s\n' "$title" "$body" >&2
  fi
}

require_dep() {
  local dep="$1"
  if ! command -v "$dep" >/dev/null 2>&1; then
    log_error "missing required dependency: $dep"
    exit 3
  fi
}

koad_present() {
  command -v koad >/dev/null 2>&1
}

# Atomic JSON edit via temp file.
# Usage: jq_edit <file> <jq-expr> [jq-args...]
jq_edit() {
  local file="$1"; shift
  local tmp
  tmp="$(mktemp)"
  if ! jq "$@" > "$tmp" < "$file"; then
    rm -f "$tmp"
    log_error "jq failed; $file unchanged"
    exit 2
  fi
  mv "$tmp" "$file"
}

current_session() {
  local link
  link="$(state_file .agent-session)"
  if [ ! -L "$link" ]; then
    log_error "no active session (.agent-session symlink missing)"
    exit 2
  fi
  readlink -f "$link"
}
