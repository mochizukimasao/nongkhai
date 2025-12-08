# Macアプリ版開発ログ

## 概要
このドキュメントは、Nongkhai Mindfulness EditorのMacアプリ版（iCloud Drive統合版）の開発履歴を記録しています。

---

## 2025年12月8日 - Macアプリ版への変換とiCloud連携実装

### 1. Xcodeプロジェクトの準備

#### 1.1 プロジェクト作成
- プロジェクト名: `Nongkhai Mindfulness Editor`
- Bundle Identifier: `com.soi24.Nongkhai-Mindfulness-Editor`
- ターゲット: macOS
- 言語: Swift (SwiftUI)

#### 1.2 WKWebView統合
- `ContentView.swift`を作成し、WKWebViewでWebアプリを表示
- `WebViewCoordinator`クラスでナビゲーションデリゲートを実装
- JavaScriptコンソールログをインターセプトする機能を追加

#### 1.3 リソースのバンドル対応
**問題**: Xcodeがリソースをフラット構造でバンドルするため、相対パスが機能しない

**解決策**:
- `index.html`: CSS/JSファイルのパスを相対パスから直接ファイル名に変更
  - `css/style.css` → `style.css`
  - `js/app.js` → `app.js`
- `css/style.css`: 背景画像のパスを修正
  - `../assets/bg-mekong.webp` → `bg-mekong.webp`
- `js/app.js`: アセットファイルのパスを修正
  - `../assets/bg-mekong.webp` → `bg-mekong.webp`
  - `../assets/rain_full.ogg` → `rain_full.ogg`

#### 1.4 App Sandbox設定
**問題**: App Sandboxが厳しすぎてWKWebViewプロセスがクラッシュ

**解決策**:
- `project.pbxproj`で`ENABLE_APP_SANDBOX = NO;`に設定（開発時のみ）

---

### 2. Firebase認証の無効化

#### 2.1 環境検出機能の実装
`js/app.js`に以下を追加:

```javascript
function isMacApp() {
    // WKWebView in Mac app uses file:// protocol
    return window.location.protocol === 'file:';
}
```

#### 2.2 Firebase認証UIの非表示
- `hideFirebaseAuthUI()`関数を追加
- Macアプリ版では`auth-section`を非表示
- `updateAuthUI()`関数でMacアプリ版を検出して早期リターン

#### 2.3 初期化処理の修正
- `initializeApp()`内でMacアプリ版を検出
- Macアプリ版では`initAuth()`をスキップ
- 代わりに`initICloudSync()`を呼び出す

---

### 3. iCloud Drive統合の実装

#### 3.1 Gitブランチ管理
```bash
# Google/Firebase版をタグで保存
git tag -a google-firebase-complete -m "Google/Firebase実装完成版"

# iCloud連携用のブランチを作成
git checkout -b feature/icloud-sync
```

#### 3.2 Entitlementsファイルの作成
- `Nongkhai Mindfulness Editor.entitlements`を作成
- CloudKitとCloudDocumentsのcapabilityを有効化
- Bundle IdentifierベースのiCloud Containerを設定

#### 3.3 Swift側の実装（iCloudSync.swift）

**クラス構造**:
```swift
@MainActor
class iCloudSyncBridge: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?
    private let container: CKContainer
    
    func setup(webView: WKWebView)
    private func injectJavaScriptBridge()
    private func saveNotes(_ notes: [[String: Any]]) async
    private func loadNotes() async
    private func getSyncStatus() async
}
```

**主要機能**:

1. **JavaScriptブリッジの注入**
   - `window.iCloudSync`オブジェクトを作成
   - `isAvailable()`, `saveNotes()`, `loadNotes()`, `getSyncStatus()`メソッドを提供

2. **CloudKitへの保存（saveNotes）**
   - CKRecordを使用してPrivate Databaseに保存
   - Record Type: "Note"
   - フィールド:
     - `content` (String)
     - `timestamp` (Int64)
     - `favorite` (Int64: 0 or 1)
     - `tags` (String: JSON形式)
   - 既存レコードは更新、新規は作成
   - 最後の同期時刻をUserDefaultsに保存

3. **CloudKitからの読み込み（loadNotes）**
   - CKQueryで全レコードを取得
   - タイムスタンプでソート（新しい順）
   - JSON形式でJavaScriptに返却

4. **認証状態の確認（getSyncStatus）**
   - `CKContainer.accountStatus()`でiCloudアカウント状態を確認
   - available/noAccount/restrictedなどの状態を返却
   - 最後の同期時刻も返却

