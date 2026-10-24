#!/usr/bin/env bash
# Shadow type-check: tsrs (experimental Rust port of the TypeScript checker) against tsc, one row per tsconfig.
# tsc stays the gate and the emitter; this only reports. Exit 1 when any diagnostics list differs (issue #2).
# Run after `pnpm build`: package typechecks read their workspace dependencies' dist output.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
# tsrs stays out of package.json and the lockfile, so the gating `check` job never installs an experimental binary. The
# exact version lives here; it is installed once into a cache dir. TSRS overrides the binary (CI's temp dir, or a fake to
# test the mismatch path).
TSRS_VERSION=0.18.0-ts7.1.0-dev.20260929
if [ -z "${TSRS:-}" ]; then
  # Per-user cache, never a predictable path in world-writable /tmp (a planted binary would run here).
  cache="${TSRS_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/tsrs-$TSRS_VERSION}"
  [ -x "$cache/node_modules/.bin/tsrs" ] || npm install --silent --no-save --no-package-lock --prefix "$cache" "tsrs@$TSRS_VERSION" >&2
  TSRS="$cache/node_modules/.bin/tsrs"
fi
[ -x "$TSRS" ] || { echo "tsrs not found at $TSRS" >&2; exit 2; }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# [file(line,col): ]error TSnnnn, sorted; location-less errors (TS5083, TS18003, ...) are kept. Message text is
# ignored: wording may differ between versions.
# The path match is greedy, so paths containing parentheses (e.g. a `(routes)` dir) still parse.
diags() { grep -oE '^(.+\([0-9]+,[0-9]+\): )?error TS[0-9]+' | sort || true; }
now() { [ -n "${EPOCHREALTIME:-}" ] && echo "${EPOCHREALTIME/,/.}" || echo 0; }

echo "### tsrs shadow type-check"
echo
ver="$("$TSRS" --version 2>&1 | head -1)" && [ -n "$ver" ] || { echo "tsrs --version failed" >&2; exit 2; }
echo "tsrs: \`$ver\`"
echo
echo "| tsconfig | tsc errors | tsrs errors | match | tsc s | tsrs s |"
echo "|---|---|---|---|---|---|"
status=0
checked=0
for cfg in packages/*/tsconfig.json packages/*/tsconfig.build.json examples/*/tsconfig.json examples/*/tsconfig.node.json; do
  [ -f "$cfg" ] || continue
  dir="$(dirname "$cfg")"; base="$(basename "$cfg")"
  tsc="$ROOT/$dir/node_modules/.bin/tsc"
  # A package without its own tsc breaks the repo rule that each package declares its tools: report it, never skip quietly.
  [ -x "$tsc" ] || { echo "| \`$cfg\` | no tsc | | **skipped** | | |"; status=1; continue; }
  checked=$((checked + 1))
  # Exit codes are compared too: a crash with no diagnostics must not read as parity.
  run() { (cd "$dir" && { "$1" -p "$base" --noEmit --pretty false > "$2.out" 2>&1 && echo 0 || echo $?; } > "$2.code"); diags < "$2.out" > "$2"; }
  t0=$(now); run "$tsc" "$TMP/tsc"; t1=$(now); run "$TSRS" "$TMP/tsrs"; t2=$(now)
  c1=$(cat "$TMP/tsc.code"); c2=$(cat "$TMP/tsrs.code")
  if cmp -s "$TMP/tsc" "$TMP/tsrs" && [ "$c1" = "$c2" ]; then match=yes; else match="**no**"; status=1; fi
  # A non-zero exit with no parsed `error TSnnnn` (panic, bad args, uncoded config error) is never parity.
  for t in tsc tsrs; do
    if [ "$(cat "$TMP/$t.code")" != 0 ] && [ ! -s "$TMP/$t" ]; then match="**no** (unparsed $t failure)"; status=1; fi
  done
  secs() { awk -v a="$1" -v b="$2" 'BEGIN { if (a == 0) print "-"; else printf "%.2f", b - a }'; }
  echo "| \`$cfg\` | $(wc -l < "$TMP/tsc" | tr -d ' ') (exit $c1) | $(wc -l < "$TMP/tsrs" | tr -d ' ') (exit $c2) | $match | $(secs "$t0" "$t1") | $(secs "$t1" "$t2") |"
  if [ "$match" != yes ]; then
    { echo; echo "<details><summary>$cfg: diff (&lt; tsc, &gt; tsrs)</summary>"; echo; echo '```'
      diff "$TMP/tsc" "$TMP/tsrs" || true
      echo "--- tsrs output (first 20 lines)"; head -20 "$TMP/tsrs.out"
      echo '```'; echo "</details>"; } >> "$TMP/diffs"
  fi
done
[ -f "$TMP/diffs" ] && cat "$TMP/diffs"
[ "$checked" -gt 0 ] || { echo "no tsconfig was checked" >&2; exit 2; }
exit "$status"
