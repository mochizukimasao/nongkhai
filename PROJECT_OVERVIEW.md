# Nongkhai Mindfulness Editor - プロジェクト概要

## プロジェクトについて

Nongkhai Mindfulness Editorは、マークダウンエディタとノート管理機能を備えたWebアプリケーションです。
現在、ウェブ版（Firebase統合）とMacアプリ版（iCloud Drive統合）の2つのバージョンがあります。

---

## バージョン構成

### 🌐 ウェブ版（main ブランチ）
- **同期システム**: Firebase Authentication + Cloud Firestore
- **デプロイ**: Vercel
- **状態**: ✅ ほぼ完成
- **詳細**: [DEVELOPMENT_LOG_WEB.md](./DEVELOPMENT_LOG_WEB.md)

### 🖥️ Macアプリ版（feature/icloud-sync ブランチ）
- **同期システム**: CloudKit/iCloud Drive
- **プラットフォーム**: macOS (Xcode/SwiftUI)
- **状態**: 🚧 開発中（基盤完成）
- **詳細**: [DEVELOPMENT_LOG_MAC_APP.md](./DEVELOPMENT_LOG_MAC_APP.md)

---

## ディレクトリ構造

```
nongkhai/
├── DEVELOPMENT_LOG_WEB.md          # ウェブ版開発ログ
├── DEVELOPMENT_LOG_MAC_APP.md      # Macアプリ版開発ログ
├── PROJECT_OVERVIEW.md             # このファイル
│
├── index.html                      # ウェブ版メインHTML
├── css/
│   └── style.css                   # スタイルシート
├── js/
│   ├── app.js                      # メインアプリケーション
│   ├── firebase-config.js          # Firebase設定（ウェブ版用）
│   └── sync.js                     # Firestore同期ロジック（ウェブ版用）
├── assets/                         # 画像・音声ファイル
│
├── Xcode/                          # Macアプリ版プロジェクト（Git除外）
│   ├── Nongkhai Mindfulness Editor/
│   │   ├── ContentView.swift       # WKWebView統合
│   │   ├── iCloudSync.swift        # CloudKitブリッジ
│   │   ├── index.html              # Macアプリ版用（フラットパス）
│   │   ├── style.css               # Macアプリ版用（フラットパス）
│   │   └── app.js                  # Macアプリ版用（iCloud対応）
│   └── README_CLOUDKIT_SETUP.md    # CloudKit設定ガイド
│
├── .gitignore
├── vercel.json                     # Vercelデプロイ設定
└── package.json                    # Node.js依存関係（あれば）
```

---

## Gitブランチ戦略

### メインブランチ
```
main (ウェブ版 - Firebase統合)
  └─ タグ: google-firebase-complete
```

### 機能ブランチ
```
feature/icloud-sync (Macアプリ版 - iCloud統合)
```

### 切り替え方法

**ウェブ版に切り替え**:
```bash
git checkout main
```

**Macアプリ版に切り替え**:
```bash
git checkout feature/icloud-sync
```

**特定のタグ（完成版）に戻す**:
```bash
git checkout google-firebase-complete
```

---

## 共通機能

両バージョンで共通の機能：

✅ マークダウンエディタ（Textwell統合）
✅ ノートの作成・編集・削除
✅ ノート一覧表示
✅ お気に入り機能
✅ タグ機能
✅ 検索機能
✅ 履歴機能
✅ 設定機能（テーマ、フォント、BGM、背景画像）
✅ ローカルストレージ（IndexedDB/Dexie.js）

---

## バージョン固有の機能

### ウェブ版のみ
- Firebase Authentication（Googleログイン）
- Cloud Firestore同期
- リアルタイム同期
- 複数デバイス間の同期

### Macアプリ版のみ
- ネイティブMacアプリとしての動作
- CloudKit/iCloud Drive同期
- Apple IDでの同期（Firebase不要）
- オフライン優先の動作

---

## 開発の続き方

### 新しい環境で作業を始める場合

1. **リポジトリをクローン**
   ```bash
   git clone <repository-url>
   cd nongkhai
   ```

2. **作業したいバージョンのブランチに切り替え**
   ```bash
   # ウェブ版
   git checkout main
   
   # Macアプリ版
   git checkout feature/icloud-sync
   ```

3. **開発ログを確認**
   - ウェブ版: `DEVELOPMENT_LOG_WEB.md`を読む
   - Macアプリ版: `DEVELOPMENT_LOG_MAC_APP.md`を読む

4. **開発環境をセットアップ**
   - ウェブ版: 必要なライブラリを確認（CDN経由なので通常は不要）
   - Macアプリ版: Xcodeで開いて、Signing & Capabilitiesを設定

---

## 技術スタック

### ウェブ版
- **フロントエンド**: HTML/CSS/JavaScript (Vanilla JS)
- **ローカルDB**: IndexedDB (Dexie.js)
- **認証・同期**: Firebase (Authentication, Firestore)
- **デプロイ**: Vercel

### Macアプリ版
- **フレームワーク**: SwiftUI
- **Web表示**: WKWebView
- **ローカルDB**: IndexedDB (Dexie.js) - JavaScript側
- **認証・同期**: CloudKit/iCloud Drive
- **開発環境**: Xcode

---

## 重要な注意事項

### ⚠️ Macアプリ版の開発
- Xcodeフォルダは`.gitignore`で除外されているため、Gitに含まれません
- Xcodeプロジェクトはローカルのみで管理されます
- EntitlementsファイルやSigning設定は各自の環境で設定が必要です

### ⚠️ ウェブ版の開発
- Firebase設定（`firebase-config.js`）は公開されているため、本番環境では環境変数化を推奨
- Vercelへのデプロイ時は、`vercel.json`の設定を確認

---

## 今後の開発予定

### Macアプリ版
- [ ] CloudKit設定の完了とテスト
- [ ] エラーハンドリングの強化
- [ ] 同期状態のUI表示
- [ ] App Store申請準備

### ウェブ版
- [ ] 他の認証プロバイダー追加
- [ ] ファイルエクスポート/インポート機能
- [ ] 共有機能

---

## 連絡・サポート

開発に関する質問や問題があれば、開発ログを参照するか、GitHubのIssueを作成してください。

---

最終更新: 2025年12月8日

