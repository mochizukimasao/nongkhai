# Firebase設定ガイド

## 手順1: Firebase Consoleでプロジェクトを作成

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `nongkhai-editor`）
4. Google Analyticsの設定（任意）
5. 「プロジェクトを作成」をクリック

## 手順2: Webアプリを追加

1. プロジェクトのダッシュボードで「</>」アイコン（Webアプリを追加）をクリック
2. アプリのニックネームを入力（例: `nongkhai-web`）
3. 「このアプリのFirebase Hostingも設定します」はチェックしない（Vercelを使用しているため）
4. 「アプリを登録」をクリック
5. 表示された設定情報をコピー（以下の形式）：
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```

## 手順3: firebase-config.jsを更新

取得した設定情報を`js/firebase-config.js`の`firebaseConfig`オブジェクトに記入してください。

## 手順4: Firestoreのセキュリティルールを設定

1. Firebase Consoleで「Firestore Database」を開く
2. 「データベースを作成」をクリック
3. 「テストモードで開始」を選択（後でセキュリティルールを設定します）
4. ロケーションを選択（例: `asia-northeast1` - 東京）
5. 「有効にする」をクリック

### セキュリティルールの設定

Firestore Databaseの「ルール」タブで、以下のルールを設定してください：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のデータのみアクセス可能
    match /users/{userId}/notes/{noteId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

「公開」をクリックして保存してください。

## 手順5: AuthenticationでGoogle認証を有効化

1. Firebase Consoleで「Authentication」を開く
2. 「始める」をクリック
3. 「Sign-in method」タブを開く
4. 「Google」をクリック
5. 「有効にする」をトグルでONにする
6. プロジェクトのサポートメールを選択（デフォルトでOK）
7. 「保存」をクリック

## 手順6: 承認済みドメインの設定（重要）

1. Authenticationの「設定」タブを開く
2. 「承認済みドメイン」セクションで「ドメインを追加」をクリック
3. デプロイ先のドメインを追加（例: `your-app.vercel.app`）
4. ローカル開発用に `localhost` も追加（既に追加されているはず）

## 動作確認

1. ブラウザでアプリを開く
2. サイドバーで「Googleでログイン」ボタンをクリック
3. Googleアカウントでログイン
4. ノートを作成・編集して、Firestoreに同期されることを確認

## トラブルシューティング

### エラー: "Firebase not configured"
- `firebase-config.js`の設定情報が正しく記入されているか確認してください
- ブラウザのコンソールでエラーメッセージを確認してください

### エラー: "Permission denied"
- Firestoreのセキュリティルールが正しく設定されているか確認してください
- ユーザーがログインしているか確認してください

### エラー: "auth/unauthorized-domain"
- Authenticationの承認済みドメインに、現在のドメインが追加されているか確認してください














