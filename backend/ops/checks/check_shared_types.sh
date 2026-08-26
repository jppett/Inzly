#!/usr/bin/env bash
set -euo pipefail
test -f schemas/address-request.json
test -f schemas/event-envelope.json
echo "Schemas present. Shared types can be generated/consumed."
