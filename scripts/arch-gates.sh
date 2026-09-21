#!/usr/bin/env bash
# Architecture gates — structural rules a type-checker cannot express.
# Each gate mirrors a non-negotiable in AGENTS.md or a workspace contract, and
# names the doc it enforces. A gate whose target does not exist yet passes, and
# arms itself the day that directory appears.
#
# Usage: pnpm arch-gates
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

failed=""

# Migration ratchet. A pre-existing violation count frozen as a baseline, so
# only a NEW violation fails. Every entry must name who burns it to zero — a
# baseline with no owner is just a permanently tolerated violation.
baseline_for() {
  case "$1" in
    *) echo 0 ;;
  esac
}

owner_of() {
  case "$1" in
    *) echo "—" ;;
  esac
}

# gate <name> <message> <paths> <pattern> [extra grep args...]
# <paths> is one path or a space-separated list; missing paths are dropped, and
# the gate skips only when none of them exist yet.
gate() {
  local name="$1" message="$2" paths="$3" pattern="$4"
  shift 4

  local targets="" p
  for p in $paths; do
    [ -e "$p" ] && targets="$targets $p"
  done

  if [ -z "$targets" ]; then
    echo "✔ ${name} (not armed — no target yet)"
    return
  fi

  local hits count baseline
  # shellcheck disable=SC2086 # word-splitting the target list is the point
  hits="$(grep -rnE "$pattern" $targets --include='*.ts' --include='*.tsx' "$@" 2>/dev/null)"
  count=0
  [ -n "$hits" ] && count="$(printf '%s\n' "$hits" | wc -l | tr -d ' ')"
  baseline="$(baseline_for "$name")"

  if [ "$count" -eq 0 ]; then
    echo "✔ ${name}"
  elif [ "$count" -le "$baseline" ]; then
    echo "✔ ${name} (ratchet: ${count}/${baseline} pre-existing — $(owner_of "$name"))"
  else
    echo "✖ ${name}"
    echo "  ${message}"
    printf '%s\n' "$hits" | head -20 | sed 's/^/  /'
    failed="${failed} ${name}"
  fi
}

gate "contracts-types-only" \
  "packages/contracts ships no JavaScript — types only. The compiled API runs on Node, which will not strip types from a file under node_modules (packages/contracts/AGENTS.md)." \
  "packages/contracts/src" \
  "^[[:space:]]*(export[[:space:]]+(default[[:space:]]+)?)?(const|let|var|function|class|enum)[[:space:]]" \
  --exclude='*.test.ts'

gate "api/contracts-type-only" \
  "Import contracts as types: 'import type { … }'. A value import compiles, then crashes the running API (apps/api/AGENTS.md)." \
  "apps/api/src" \
  "^import[[:space:]]+\{[^}]*\}[[:space:]]+from[[:space:]]+['\"]@harness-monorepo/contracts"

gate "api/fastify-only" \
  "The API runs on Fastify; the Express adapter is not a dependency (apps/api/AGENTS.md)." \
  "apps/api/src" \
  "@nestjs/platform-express|from[[:space:]]+['\"]express['\"]"

# src/generated is the Prisma client, written by `prisma generate` — not code anyone edits.
gate "api/no-console" \
  "The API logs through pino; console.* bypasses the structured logger (apps/api/AGENTS.md)." \
  "apps/api/src" \
  "console\.(log|info|warn|error|debug)\(" \
  --exclude='*.spec.ts' --exclude-dir=generated

gate "api/env-through-schema" \
  "Configuration is read once, through the zod schema in src/shared/config — nothing else reads process.env (apps/api/AGENTS.md)." \
  "apps/api/src" \
  "process\.env" \
  --exclude-dir=config --exclude-dir=generated

gate "web/no-fetch-in-components" \
  "Components never call fetch — a service function plus a TanStack Query hook does, and packages/ui blocks take data through props (docs/ai-rules/state-and-data.md)." \
  "apps/web/src/components packages/ui/src" \
  "(^|[^a-zA-Z0-9_])fetch\("

gate "web/no-hex-colors" \
  "No hardcoded colours — tokens only, as CSS variables (docs/ai-rules/styling.md)." \
  "apps/web/src packages/ui/src" \
  "#[0-9a-fA-F]{6}([^0-9a-fA-F]|$)|\[#[0-9a-fA-F]{3,8}\]"

gate "web/no-web-storage" \
  "Nothing about a session lives in localStorage or sessionStorage — tokens travel in httpOnly cookies only (apps/web/AGENTS.md)." \
  "apps/web/src packages/ui/src" \
  "(localStorage|sessionStorage)"

echo ""
if [ -n "$failed" ]; then
  echo "── arch-gates: FAILED →${failed}"
  exit 1
fi
echo "── arch-gates: all green ✔"
