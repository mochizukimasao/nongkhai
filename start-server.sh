#!/bin/bash

# 開発サーバーを起動するスクリプト

PORT=5500

echo "🚀 開発サーバーを起動しています..."
echo "📝 ブラウザで http://localhost:$PORT/index.html を開いてください"
echo "🛑 停止するには Ctrl+C を押してください"
echo ""

# ポートが使用中かチェック
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  ポート $PORT は既に使用されています"
    echo "別のポートを使用するか、既存のサーバーを停止してください"
    exit 1
fi

# Python3でサーバーを起動
python3 -m http.server $PORT