#### 3.4 JavaScript側の実装（app.js）

**追加された関数**:

1. **initICloudSync()**
   - iCloud Sync APIの初期化
   - アプリ起動時に`loadFromICloud()`を実行
   - 5分ごとの定期同期を設定

2. **loadFromICloud()**
   - CloudKitからノートを読み込み
   - IndexedDBとマージ
   - マージ戦略:
     - 新しいタイムスタンプを優先
     - 新規ノートは追加
     - 既存ノートは新しい方を採用
   - マージ後、ローカルの変更をCloudKitに同期

3. **syncToICloud()**
   - IndexedDBから全ノートを取得
   - CloudKitに保存

4. **queueNoteSyncForMacApp()**
   - ノート変更時の即時同期
   - デバウンス処理（1秒）

5. **queueNoteSync()** (共通関数)
   - 環境に応じてFirebase/iCloudを選択
   - Macアプリ版では`queueNoteSyncForMacApp()`を呼び出し

---

### 4. プロジェクト設定

#### 4.1 Git除外設定
`.gitignore`に以下を追加:
```
Xcode/
*.xcodeproj/
*.xcworkspace/
*.xcuserdata/
*.xcuserstate
*.xcbkptlist
DerivedData/
*.hmap
*.ipa
*.dSYM.zip
*.dSYM
```

`vercel.json`にも除外設定:
```json
{
  "ignore": [
    "Xcode/**"
  ]
}
```

#### 4.2 Build Settings
- `CODE_SIGN_ENTITLEMENTS`: entitlementsファイルのパス
- `ENABLE_APP_SANDBOX`: NO（開発時）

---

### 5. Xcode設定手順（CloudKit有効化）

1. Xcodeでプロジェクトを開く
2. 「Nongkhai Mindfulness Editor」ターゲットを選択
3. 「Signing & Capabilities」タブを開く
4. 「Automatically manage signing」にチェック
5. 「Team」で開発チームを選択（Apple IDでサインインが必要）
6. 「+ Capability」→「iCloud」を追加
   - CloudKit にチェック
   - Cloud Documents にチェック（オプション）

**注意**: Entitlementsファイルが設定されていないとビルドエラーが発生します。

---

## ファイル構造

```
Xcode/Nongkhai Mindfulness Editor/
├── Nongkhai Mindfulness Editor/
│   ├── ContentView.swift           # WKWebView統合
│   ├── iCloudSync.swift            # CloudKitブリッジ
│   ├── Nongkhai Mindfulness Editor.entitlements
│   ├── index.html                  # フラットパス版
│   ├── style.css                   # フラットパス版
│   ├── app.js                      # Macアプリ対応版
│   └── (その他のリソース)
└── README_CLOUDKIT_SETUP.md        # 設定ガイド
```

---

## 実装済み機能

✅ WKWebViewでのWebアプリ表示
✅ リソースパスの修正（フラット構造対応）
✅ Firebase認証UIの非表示
✅ iCloud Sync APIのブリッジ実装
✅ CloudKitへの保存機能
✅ CloudKitからの読み込み機能
✅ IndexedDBとのマージ処理
✅ 自動同期（起動時、5分ごと、変更時）
✅ 認証状態の確認

---

## 未実装・改善点

⚠️ **エラーハンドリングの強化**
- ネットワークエラー時のリトライロジック
- 競合解決のUI

⚠️ **パフォーマンス最適化**
- 大量ノートの同期時の処理
- 差分同期の実装

⚠️ **UI改善**
- 同期状態の表示
- 同期エラーの通知

---

## トラブルシューティング

### ビルドエラー: "has entitlements that require signing"
→ Signing & Capabilities で開発チームを設定

### CloudKitが動作しない
→ iCloud Capabilityが追加されているか確認
→ システム環境設定 > Apple ID > iCloud でCloudKitが有効か確認

### データが同期されない
→ 同じApple IDでログインしているか確認
→ コンソールログでエラーを確認

---

## 参考資料

- [CloudKit Documentation](https://developer.apple.com/documentation/cloudkit)
- [WKWebView Documentation](https://developer.apple.com/documentation/webkit/wkwebview)
- [Entitlements Documentation](https://developer.apple.com/documentation/xcode/configuring-signing-capabilities-and-entitlements)

---

## 開発環境

- macOS: 25.1.0 (darwin)
- Xcode: 26.1.1
- Swift: 5.0
- CloudKit Framework
- WebKit Framework

---

最終更新: 2025年12月8日

