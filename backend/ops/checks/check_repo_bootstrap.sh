#!/usr/bin/env bash
set -euo pipefail
test -f package.json
test -f pnpm-workspace.yaml
echo "Bootstrap files exist."
