#!/usr/bin/env bash
# Local mirror of CI (.github/workflows/ci.yml). Runs every step even after a
# failure, then summarises — one run tells you everything that is red.
#
# Usage:
#   pnpm ci-check              # everything CI runs
#   pnpm ci-check --no-doctor  # skip expo-doctor, the one step that needs the network
set -u

WITH_DOCTOR=1
for arg in "$@"; do
  case "$arg" in
    --no-doctor) WITH_DOCTOR=0 ;;
  esac
done

failed=""
warned=""

run_step() {
  local step="$1"
  shift
  echo ""
  echo "▶ ${step}"
  if "$@"; then
    echo "✔ ${step} passed"
  else
    echo "✖ ${step} failed"
    failed="${failed} ${step}"
  fi
}

# Report-only: for a check with a known backlog. It runs and reports but does not
# fail, until the backlog is zero and the step is promoted to run_step.
run_warn_step() {
  local step="$1"
  shift
  echo ""
  echo "▶ ${step} (report-only)"
  if "$@"; then
    echo "✔ ${step} passed"
  else
    echo "⚠ ${step} has findings — report-only, not blocking yet"
    warned="${warned} ${step}"
  fi
}

run_step "type-check" pnpm turbo type-check
run_step "lint" pnpm turbo lint
run_step "test" pnpm turbo test
if [ "$WITH_DOCTOR" -eq 1 ]; then
  run_step "expo-doctor" pnpm --filter mobile exec expo-doctor
fi
run_step "arch-gates" bash scripts/arch-gates.sh
run_step "docs-gate" bash scripts/docs-gate.sh

echo ""
if [ -n "$failed" ]; then
  echo "── ci-check: FAILED →${failed}"
  exit 1
fi
if [ -n "$warned" ]; then
  echo "── ci-check: green ✔ (report-only findings:${warned})"
else
  echo "── ci-check: green ✔"
fi
