#!/usr/bin/env bash
# `pnpm e2e`: Playwright against the built gallery (run `pnpm build` first). Extra arguments go to `playwright test`.
#
# Screenshot baselines are rendered by Chromium on Linux in the official Playwright image, so a macOS or Windows
# run never matches them. Outside that image this script re-runs itself in it (scripts/e2e-docker.sh); CI runs
# in the same image and sets E2E_IN_DOCKER itself.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -z "${E2E_IN_DOCKER:-}" ]; then exec bash scripts/e2e-docker.sh "$@"; fi
[ -f examples/gallery/dist/index.html ] || { echo "examples/gallery/dist is missing: run pnpm build first" >&2; exit 2; }
exec pnpm --filter @venture-ui/e2e exec playwright test "$@"
