# GitHubリポジトリ作成手順

## 方法1: GitHubのWebサイトで作成（推奨・初心者向け）

### 1. GitHubにログイン
1. [GitHub](https://github.com) にアクセス
2. アカウントにログイン（アカウントがない場合は新規登録）

### 2. 新しいリポジトリを作成
1. GitHubの右上にある「+」ボタンをクリック
2. 「New repository」を選択

### 3. リポジトリの設定
以下の情報を入力：
- **Repository name**: `nongkhai`（またはお好みの名前）
- **Description**: （オプション）プロジェクトの説明を入力
- **Public / Private**: 公開/非公開を選択
  - **Public**: 誰でも見れる（無料）
  - **Private**: 自分だけが見れる（無料プランでも利用可能）
- **Initialize this repository with**: 
  - ✅ **Add a README file** は**チェックしない**（既にファイルがあるため）
  - ✅ **Add .gitignore** は**チェックしない**（既に作成済み）
  - ✅ **Choose a license** は任意

### 4. 「Create repository」をクリック

### 5. リポジトリURLをコピー
作成後、表示されるページのURLをコピーします
例: `https://github.com/あなたのユーザー名/nongkhai.git`

## 方法2: GitHub CLIを使用（上級者向け）

### 1. GitHub CLIをインストール
```bash
# macOSの場合
brew install gh

# または公式サイトからインストール
# https://cli.github.com/
```

### 2. GitHub CLIにログイン
```bash
gh auth login
```

### 3. リポジトリを作成
```bash
cd /Users/mochizuki/Documents/VibeCoding/nongkhai
gh repo create nongkhai --public --source=. --remote=origin --push
```

## ローカルでGitを初期化してプッシュする手順

GitHubでリポジトリを作成した後、以下のコマンドを実行します：

### 1. Gitを初期化（まだの場合）
```bash
cd /Users/mochizuki/Documents/VibeCoding/nongkhai
git init
```

### 2. ファイルをステージング
```bash
git add .
```

### 3. 初回コミット
```bash
git commit -m "Initial commit: OmmWriter Style Editor"
```

### 4. ブランチ名をmainに設定（GitHubのデフォルト）
```bash
git branch -M main
```

### 5. リモートリポジトリを追加
```bash
# <あなたのGitHubリポジトリURL> を実際のURLに置き換えてください
# 例: https://github.com/あなたのユーザー名/nongkhai.git
git remote add origin https://github.com/あなたのユーザー名/nongkhai.git
```

### 6. コードをプッシュ
```bash
git push -u origin main
```

## トラブルシューティング

### 認証エラーが出る場合
GitHubは2021年8月からパスワード認証を廃止しています。以下のいずれかの方法を使用してください：

#### 方法A: Personal Access Token（PAT）を使用
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 「Generate new token」をクリック
3. 必要な権限を選択（`repo`権限が必要）
4. トークンをコピー
5. プッシュ時にパスワードの代わりにトークンを入力

#### 方法B: SSHキーを使用（推奨）
```bash
# SSHキーを生成（まだの場合）
ssh-keygen -t ed25519 -C "your_email@example.com"

# SSHキーをクリップボードにコピー
pbcopy < ~/.ssh/id_ed25519.pub

# GitHub → Settings → SSH and GPG keys → New SSH key
# コピーしたキーを貼り付けて保存

# リモートURLをSSHに変更
git remote set-url origin git@github.com:あなたのユーザー名/nongkhai.git
```

### 既にリモートが設定されている場合
```bash
# 現在のリモートを確認
git remote -v

# リモートを変更する場合
git remote set-url origin https://github.com/あなたのユーザー名/nongkhai.git
```

## 次のステップ

GitHubにプッシュした後、Vercelでプロジェクトをインポートできます：
1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. 「Add New...」→「Project」をクリック
3. GitHubリポジトリを選択
4. 「Import」をクリック
5. 設定を確認して「Deploy」をクリック


