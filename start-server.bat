@echo off
REM Windows用の開発サーバー起動スクリプト

set PORT=5500

echo 🚀 開発サーバーを起動しています...
echo 📝 ブラウザで http://localhost:%PORT%/index.html を開いてください
echo 🛑 停止するには Ctrl+C を押してください
echo.

REM Python3でサーバーを起動
python -m http.server %PORT%

