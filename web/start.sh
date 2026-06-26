#!/bin/sh

set -eu
cd "$(dirname "$0")"

echo "绘声原型已启动：http://localhost:4173"
echo "按 Control + C 停止服务。"
if [ -x ../.venv/bin/python ]; then
  ../.venv/bin/python server.py
else
  python3 server.py
fi
