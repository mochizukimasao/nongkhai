# Vercelデプロイ手順

## 方法1: Vercel CLIを使用（推奨）

### 1. Vercel CLIをインストール
```bash
npm install -g vercel
```

### 2. Vercelにログイン
```bash
vercel login
```

### 3. プロジェクトをデプロイ
```bash
vercel
```

初回デプロイ時は、いくつか質問されます：
- **Set up and deploy?** → `Y` を選択
- **Which scope?** → あなたのアカウントを選択
- **Link to existing project?** → `N` を選択（新規プロジェクトの場合）
- **Project name?** → プロジェクト名を入力（またはEnterでデフォルト）
- **Directory?** → `./` を入力（またはEnterでデフォルト）

### 4. 本番環境にデプロイ（オプション）
```bash
vercel --prod
```

## 方法2: GitHubと連携する方法

### 1. GitHubにリポジトリを作成
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <あなたのGitHubリポジトリURL>
git push -u origin main
```

### 2. Vercelでプロジェクトをインポート
1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. 「Add New...」→「Project」をクリック
3. GitHubリポジトリを選択
4. 「Import」をクリック
5. 設定を確認して「Deploy」をクリック

## デプロイ後の確認

デプロイが完了すると、VercelからURLが提供されます（例: `https://your-project.vercel.app`）

## 注意事項

- このプロジェクトは静的サイトなので、追加のビルド設定は不要です
- `index.html`がルートパス（`/`）で配信されます
- IndexedDB（Dexie）はブラウザのローカルストレージを使用するため、各ユーザーのブラウザにデータが保存されます


