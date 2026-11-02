#!/bin/sh
# Full contract run: TypeScript reference first (Prisma migrations), then Rust on the very same database
# (baseline over the Prisma schema). Requires the images rsswipe-ts:contract and rsswipe-rust:contract, see README.md.
set -eu
cd "$(dirname "$0")"
C="docker compose"
$C --profile ts --profile rust --profile ts-jobs --profile rust-jobs down -v >/dev/null 2>&1 || true
$C --profile ts up -d db publisher ts-migrate ts-api
sleep 6
echo "=== TypeScript reference"
IMPL=ts BASE_URL=http://localhost:18080 python3 -m pytest -q -p no:cacheprovider
echo "=== Rust (migrates the Prisma database)"
$C --profile rust up -d rust-migrate rust-api
sleep 4
IMPL=rust BASE_URL=http://localhost:18081 python3 -m pytest -q -p no:cacheprovider
