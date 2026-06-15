#!/bin/sh

set -eu
cd "$(dirname "$0")"

echo "声见原型已启动：http://localhost:4173"
echo "按 Control + C 停止服务。"
python3 server.py
