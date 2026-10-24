#!/usr/bin/env bash
# Runs `pnpm e2e` inside the official Playwright image, the platform the screenshot baselines come from. Arguments go
# to `playwright test`, so `pnpm e2e --update-snapshots` rewrites e2e/snapshots/*-linux.png and leaves them on the host.
#
# The image needs the version of @playwright/test in e2e/package.json. The working tree is copied in (without
# node_modules or dist, which are built for this machine), then installed and built there, so nothing in the host's
# node_modules is touched. Snapshots and test results are bind-mounted back out. DOCKER overrides the docker binary.
set -euo pipefail
cd "$(dirname "$0")/.."
DOCKER="${DOCKER:-docker}"
command -v "$DOCKER" >/dev/null || { echo "docker not found: install it or set DOCKER=/path/to/docker" >&2; exit 2; }
version="$(node -p "require('./e2e/package.json').devDependencies['@playwright/test']")"
image="mcr.microsoft.com/playwright:v${version}-noble"
mkdir -p e2e/snapshots e2e/test-results

# `bash -c` script, run in the container; the first argument after it is the host uid:gid, the rest go to playwright.
inside='
set -euo pipefail
owner="$1"; shift
trap '\''chown -R "$owner" /work/e2e/snapshots /work/e2e/test-results 2>/dev/null || true'\'' EXIT
mkdir -p /work && tar -xf - -C /work && cd /work
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 E2E_IN_DOCKER=1
corepack enable
pnpm config set store-dir /pnpm-store
pnpm install --frozen-lockfile
pnpm --filter "@venture-ui/e2e..." build
pnpm e2e "$@"
'
# COPYFILE_DISABLE: macOS tar would otherwise add ._* metadata files, which Playwright would try to load as tests.
COPYFILE_DISABLE=1 tar --exclude=node_modules --exclude=dist --exclude=.git --exclude=playwright-report \
  --exclude=e2e/snapshots --exclude=e2e/test-results -cf - . |
  "$DOCKER" run --rm -i --init --ipc=host \
    -v venture-ui-pnpm-store:/pnpm-store \
    -v "$PWD/e2e/snapshots:/work/e2e/snapshots" \
    -v "$PWD/e2e/test-results:/work/e2e/test-results" \
    "$image" bash -c "$inside" bash "$(id -u):$(id -g)" "$@"
