#!/bin/sh

set -eu
cd "$(dirname "$0")"

echo "See My Voice prototype is starting: http://localhost:${PORT:-4173}"
echo "Press Control + C to stop the server."
if [ -x ../.venv/bin/python ]; then
  ../.venv/bin/python server.py
else
  python3 server.py
fi
