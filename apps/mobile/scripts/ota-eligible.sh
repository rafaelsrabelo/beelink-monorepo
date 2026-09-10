#!/usr/bin/env bash
# Classify a diff as OTA-eligible or not.
#
# OTA-eligible = every changed file under apps/mobile is JS, JS-required images or
# docs — nothing that changes the native binary. Conservative by design: anything
# outside the allowlist forces a store build. See apps/mobile/docs/release-ota.md.
#
#   pnpm --filter mobile ota:check                   # origin/main...HEAD
#   pnpm --filter mobile ota:check -- <base> <head>
#
# Exit codes — three states, not two:
#   0  OTA-eligible          (mobile changed, JS / images / docs only)
#   1  needs a native build  (mobile changed, something outside the allowlist)
#   2  OTA irrelevant        (apps/mobile untouched)
set -euo pipefail

base="${1:-origin/main}"
head="${2:-HEAD}"

# From the repo root: pnpm --filter runs this inside apps/mobile, where a relative
# "apps/mobile" pathspec would resolve to apps/mobile/apps/mobile and match nothing.
ROOT="$(git rev-parse --show-toplevel)"
APP="apps/mobile"

# Root files that still reach the native build: what gets installed, and how.
ROOT_NATIVE_RISK=(package.json pnpm-lock.yaml .npmrc)

app_changed="$(git -C "$ROOT" diff --name-only "${base}...${head}" -- "$APP")"
root_changed="$(git -C "$ROOT" diff --name-only "${base}...${head}" -- "${ROOT_NATIVE_RISK[@]}")"

if [[ -z "$app_changed" && -z "$root_changed" ]]; then
  echo "OTA irrelevant — ${APP} untouched in ${base}...${head}"
  exit 2
fi

# Matched with the apps/mobile/ prefix stripped. The top-level assets/ is absent on
# purpose: it holds the icon and splash that app.json bakes into the binary.
is_ota_safe() {
  case "$1" in
    src/*|docs/*|scripts/*) return 0 ;;
    App.tsx|index.ts) return 0 ;;
    *.md) return 0 ;;
    *) return 1 ;;
  esac
}

blockers=""
while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  rel="${path#"$APP"/}"
  is_ota_safe "$rel" || blockers="${blockers}\n  ${path}"
done <<< "$app_changed"

while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  blockers="${blockers}\n  ${path}  (root — decides what is installed into the binary)"
done <<< "$root_changed"

if [[ -n "$blockers" ]]; then
  echo "Needs a native build — these change what the binary contains:"
  printf '%b\n' "$blockers"
  exit 1
fi

echo "OTA-eligible — only JS, images and docs changed under ${APP}"
exit 0
