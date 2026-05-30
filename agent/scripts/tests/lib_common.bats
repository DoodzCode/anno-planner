#!/usr/bin/env bats

load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  source agent/scripts/lib/common.sh
}

teardown() {
  rm -rf "$REPO"
}

@test "repo_root returns git toplevel" {
  run repo_root
  assert_exit_code 0
  [ "$output" = "$REPO" ]
}

@test "iso_now returns ISO-8601 UTC timestamp" {
  run iso_now
  assert_exit_code 0
  [[ "$output" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]
}

@test "state_file resolves to agent/state path" {
  run state_file tasks.json
  assert_exit_code 0
  [ "$output" = "$REPO/agent/state/tasks.json" ]
}

@test "jq_edit atomically updates a JSON file" {
  jq_edit agent/state/tasks.json '.tasks += [{"id":"T-9999"}]'
  assert_json_field agent/state/tasks.json '.tasks[0].id' "T-9999"
}

@test "jq_edit leaves original intact on jq failure" {
  run jq_edit agent/state/tasks.json '.tasks += [INVALID]'
  assert_exit_code 2
  assert_json_field agent/state/tasks.json '.tasks | length' "0"
}

@test "require_dep fails with exit 3 for missing binary" {
  run require_dep this_binary_does_not_exist_12345
  assert_exit_code 3
}

@test "require_dep succeeds for existing binary" {
  run require_dep git
  assert_exit_code 0
}

@test "koad_present is false when koad not on PATH" {
  ( export PATH="/usr/bin:/bin"; run koad_present; assert_exit_code 1 )
}
