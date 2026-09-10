#!/usr/bin/env bash
# Structural gates for the documentation harness — the rules a reviewer cannot
# hold in their head. Same output shape as arch-gates; same "a gate whose
# target does not exist yet passes" behaviour. Budget: under a second.
#
# Usage: pnpm docs-gate
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

FAILED=0
echo "▶ docs gates"

fail() {
  echo "✖ $1"
  shift
  while [ "$#" -gt 0 ]; do printf '%b\n' "$1"; shift; done
  FAILED=1
}
pass() { echo "✔ $1"; }

# Markdown the gates apply to. plans/ are snapshots — stale by design, excluded.
# git ls-files reports the INDEX, so a partially staged move lists paths that
# are gone from disk; the -f filter keeps the gate from going blind on those.
tracked_docs() {
  git ls-files '*.md' \
    | grep -v '/plans/' \
    | while IFS= read -r f; do [ -f "$f" ] && printf '%s\n' "$f"; done
}

workspaces() {
  local p
  for p in apps/*/package.json packages/*/package.json; do
    [ -f "$p" ] && dirname "$p"
  done
}

# g1 · docs-links — every relative link resolves; no [[wikilinks]].
g1() {
  local broken="" wikilinks="" f dir target clean resolved
  while IFS= read -r f; do
    dir="$(dirname "$f")"
    # Inline code is prose: a doc may *show* a link format without making one.
    while IFS= read -r target; do
      [ -z "$target" ] && continue
      case "$target" in http*|mailto:*|\#*) continue ;; esac
      clean="${target%%#*}"
      [ -z "$clean" ] && continue
      case "$clean" in
        /*) resolved=".${clean}" ;;
        *)  resolved="$dir/$clean" ;;
      esac
      [ -e "$resolved" ] || broken="${broken}\n    $f → $target"
    done < <(sed 's/`[^`]*`//g' "$f" | grep -oE '\]\([^)]+\)' | sed 's/^](//;s/)$//')
    sed 's/`[^`]*`//g' "$f" | grep -q '\[\[' && wikilinks="${wikilinks}\n    $f"
  done < <(tracked_docs)

  if [ -n "$broken" ]; then fail "docs-links: unresolvable relative links" "${broken#\\n}"; fi
  if [ -n "$wikilinks" ]; then fail "docs-links: [[wikilinks]] cannot be followed by any AI tool" "${wikilinks#\\n}"; fi
  [ -z "$broken$wikilinks" ] && pass "docs-links"
}

# g2 · docs-indexed — every doc under docs/ is reachable from docs/README.md.
g2() {
  local missing="" f rel
  [ -f docs/README.md ] || { pass "docs-indexed (not armed — no docs/README.md)"; return; }
  while IFS= read -r f; do
    case "$f" in docs/README.md) continue ;; docs/*) ;; *) continue ;; esac
    rel="${f#docs/}"
    grep -qF "](${rel})" docs/README.md || missing="${missing}\n    ${f}"
  done < <(tracked_docs)
  if [ -n "$missing" ]; then fail "docs-indexed: not linked from docs/README.md" "${missing#\\n}"; else pass "docs-indexed"; fi
}

# g3 · docs-tier — no loose files at the docs root; no folder outside the four tiers.
g3() {
  local bad="" f d n
  for f in docs/*.md; do
    [ -e "$f" ] || continue
    [ "$f" = "docs/README.md" ] || bad="${bad}\n    ${f} — a loose file at the docs root"
  done
  for d in docs/*/; do
    [ -d "$d" ] || continue
    n="$(basename "$d")"
    case "$n" in product|repo|ai-rules|plans) ;; *) bad="${bad}\n    docs/${n}/ — not one of the four tiers" ;; esac
  done
  if [ -n "$bad" ]; then fail "docs-tier" "${bad#\\n}"; else pass "docs-tier"; fi
}

# g4 · workspace-contract — AGENTS.md + CLAUDE.md together, delta header, ≤120 lines.
g4() {
  local bad="" w n
  while IFS= read -r w; do
    if [ ! -f "$w/AGENTS.md" ]; then bad="${bad}\n    ${w}: no AGENTS.md"; continue; fi
    [ -f "$w/CLAUDE.md" ] || bad="${bad}\n    ${w}: AGENTS.md without CLAUDE.md"
    head -5 "$w/AGENTS.md" | grep -q "Root contract" \
      || bad="${bad}\n    ${w}/AGENTS.md: no 'Root contract' delta header in the first five lines"
    n="$(wc -l < "$w/AGENTS.md" | tr -d ' ')"
    [ "$n" -le 120 ] \
      || bad="${bad}\n    ${w}/AGENTS.md: ${n} lines — over 120, a workspace contract is growing into an encyclopedia"
  done < <(workspaces)
  if [ -n "$bad" ]; then fail "workspace-contract" "${bad#\\n}"; else pass "workspace-contract"; fi
}

# g5 · no-duplicate-contract — no root non-negotiable restated in a workspace.
g5() {
  local dup="" w phrase phrases
  phrases="$(awk '/^## Non-Negotiables/{on=1;next} /^## /{on=0} on && /^[0-9]+\. \*\*/' AGENTS.md \
    | sed -E 's/^[0-9]+\. \*\*([^*]+)\*\*.*/\1/')"
  while IFS= read -r w; do
    [ -f "$w/AGENTS.md" ] || continue
    while IFS= read -r phrase; do
      [ -z "$phrase" ] && continue
      grep -qF "$phrase" "$w/AGENTS.md" && dup="${dup}\n    ${w}/AGENTS.md restates: ${phrase}"
    done <<< "$phrases"
  done < <(workspaces)
  if [ -n "$dup" ]; then fail "no-duplicate-contract: a rule written twice drifts" "${dup#\\n}"; else pass "no-duplicate-contract"; fi
}

# g6 · workspace-map — the docs/README.md map and the real workspaces agree.
g6() {
  local bad="" listed actual w
  [ -f docs/README.md ] || { pass "workspace-map (not armed — no docs/README.md)"; return; }
  listed="$(grep -oE '`(apps|packages)/[a-z0-9-]+`' docs/README.md | tr -d '`' | sort -u)"
  actual="$(workspaces | sort -u)"
  while IFS= read -r w; do
    [ -z "$w" ] && continue
    printf '%s\n' "$listed" | grep -qx "$w" || bad="${bad}\n    ${w} exists but is missing from the docs/README.md workspace map"
  done <<< "$actual"
  while IFS= read -r w; do
    [ -z "$w" ] && continue
    printf '%s\n' "$actual" | grep -qx "$w" || bad="${bad}\n    ${w} is in the map but has no package.json"
  done <<< "$listed"
  if [ -n "$bad" ]; then fail "workspace-map" "${bad#\\n}"; else pass "workspace-map"; fi
}

g1; g2; g3; g4; g5; g6

echo ""
if [ "$FAILED" -ne 0 ]; then
  echo "── docs-gate: FAILED ✖"
  exit 1
fi
echo "── docs-gate: all green ✔"
