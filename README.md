# Nongkhai - OmmWriter-style Focused Writing Editor

シンプルで集中できる執筆エディタです。

## 📖 重要: 開発者向け

**このプロジェクトで作業する際は、必ず `PROJECT_LOG.md` を開いて最新の状態を確認してください。**

`PROJECT_LOG.md` には以下が統合されています：
- 開発ログ（修正履歴）
- デバッグ情報
- テスト方法
- デプロイ手順
- 作業手順（どのエディタでも同じ操作ができるように）

## 🚀 クイックスタート

### ローカルで実行

```bash
# ローカルサーバーを起動
python3 -m http.server 8000

# ブラウザで開く
# http://localhost:8000
```

### デプロイ

**`main`ブランチにpushするたびに自動的にデプロイされます。**

```bash
git add .
git commit -m "変更内容の説明"
git push origin main
```

詳細は `PROJECT_LOG.md` の「デプロイ方法」セクションを参照してください。

## 📝 作業手順

1. **`PROJECT_LOG.md` を開く** - 最新の状態を確認
2. **変更を加える** - コードを修正
3. **`PROJECT_LOG.md` に記録** - 開発ログセクションに記録
4. **コミット & プッシュ** - 自動デプロイが開始される
5. **実機でテスト** - デプロイ完了後、実機で動作確認

詳細は `PROJECT_LOG.md` の「作業手順」セクションを参照してください。

## 🛠️ 技術スタック

- バニラJavaScript
- Dexie.js (IndexedDB)
- カスタムCSS
- Vercel (デプロイ)

## 📚 ドキュメント

- **`PROJECT_LOG.md`**: 統合ログ（開発ログ、デバッグ情報、テスト方法、デプロイ手順）

