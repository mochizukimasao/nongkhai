# Nongkhai - OmmWriter Style Editor

集中して書くためのシンプルなエディタアプリケーション。

## 機能

- シンプルで集中できるエディタUI
- 複数のノート管理
- ローカルストレージ（IndexedDB）でデータ保存
- ダークモード/ライトモード切り替え
- フォント切り替え（明朝体/ゴシック体）
- タイピング音（オプション）
- マークダウン記法サポート

## 開発環境のセットアップ

### 方法1: 起動スクリプトを使用（最も簡単）

**Mac/Linux:**
```bash
./start-server.sh
```

**Windows:**
```bash
start-server.bat
```

### 方法2: VS Code/Cursorのタスクから起動

1. `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Windows) でコマンドパレットを開く
2. 「Tasks: Run Task」を選択
3. 「Start Dev Server」を選択

### 方法3: Live Server拡張機能を使用

1. VS Code/Cursorに「Live Server」拡張機能をインストール
2. `index.html`を右クリック → 「Open with Live Server」

### 方法4: Pythonの簡易サーバーを直接起動

```bash
# Python 3の場合
python3 -m http.server 5500

# Python 2の場合
python -m SimpleHTTPServer 5500
```

### 方法5: npmスクリプトを使用

```bash
npm install
npm run dev
```

**サーバー起動後、ブラウザで `http://localhost:5500/index.html` にアクセスしてください。**

## デバッグ方法

### VS Code/Cursorでデバッグ

1. デバッグパネル（Cmd+Shift+D）を開く
2. 設定から以下を選択：
   - **Launch Chrome**: Live Server経由で起動（推奨）
   - **Launch Chrome (Local File)**: ローカルファイルとして直接起動
   - **Launch Edge**: Edgeブラウザで起動

### ブラウザの開発者ツール

- Chrome/Edge: `F12` または `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
- コンソールでJavaScriptのエラーを確認
- ApplicationタブでIndexedDBのデータを確認

## デプロイ

詳細は [DEPLOY.md](./DEPLOY.md) を参照してください。

## ライセンス

MIT

