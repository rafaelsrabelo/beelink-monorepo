#!/usr/bin/env bash
# Publish an over-the-air update to the production channel, guarded against the
# known footguns. See apps/mobile/docs/release-ota.md.
#
#   pnpm --filter mobile ota -- "fix: <what changed>"
#   pnpm --filter mobile ota -- --dry-run "fix: <what changed>"
#
# Guards:
#   1. on main, clean, in sync with origin/main — never OTA from a branch
#   2. apps/mobile/package.json version == the latest mobile@<version> tag, so the
#      bundle's runtime matches the binaries that are actually in the stores
#   3. the diff since that tag is OTA-eligible (ota-eligible.sh exits 0)
set -euo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
  shift
fi

MSG="${1:-}"
if [[ -z "$MSG" ]]; then
  echo 'usage: pnpm --filter mobile ota -- [--dry-run] "fix: <what changed>"' >&2
  exit 1
fi

ROOT="$(git rev-parse --show-toplevel)"
git -C "$ROOT" fetch origin --tags --quiet

branch="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)"
if [[ "$branch" != "main" ]]; then
  echo "aborted: an update is published from main only (current branch: ${branch})." >&2
  exit 1
fi

if [[ -n "$(git -C "$ROOT" status --porcelain)" ]]; then
  echo "aborted: the working tree is dirty — an update publishes exactly what is on main." >&2
  exit 1
fi

if [[ "$(git -C "$ROOT" rev-parse HEAD)" != "$(git -C "$ROOT" rev-parse origin/main)" ]]; then
  echo "aborted: local main is not origin/main — pull first." >&2
  exit 1
fi

version="$(node -p "require('${ROOT}/apps/mobile/package.json').version")"
latest_tag="$(git -C "$ROOT" tag --list 'mobile@*' --sort=-v:refname | head -1)"

if [[ -z "$latest_tag" ]]; then
  echo "aborted: no store release is tagged yet (mobile@<version>). Ship a store build first." >&2
  exit 1
fi

if [[ "$latest_tag" != "mobile@${version}" ]]; then
  echo "aborted: package.json says ${version}, but the latest store release is ${latest_tag}." >&2
  echo "  A pending version bump would publish for a runtime no installed binary has." >&2
  exit 1
fi

set +e
bash "${ROOT}/apps/mobile/scripts/ota-eligible.sh" "$latest_tag" HEAD
verdict=$?
set -e

case "$verdict" in
  0) ;;
  2) echo "nothing to publish: apps/mobile is unchanged since ${latest_tag}."; exit 0 ;;
  *) echo "aborted: the change since ${latest_tag} needs a store build, not an update." >&2; exit 1 ;;
esac

cmd=(pnpm --dir "${ROOT}/apps/mobile" exec eas update --channel production --message "$MSG" --non-interactive)

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "dry run — would run: ${cmd[*]}"
  exit 0
fi

"${cmd[@]}"
