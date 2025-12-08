# ウェブ版開発ログ

## 概要
このドキュメントは、Nongkhai Mindfulness Editorのウェブ版（Firebase/Firestore統合版）の開発履歴を記録しています。

---

## ブランチ情報

### メインブランチ
- **ブランチ**: `main`
- **タグ**: `google-firebase-complete` (2025年12月8日時点)
- **状態**: ✅ ほぼ完成

### 特徴
- Firebase Authentication（Googleログイン）
- Cloud Firestore でのデータ同期
- IndexedDB（Dexie.js）でのローカルストレージ
- リアルタイム同期機能

---

## 主要機能実装履歴

### 1. 基本機能
- マークダウンエディタ（Textwell統合）
- ノートの作成・編集・削除
- ノート一覧表示
- お気に入り機能
- タグ機能
- 検索機能
- 履歴機能
- 設定機能（テーマ、フォント、BGMなど）

### 2. ローカルストレージ
- **ライブラリ**: Dexie.js
- **データベース**: IndexedDB
- **テーブル**: `notes`
  - id (String, Primary Key)
  - content (String)
  - timestamp (Number)
  - favorite (Boolean)
  - tags (Array)

### 3. Firebase統合

#### 3.1 Firebase Authentication
- Googleアカウントでのログイン
- `signInWithPopup()`を使用
- 認証状態の監視（`onAuthStateChanged`）

#### 3.2 Cloud Firestore
- **コレクション**: `users/{userId}/notes`
- **ドキュメントID**: ノートID
- **フィールド**:
  - `content` (string)
  - `timestamp` (timestamp)
  - `favorite` (boolean)
  - `tags` (array)

#### 3.3 同期システム（sync.js）
- `SyncManager`クラスを実装
- IndexedDB ↔ Firestore の双方向同期
- リアルタイムリスナー（`onSnapshot`）
- バッチ同期処理
- 競合解決（タイムスタンプベース）

---

## ファイル構造

```
/
├── index.html                  # メインHTML
├── css/
│   └── style.css              # スタイルシート
├── js/
│   ├── app.js                 # メインアプリケーション
│   ├── firebase-config.js     # Firebase設定
│   └── sync.js                # Firestore同期ロジック
├── assets/                     # 画像・音声ファイル
├── .gitignore
├── vercel.json                # Vercelデプロイ設定
└── package.json               # (Node.js依存関係)
```

---

## デプロイ

### Vercel
- **プラットフォーム**: Vercel
- **設定ファイル**: `vercel.json`
- **キャッシュ設定**: 
  - HTML: `max-age=0, must-revalidate`
  - CSS/JS: `max-age=31536000, immutable`

### 環境変数
- Firebase設定は`firebase-config.js`に直接記述
- 本番環境では環境変数化を推奨

---

## Firebase設定

### 必要なFirebaseサービス
1. **Authentication**
   - Google Sign-In を有効化
   - 認証ドメインを設定

2. **Cloud Firestore**
   - セキュリティルール設定:
     ```javascript
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /users/{userId}/notes/{noteId} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
         }
       }
     }
     ```

---

## 依存関係

### 外部ライブラリ（CDN経由）
- **Dexie.js**: IndexedDBラッパー
  ```html
  <script src="https://unpkg.com/dexie@latest/dist/dexie.js"></script>
  ```

- **Firebase SDK**: Authentication & Firestore
  ```html
  <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-auth.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-firestore.js"></script>
  ```

---

## 同期の仕組み

### 1. ログイン時
1. Firebase認証が成功
2. `SyncManager`が初期化
3. Firestoreリスナーを設定
4. 初回同期（`syncFromFirestore()`）

### 2. ノート変更時
1. IndexedDBに保存
2. `queueNoteSync()`でキューに追加
3. バッチ処理でFirestoreに保存

### 3. Firestore変更時
1. `onSnapshot`で変更を検知
2. IndexedDBと比較
3. 新しい方を採用してマージ

### 4. 競合解決
- タイムスタンプが新しい方を優先
- クライアント側で解決

---

## 既知の制限事項

⚠️ **Macアプリ版での動作**
- `file://`プロトコルではFirebase認証が動作しない
- WKWebView環境では`signInWithPopup()`がサポートされていない
- そのため、Macアプリ版は別途iCloud Drive統合を実装

---

## 改善点・今後の予定

### 実装済み
✅ Googleログイン
✅ Firestore同期
✅ リアルタイム更新
✅ オフライン対応（IndexedDB）

### 検討中
- 他の認証プロバイダー（GitHub、Twitter等）
- ファイルエクスポート/インポート
- 共有機能（ノートの共有）
- マークダウンエディタの機能拡張

---

## トラブルシューティング

### ログインできない
- Firebase設定を確認
- ブラウザのポップアップブロッカーを確認
- 認証ドメインが正しく設定されているか確認

### 同期が動作しない
- Firestoreセキュリティルールを確認
- ネットワーク接続を確認
- ブラウザのコンソールでエラーを確認

### IndexedDBエラー
- ブラウザのストレージ容量を確認
- プライベートブラウジングモードではないか確認

---

## コードの重要な部分

### 同期マネージャーの初期化（sync.js）
```javascript
class SyncManager {
    constructor(firestore, userId) {
        this.firestore = firestore;
        this.userId = userId;
        this.syncQueue = new Set();
        this.syncTimer = null;
    }
    
    async syncFromFirestore() { /* ... */ }
    async syncToFirestore(noteId) { /* ... */ }
    setupFirestoreListener() { /* ... */ }
}
```

### ノートの保存と同期（app.js）
```javascript
async function saveNote(id, content) {
    // IndexedDBに保存
    await db.notes.put({ id, content, timestamp: Date.now() });
    
    // Firestoreに同期
    if (window.syncManager) {
        window.syncManager.queueNoteSync(id);
    }
}
```

---

## 参考資料

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Dexie.js Documentation](https://dexie.org/)
- [Vercel Documentation](https://vercel.com/docs)

---

## 開発環境

- フロントエンド: HTML/CSS/JavaScript (Vanilla JS)
- バックエンド: Firebase (Authentication, Firestore)
- デプロイ: Vercel
- バージョン管理: Git

---

最終更新: 2025年12月8日

