# Nongkhai - OmmWriter Style Editor

集中して書くためのシンプルなエディタアプリケーション。

## 🚀 プロジェクトステータス

**現在のフェーズ:** 🛠 リファクタリング完了 & モバイル対応準備中

- ✅ **基本機能**: ノート作成、編集、保存、削除、復元、テーマ切り替え、サウンド。
- ✅ **コードベース**: `index.html` + `css/style.css` + `js/app.js` の構成に整理済み。
- 🚧 **モバイル対応**: レスポンシブデザインの改善に着手予定。
- 📅 **同期機能**: Google Drive連携を計画中。

## 🗺 ロードマップ

### 🚀 フェーズ1: モバイルレスポンシブ対応（次のタスク）

#### 現状の問題
- スマートフォン画面でのレイアウト崩れ
- サイドバーがモバイルで常時表示されて画面を圧迫
- 画面サイズに応じた適切なフォントサイズ調整が必要

#### 実装タスク（優先度順）

##### 1. `css/style.css` の修正
- [ ] **メディアクエリの追加**
  ```css
  /* タブレット: 768px以下 */
  @media (max-width: 768px) { ... }
  
  /* スマートフォン: 480px以下 */
  @media (max-width: 480px) { ... }
  ```

- [ ] **エディタエリア（.editor-area）の調整**
  - パディング調整（左右: 16px、上下: 20px）
  - フォントサイズ: デスクトップ 18px → モバイル 16px
  - line-height の調整

- [ ] **サイドバー（.sidebar）の対応**
  - モバイル: オーバーレイ表示（ハンバーガーメニューから開閉）
  - スワイプジェスチャーでの開閉を検討

- [ ] **ビューポート設定の確認**
  - `index.html` の `<meta name="viewport">` タグを確認

##### 2. `js/app.js` の修正
- [ ] **タッチイベントの追加**
  - サイドバーのスワイプ開閉機能（オプション）
  - ダブルタップでのフルスクリーン切り替え

- [ ] **画面サイズ検出**
  ```javascript
  const isMobile = window.innerWidth <= 768;
  ```
  - モバイル時のUI動作切り替え処理

- [ ] **仮想キーボード対応**
  - iOS/Androidの仮想キーボード表示時のレイアウト調整
  - `visualViewport` APIの活用を検討

##### 3. `index.html` の修正
- [ ] **ビューポート設定**
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  ```

- [ ] **ハンバーガーメニューボタンの追加**（モバイル専用）
  - サイドバー開閉用のボタン
  - CSSで `display: none` → メディアクエリで `display: block`

#### テスト方法
1. **Chrome DevTools**
   - `F12` → デバイスツールバーで各画面サイズをテスト
   - iPhone SE, iPhone 14 Pro, iPad, Samsung Galaxy S20

2. **実機テスト**
   - Vercelデプロイ後、実際のスマートフォンで動作確認
   - iOS Safari、Android Chrome で検証

3. **チェックポイント**
   - [ ] 320px幅でもレイアウトが崩れない
   - [ ] テキストが読みやすい（16px以上）
   - [ ] 仮想キーボード表示時も使いやすい
   - [ ] 横向き（landscape）でも正常動作

#### 参考リソース
- [Apple Human Interface Guidelines - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Material Design - Touch Targets](https://m3.material.io/foundations/interaction/input-accessibility)
- [MDN - Viewport meta tag](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag)

---

### 🔮 フェーズ2: Google Drive 同期
- [ ] Google Cloud Project設定
- [ ] OAuth認証の実装
- [ ] ファイルのアップロード/ダウンロード同期

### 🌟 将来の構想
- [ ] PWA (Progressive Web App) 化
- [ ] オフライン動作の強化
- [ ] エクスポート機能の拡充 (PDF, Word等)

## 📝 更新履歴

### 2025-11-25: コードベースのリファクタリング
- **ファイル分離**: `editor.html` の機能を `index.html` に統合し、CSSとJSを外部ファイル (`css/style.css`, `js/app.js`) に分離しました。
- **クリーンアップ**: 不要になった `editor.html` を削除し、プロジェクト構成をシンプルにしました。
- **UI調整**: ツールバーのレイアウトをユーザーの要望に合わせて調整しました。

---

## ✨ 機能

- **集中できるUI**: ミニマルなデザインとアニメーション。
- **データ永続化**: IndexedDB (Dexie.js) を使用してブラウザ内に自動保存。
- **カスタマイズ**:
    - ダークモード / ライトモード
    - フォント切り替え（明朝体 / ゴシック体）
    - 環境音（雨、カフェ、焚き火など - *実装予定*）/ タイピング音
- **マークダウン**: 基本的なマークダウン記法をサポート。

## 🛠 開発環境のセットアップ

### 方法1: 起動スクリプトを使用（推奨）

**Mac/Linux:**
```bash
./start-server.sh
```

**Windows:**
```bash
start-server.bat
```

### 方法2: npmスクリプト

```bash
npm install
npm run dev
```

**サーバー起動後、ブラウザで `http://localhost:5500/index.html` にアクセスしてください。**

## デバッグ方法

- **Chrome/Edge**: `F12` で開発者ツールを開き、Consoleでエラーを確認、ApplicationタブでIndexedDBを確認できます。

## デプロイ

詳細は [DEPLOY.md](./DEPLOY.md) を参照してください。

## ライセンス

MIT
