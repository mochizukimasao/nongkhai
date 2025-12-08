# Nongkhai プロジェクトログ

**重要**: このファイルは、どのエディタで作業しても同じ操作・過程が追えるように、すべての開発ログ、デバッグ情報、テスト方法、デプロイ手順を統合したドキュメントです。

---

## 📋 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [作業手順（どのエディタでも同じ操作）](#作業手順どのエディタでも同じ操作)
3. [開発ログ](#開発ログ)
4. [デバッグ情報](#デバッグ情報)
5. [テスト方法](#テスト方法)
6. [デプロイ方法](#デプロイ方法)
7. [トラブルシューティング](#トラブルシューティング)

---

## プロジェクト概要

### 技術スタック
- **フレームワーク**: バニラJavaScript（React/Vue等のフレームワークなし）
- **データベース**: Dexie.js (IndexedDBラッパー)
- **スタイリング**: カスタムCSS
- **デプロイ**: Vercel

### ファイル構成
```
nongkhai/
├── index.html          # メインHTMLファイル
├── js/
│   └── app.js         # メインJavaScriptファイル（約1200行）
├── css/
│   └── style.css      # スタイルシート
├── .github/
│   └── workflows/
│       └── deploy.yml # 自動デプロイワークフロー
├── vercel.json        # Vercel設定
└── PROJECT_LOG.md     # このファイル（統合ログ）
```

### 現在の主要問題
- **モバイルツールバーのスクロール問題**: モバイルデバイスでツールバーのスクロールとボタンクリックが競合する問題

---

## 作業手順（どのエディタでも同じ操作）

### ⚠️ 重要: 作業前の確認事項

1. **このファイル（PROJECT_LOG.md）を開く**
   - どのエディタでも、まずこのファイルを開いて最新の状態を確認
   - 作業開始前に「開発ログ」セクションを確認

2. **変更を加える前に（Gitの履歴と方針チェック）**
- 現在のブランチを確認: `git branch`
- 作業ツリーの状態を確認: `git status`
- 直近の履歴を確認: `git log --oneline -5`
- 安定版タグ（ユーザーが気に入った状態）を確認: `git show ommwriter-stable-v1`
- 最新の状態を取得: `git pull origin main`

> メモ: タグ `ommwriter-stable-v1` は、背景とBGMの状態が「これだよ」となったコミット `fef08a6` を指します。  
> 迷ったら、`git diff ommwriter-stable-v1..main` で「今のmainが安定版からどれだけ変わっているか」を確認してから作業を始めてください。

3. **変更を加えた後**
   - **必ずこのファイル（PROJECT_LOG.md）の「開発ログ」セクションに記録**
   - 日付、問題の概要、実施した修正、検証結果を記録
   - コミット前に確認: `git status`

4. **コミットとプッシュ**
   ```bash
   git add .
   git commit -m "説明: 変更内容の簡潔な説明"
   git push origin main
   ```
   - **注意**: `main`ブランチにpushすると自動的にデプロイされます

5. **デプロイ確認**
   - Vercelのダッシュボードでデプロイの進行状況を確認
   - デプロイ完了後、実機でテスト

### 📝 ログの記録方法

このファイルの「開発ログ」セクションに、以下の形式で記録してください：

```markdown
## [YYYY-MM-DD] 問題のタイトル

### 1. 問題の概要
- 何が問題だったか

### 2. 実施した修正
- 何を修正したか
- どのファイルを変更したか

### 3. 検証結果
- ✅ 成功 / ⏳ 検証待ち / ❌ 失敗

### 4. 次のステップ
- 次に何をするか
```

---

## 開発ログ

### [2025-12-08] ブックマーク表示を1箇所に集約

### 1. 問題の概要
- ブックマークを付けた際にサイドバー（ノート一覧）左下にもマークが出ており、右上の元位置と重複表示していた。

### 2. 実施した修正
- `js/app.js` でサイドバーのノート一覧に表示していたブックマーク用のアイコンを削除し、右上の元の位置だけに限定。

### 3. 検証結果
- ✅ 手元ブラウザで表示確認（サイドバー左下の重複アイコンが消え、右上のブックマークのみ表示）。

### 4. 次のステップ
- ⏳ main へプッシュして自動デプロイを実行し、デプロイ後にUIを再確認。

### [2025-12-07] 羽根モチーフの新ファビコンを追加

### 1. 問題の概要
- 既存の `favicon.png` は仮のアイコンだったため、ユーザー提供の羽根アートを反映したい。

### 2. 実施した修正
- `assets/Image_202512071104.jpeg` を追加（提供画像をそのまま保管）。
- `sips` で中央を正方形にトリミングして `assets/favicon-crop.png` を生成し、さらに 512x512px に縮小して `favicon.png` を差し替え。
- `index.html` の既存リンク（`favicon.png`）でそのまま参照できるため追加のHTML改修は不要。

### 3. 検証結果
- ✅ `sips -g pixelWidth -g pixelHeight favicon.png` で 512x512px のPNGになっていることを確認。

### 4. 次のステップ
- デプロイ後にブラウザのキャッシュをクリアして新しいファビコンが表示されるか確認する。

### [2025-12-07] アプリ配布向けアイコンアセットを整備

### 1. 問題の概要
- 将来的なアプリ配布（iOS/Android/デスクトップ）に備えて、複数サイズのアイコンPNGが必要。

### 2. 実施した修正
- `assets/app-icon/` ディレクトリを新設し、`favicon-crop.png` を元に `sips` で以下のサイズ（px）のPNGを生成: 1024, 512, 256, 192, 180, 152, 128, 120, 96, 72, 48。
- いずれも同じ羽根アートで背景透過なし（黒背景）の正方形に統一。

### 3. 検証結果
- ✅ `ls -l assets/app-icon` と `sips -g pixelWidth -g pixelHeight assets/app-icon/app-icon-1024.png` でサイズ出力を確認。

### 4. 次のステップ
- 各プラットフォームのアイコンジェネレータ（Xcode AppIcon/Android adaptive icon等）にこれらPNGを投入し、必要なフォーマット（`.icns`、`.ico`など）をその場で生成する。

### [2025-12-07] Textwell風カーソル追従機能の実装（長押し発動）

### 1. 問題の概要
- モバイルデバイスで、テキスト上をスライドしてカーソルを移動させたい（Textwellのような挙動）。
- ただし、通常のスクロール操作と競合しないようにする必要がある。

### 2. 実施した修正
- `js/app.js`:
  - `initTextwellCursorTracking` 関数を追加。
  - 長押し（300ms）でカーソルモードが発動するロジックを実装。
  - カーソルモード中は `touchmove` でカーソル位置を更新し、スクロールを無効化。
  - 通常のフリック操作はスクロールとして機能するように、長押し判定前に移動した場合はタイマーをキャンセル。
  - `initOtherEventListeners` 内で初期化関数を呼び出し。
- `css/style.css`:
  - `#highlight-layer` に `transition: opacity 0.2s ease` を追加（モード発動時の視覚フィードバック用）。

### 3. 検証結果
- ⏳ デプロイ後に実機で検証が必要。
  - 長押しで少し暗くなり、カーソル移動ができるか。
  - すぐにスワイプした場合はスクロールするか。

### 4. 次のステップ
- 実機での動作確認。

### [2025-12-07] しおり位置の視覚インジケータ追加

### 1. 機能概要
- しおりを設置すると、エディタ上のその位置に🔖マークが表示される。
- これにより、しおりがどこにあるか一目でわかる。

### 2. 実施した修正
- `js/app.js`: `updateHighlights()` で `window.currentBookmarkPos` を参照し、その位置に🔖マークを挿入。
- `css/style.css`: `.bookmark-marker` スタイルを追加（脈動アニメーション付き）。

### 1. 機能概要
- ノートごとに1つの「しおり」を設置できる。
- しおりを設置すると、次回そのノートを開いた時に自動的にその位置にカーソルが移動し、スクロールされる。

### 2. 実施した修正
- `index.html`: ツールバーにしおりボタン（リボンアイコン）を追加。
- `js/app.js`:
  - `toggleBookmark()`: 現在のカーソル位置をしおりとして保存/解除する関数を追加。
  - `updateBookmarkState()`: ボタンのアクティブ状態を更新する関数を追加。
  - `loadNote()`: ノート読み込み時に `bookmarkPosition` があればカーソルとスクロールを復元。

### 3. データモデル
- `notes` テーブルに `bookmarkPosition` (number | null) フィールドを追加（IndexedDBは自動拡張）。

### 4. 検証結果
- ⏳ デプロイ後に実機で検証。

### 1. 変更の概要
- 新しい `favicon.png` のデザインを、将来的なPWA化やストア公開に備えて `assets/app-icon/` 内の主要なサイズ（1024, 512, 192, 180）にも適用。

### 2. 実施した修正
- `favicon.png` をコピーして各アイコンファイルを上書き。

### 3. 検証結果
- ⏳ ファイルの更新を確認。

### 1. 変更の概要
- ユーザー提供の画像を元に、視認性を高めた新しいアイコン画像を生成。
- 中央のモチーフ（羽）を斜めの角度のまま最大化し、フレーム内に収まるように調整。

### 2. 実施した修正
- 生成した画像を `favicon.png` として保存し、既存のアイコンを置き換え。

### 3. 検証結果
- ⏳ デプロイ後にブラウザタブやブックマークアイコンでの表示を確認。

### 1. 問題の概要
- 検索プレースホルダーが日本語で、英語UIの中で浮いている。
- 検索バーの「×」ボタンが、検索文字を消すだけでバー自体を閉じないため、直感的でない。
- 検索ボックスとボタンの高さが揃っておらず、デザインが不統一。

### 2. 実施した修正
- `index.html`: プレースホルダーを "Search..." に変更。
- `js/app.js`: 「×」ボタンクリック時に、検索クリアだけでなく検索バー自体を閉じる（非表示にする）ように変更。
- `css/style.css`: 検索ボックスとボタンの高さを `32px` に統一し、デザインを整列。

### 3. 検証結果
- ⏳ デプロイ後に実機で検証。

### 1. 問題の概要
- ツールバーボタンによる切り替え方式を試したが、ユーザー体験として「快適ではなかった」ため、元の長押し方式に戻すことに。

### 2. 実施した修正
- `index.html`: 追加した「カーソルモード」ボタンを削除。
- `js/app.js`:
  - ボタン関連のロジックを削除。
  - 長押し（300ms）でモード発動、指を離すと解除する元のロジックを復元。
  - 縦方向の「高速スクラブ」機能は好評だったため維持。

### 3. 検証結果
- ⏳ デプロイ後に実機で検証。

### 4. 次のステップ
- 実機での動作確認。

### 1. 問題の概要
- 長押しでのカーソルモード発動は、iOS標準のカーソル移動機能（空白キー長押しなど）と競合しやすく、意図せず切り替わってしまうことがある。
- ユーザーより、ツールバーに専用ボタンを設置して切り替える方式への変更要望あり。

### 2. 実施した修正
- `index.html`: ツールバーの「下移動」ボタンと「選択モード」ボタンの間に、新しい「カーソルモード」ボタン（十字矢印アイコン）を追加。
- `js/app.js`:
  - 長押し判定ロジックを削除。
  - 新しいボタンのクリックイベントで `isCursorMode` をトグルするように変更。
  - モードON時はボタンがハイライトされ、エディタ全体がトラックパッド化する（スクロール無効、カーソル移動のみ）。
  - モードOFF時は通常のスクロールが可能。

### 3. 検証結果
- ⏳ デプロイ後に実機で検証。

### 4. 次のステップ
- 実機での動作確認。

### 1. 問題の概要
- 縦方向の移動が「1行飛ばし」になる問題が解決しない。
- プログラム的に正確な「視覚的な1行」を判定するのは難易度が高く、推定値によるジャンプではどうしてもズレが生じる。

### 2. 実施した修正
- `js/app.js`:
  - 縦方向の移動を「行ジャンプ」から**「高速な文字送り（スクラブ）」**に変更。
  - 縦に1px動かすと約0.5文字分進む（横移動の約6倍の速度）。
  - これにより、「カクッ」と飛ぶのではなく、「ヌルヌル」と高速に移動できるようになり、行き過ぎた場合も微調整が容易になる。

### 3. 検証結果
- ⏳ デプロイ後に実機で検証。

### 4. 次のステップ
- 実機での動作確認。

### 1. 問題の概要
- 縦方向の移動が「1行飛ばし」のように大きく動いてしまい、ぎこちない。
- 原因: 1行あたりの文字数（`charsPerLine`）の推定に使っていた「平均文字幅」が小さすぎた（`0.6em`）。日本語（全角）主体の環境では、実際の1行の文字数よりも多く見積もられてしまい、結果として1回の移動で大きくジャンプしていた。

### 2. 実施した修正
- `js/app.js`:
  - 平均文字幅の係数を `0.6` → `0.95` に変更。
  - これにより `charsPerLine` が実態（全角文字ベース）に近づき、縦移動のジャンプ幅が適正化されるはず。

### 3. 検証結果
- ⏳ デプロイ後に実機で検証。

### 4. 次のステップ
- 実機での動作確認。

### 1. 問題の概要
- 左右移動は快適になったが、上下移動もしたいとの要望。

### 2. 実施した修正
- `js/app.js`:
  - 画面幅とフォントサイズから「1行あたりの文字数」を概算するロジックを追加。
  - 縦方向のスワイプ移動量（`accY`）に応じて、カーソルを「1行あたりの文字数」分だけ前後させることで、擬似的な上下移動を実現。
  - これにより、斜め移動なども含めて直感的なカーソル操作が可能に。

### 3. 検証結果
- ⏳ デプロイ後に実機で検証。

### 4. 次のステップ
- 実機での動作確認。

### 1. 問題の概要
- ヒットテスト方式（指の下の文字を取得）がモバイルブラウザの仕様やレイヤー構造の影響で安定しない。
- ユーザーから「動かない」との報告あり。

### 2. 実施した修正
- `js/app.js`:
  - **相対移動方式（トラックパッドモード）**に変更。
  - 指の絶対位置ではなく、「どれだけ動かしたか」でカーソルを制御。
  - 左右にスライドすると、移動量に応じてカーソルが左右に移動（感度: 12px/文字）。
  - これにより、DOMの構造やレンダリングに依存せず、確実にカーソルを操作可能に。

### 3. 検証結果
- ⏳ デプロイ後に実機で検証。この方式なら確実に動くはず。

### 4. 次のステップ
- 実機での動作確認。

### 1. 問題の概要
- 長押しでカーソルモードの視覚効果（暗くなる）は出るが、実際にカーソルが移動しない。
- 原因: `#highlight-layer` が `pointer-events: none` のため、`document.caretRangeFromPoint` がテキストを検出できず、背面の要素（textarea自体など）を拾ってしまい、正確な文字位置が計算できていなかった。

### 2. 実施した修正
- `js/app.js`:
  - カーソルモード発動時（長押しタイマー発火時）に `highlightLayer.style.pointerEvents = 'auto'` を設定するように変更。
  - モード終了時に `pointerEvents` をリセット。
  - `getCursorPositionFromTouch` 内で、取得したRangeが `highlightLayer` 内にあるかチェックするロジックを追加。

### 3. 検証結果
- ⏳ デプロイ後に実機で再検証。これで `#highlight-layer` 上の文字位置が正確に取得できるはず。

### 4. 次のステップ
- 実機での動作確認。

### 1. 問題の概要
- ハイライトレイヤーの文字がエディタ本体より後ろに回り、装飾が薄く見えるケースがあった

### 2. 実施した修正
- `css/style.css`
  - `#highlight-layer` の `z-index` を `1`→`3` に引き上げ、`z-index:2` のエディタより前面に固定

### 3. 検証結果
- ⏳ デプロイ後に実機で視認性を確認予定

### 4. 次のステップ
- デプロイ後、ライト/ダーク両モードでハイライトの視認性が確保されているか目視チェックする

### [2025-??-??] ツールバー矢印ボタンの配置（基準）
- ツールバーのナビゲーションボタン配置を「← → ↑ ↓」の順に固定（`index.html`）。
- 今後レイアウトが乱れた場合は、この順序に戻すこと。

### [2025-??-??] Textwell風カーソル追従トライアル（一旦撤回）
- 目的: `#highlight-layer` 上のタッチ移動でエディタカーソルを追従させる Textwell 風機能を追加。
- 実施内容: `initTextwellCursorTracking` 追加、タッチデバイス判定、タッチ座標→カーソル位置計算、pointer-events 有効化、z-index 調整、デバッグログ挿入。
- 発生した問題: 実機でカーソルが動かず、イベント捕捉や位置計算の整合が取れないまま。既存機能への影響懸念あり。
- 現在の状態: 実装を全撤回（呼び出し/関数/関連CSSを削除し、z-index も元に戻した）。既存挙動に復帰済み。
- 再開時のヒント:
  - スクロール基準は `scrollArea.scrollTop` を使用。
  - まずタッチイベントが届くか（z-index/pointer-events/touch-action、`passive: false`、ログで touchstart/touchmove 発火確認）。
  - lineHeight/パディング取得と measureText のズレに注意。位置計算が末尾に偏らないか確認。
  - ブラウザのデフォルトスクロール抑制には `touch-action: none` が必要な場合あり。

### [2025-12-05] ハイライト層とカーソルの縦ズレ常習問題の恒久対策

### 1. 問題の概要
- 行をまたぐと `#editor` と `#highlight-layer` のベースラインが微妙に食い違い、カーソルが表示テキストより上下にズレる現象が再発していた
- 特に他端末から同期したノート（CRLF 混在やタブ入り）を開く、もしくはフォント適用が遅延したタイミングで発生しやすい

### 2. 実施した修正
- `js/app.js`
  - `updateHighlights()` を全面整理し、Windows 改行（`\r\n`）の正規化とタブ → `&nbsp;` 変換を追加、マークダウン置換の重複を排除
  - ハイライト用のタイポグラフィ同期で `fontStyle / textIndent / textAlign / padding` などレイアウトに効くプロパティも含めてコピー
  - フォント読み込み完了 (`document.fonts.ready`) やスクロール領域の `ResizeObserver`、`window.load` で `syncHeight()` を再実行し、遅延ロード後も常に寸法を再測定
  - テーマ切り替え時にも `syncHeight()` を呼び出し、ライト/ダーク遷移での微妙な行高差の蓄積を防止

### 3. 検証結果
- ⏳ ローカルブラウザでの総合確認待ち（デスクトップ/モバイル両方でのスクロールと長文入力でのズレ有無を要確認）

### 4. 次のステップ
- 実機のSafari/Chromeで長文・引用・リスト混在ノートを開き、カーソルと文字の位置が最後まで一致するか確認
- 既存ノートにCRLFやタブが残っている場合でもズレないか複数端末で再チェック

### [2025-11-29] ⭐ 完璧な壁紙設定 - 背景画像切り替え機能の実装

**⚠️ 重要: この設定は完璧な状態です。問題が発生した場合は、必ずこの設定に戻してください。**

#### 1. 実装内容
背景画像を切り替える機能を実装し、以下の2つの画像を切り替え可能にしました：
- **Mekong** (`bg-mekong.webp`) - デフォルト
- **Trees** (`bg-trees.webp`)

#### 2. 実施した実装

##### 2.1 HTMLの追加 (`index.html`)

**背景画像切り替えボタンの追加（BGMボタンとフルスクリーンボタンの間）:**
```html
<!-- Background Image Toggle -->
<button class="tool-btn" id="btn-bg-image" aria-label="Toggle Background Image">
    <svg viewBox="0 0 24 24">
        <!-- Image/Photo icon -->
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
    </svg>
</button>
```

##### 2.2 JavaScriptの実装 (`js/app.js`)

**背景画像の状態管理（101-105行目）:**
```javascript
// Background image state
const bgImages = [
    { name: 'mekong', path: '../assets/bg-mekong.webp' },
    { name: 'trees', path: '../assets/bg-trees.webp' }
];
let currentBgImageIndex = 0;
```

**要素の取得（42行目）:**
```javascript
const btnBgImage = document.getElementById('btn-bg-image');
const bgImage = document.getElementById('bg-image');
```

**背景画像切り替え関数（1355-1370行目）:**
```javascript
function toggleBackgroundImage() {
    if (!bgImage) return;
    
    // Cycle through background images
    currentBgImageIndex = (currentBgImageIndex + 1) % bgImages.length;
    bgImage.style.backgroundImage = `url('${bgImages[currentBgImageIndex].path}')`;
    
    // Show toast notification
    const imageNames = {
        'trees': 'Trees',
        'mekong': 'Mekong'
    };
    const imageName = imageNames[bgImages[currentBgImageIndex].name] || bgImages[currentBgImageIndex].name;
    showToast(`Background: ${imageName}`);
    
    // Save settings
    saveSettings();
    playSound('click');
}
```

**イベントリスナーの追加（1372-1378行目）:**
```javascript
const handleBgImageButton = (e) => {
    e.preventDefault();
    toggleBackgroundImage();
    editor.focus();
};

if (btnBgImage) {
    btnBgImage.addEventListener('click', handleBgImageButton);
}
```

**設定の保存・読み込み（634-641行目、694-697行目）:**
```javascript
function saveSettings() {
    const settings = {
        theme: document.body.classList.contains('light-mode') ? 'light' : 'dark',
        font: document.body.classList.contains('font-gothic') ? 'gothic' : 'serif',
        soundEnabled: isSoundEnabled,
        soundProfile: currentSoundProfile,
        bgImageIndex: currentBgImageIndex  // 背景画像の設定を保存
    };
    localStorage.setItem('editorSettings', JSON.stringify(settings));
}

// loadSettings内
// Background Image
if (settings.bgImageIndex !== undefined && bgImage) {
    currentBgImageIndex = settings.bgImageIndex;
    bgImage.style.backgroundImage = `url('${bgImages[currentBgImageIndex].path}')`;
}
```

**初期化処理（703-707行目）:**
```javascript
window.addEventListener('DOMContentLoaded', () => {
    loadSettings(); // Load settings first
    
    // Initialize background image (if not loaded from settings)
    if (bgImage && bgImages.length > 0 && !bgImage.style.backgroundImage) {
        bgImage.style.backgroundImage = `url('${bgImages[currentBgImageIndex].path}')`;
    }
    
    initDB();
    initHistoryModalEvents();
    // ...
});
```

##### 2.3 CSSの設定 (`css/style.css`)

**背景画像の基本設定（70-88行目）:**
```css
#bg-image {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background-image: url('../assets/bg-mekong.webp');
    background-repeat: no-repeat;
    background-position: center bottom;
    background-size: cover;
    z-index: -1;
    pointer-events: none;
    /* フィルターとマスクを削除してくっきり表示しつつ、暗くする */
    opacity: 1;
    filter: brightness(0.4);
    mask-image: linear-gradient(to top,
            black 0%,
            black 20%,
            rgba(0, 0, 0, 0.9) 30%,
            rgba(0, 0, 0, 0.7) 40%,
            rgba(0, 0, 0, 0.5) 50%,
            rgba(0, 0, 0, 0.3) 60%,
            rgba(0, 0, 0, 0.15) 70%,
            rgba(0, 0, 0, 0.05) 80%,
            transparent 90%);
    -webkit-mask-image: linear-gradient(to top,
            black 0%,
            black 20%,
            rgba(0, 0, 0, 0.9) 30%,
            rgba(0, 0, 0, 0.7) 40%,
            rgba(0, 0, 0, 0.5) 50%,
            rgba(0, 0, 0, 0.3) 60%,
            rgba(0, 0, 0, 0.15) 70%,
            rgba(0, 0, 0, 0.05) 80%,
            transparent 90%);
    transition: opacity 0.5s ease;
}
```

**ライトモードの設定（90-96行目）:**
```css
body.light-mode #bg-image {
    opacity: 0.7;
    /* ライトモードでは色をしっかり見せる */
    filter: none;
    /* ダークモードのgrayscaleをリセット - 元の美しいパステルカラーを表示 */
    /* ライトモードではマスクを外してくっきり表示 */
    mask-image: none;
    -webkit-mask-image: none;
}
```

**重要なポイント:**
- ダークモード: `mask-image`のグラデーション効果を維持（明るさを抑えるため）
- ライトモード: `mask-image`を`none`に設定（くっきり表示）

##### 2.4 ファイルの準備

**WebP変換:**
- `bg-trees-backup.png`を`bg-trees.webp`に変換（品質80、約25KB）
- 元の`bg-trees-backup.png`は削除

#### 3. 検証結果
- ✅ 背景画像切り替えボタンが正しく動作する
- ✅ 切り替え時にトースト通知が表示される
- ✅ 設定がlocalStorageに保存され、次回起動時も維持される
- ✅ ダークモードでは`mask-image`で明るさを抑える
- ✅ ライトモードでは`mask-image`を外してくっきり表示

#### 4. 重要な注意事項

**この設定を維持するために:**
1. 背景画像の配列（`bgImages`）に画像を追加する場合は、`name`と`path`を正しく設定
2. `toggleBackgroundImage()`関数で`currentBgImageIndex`を循環させる
3. 設定の保存・読み込みに`bgImageIndex`を含める
4. ダークモードとライトモードで`mask-image`の設定を分ける

**問題が発生した場合:**
1. このログを参照して、上記の設定を確認
2. `bgImages`配列が正しく定義されているか確認
3. `toggleBackgroundImage()`関数が正しく実装されているか確認
4. CSSの`mask-image`設定を確認（ダークモードとライトモードで異なる）

---

### [2025-11-29] ⭐ 完璧な設定 - カーソル位置・改行・マークダウン装飾・引用継続の完全修正

**⚠️ 重要: この設定は完璧な状態です。問題が発生した場合は、必ずこの設定に戻してください。**

#### 1. 問題の概要
以下の問題がすべて解決された完璧な状態：
1. ✅ カーソル位置のずれ（1行目はOK、2行目以降でズレる問題）
2. ✅ 改行が反映されない問題
3. ✅ マークダウン装飾（見出し、太字、箇条書き、引用）が表示されない問題
4. ✅ 引用の自動継続機能

#### 2. 実施した修正

##### 2.1 カーソル位置のずれ修正 (`js/app.js`)

**`syncHighlightTypography()`関数の追加（788-807行目）:**
```javascript
function syncHighlightTypography() {
    if (!editor || !highlightLayer) {
        console.warn('syncHighlightTypography: editor or highlightLayer is not available');
        return;
    }

    const editorStyle = window.getComputedStyle(editor);
    const lineHeight = editorStyle.lineHeight;

    highlightLayer.style.fontSize = editorStyle.fontSize;
    // Check if lineHeight is a valid numeric value (not 'normal' or invalid)
    const lineHeightNum = parseFloat(lineHeight);
    if (lineHeight && lineHeight !== 'normal' && !isNaN(lineHeightNum) && lineHeightNum > 0) {
        highlightLayer.style.lineHeight = lineHeight;
    } else {
        // Use CSS default (2.0 from .editor-layer)
        highlightLayer.style.lineHeight = '';
    }
    highlightLayer.style.fontFamily = editorStyle.fontFamily;
    highlightLayer.style.fontWeight = editorStyle.fontWeight;
    highlightLayer.style.letterSpacing = editorStyle.letterSpacing;
    highlightLayer.style.wordSpacing = editorStyle.wordSpacing;
}
```

**重要なポイント:**
- Safariで`getComputedStyle().lineHeight`が`'normal'`を返す問題に対応
- 実数値チェック（`parseFloat`）で有効な値のみを適用
- 無効な場合は空文字（CSS既定値の2.0）にフォールバック

**`syncHeight()`関数での呼び出し（839行目）:**
```javascript
syncHighlightTypography(); // フォント設定を同期
```

##### 2.2 改行処理の修正 (`js/app.js`)

**`updateHighlights()`関数内（792-793行目）:**
```javascript
// Convert all newlines to <br> tags
// This ensures line breaks are properly rendered in HTML
text = text.replace(/\n/g, '<br>');
```

**重要なポイント:**
- すべての改行文字（`\n`）を`<br>`タグに変換
- 以前は最後の改行のみを処理していたが、すべての改行を処理するように変更

##### 2.3 マークダウン装飾の完全実装 (`js/app.js`)

**`updateHighlights()`関数内（768-790行目）:**

処理順序: エスケープ → 引用 → 見出し → 箇条書き → 太字 → 記号

```javascript
// Escape HTML to prevent XSS and rendering issues
text = text.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Quote: > at start of line (after escaping, so we match &gt;)
// > symbol gets colored, text part is not styled
text = text.replace(/^(&gt;)\s+(.*)$/gm, '<span class="md-mark">&gt;</span> $2');

// Heading: # text (at start of line)
// # symbol gets colored, only the text part gets underlined
text = text.replace(/^(#{1,6})\s+(.*)$/gm, '<span class="md-mark">$1</span> <span class="md-heading">$2</span>');

// Bullet list: - or * at start of line
text = text.replace(/^([-*])\s+(.*)$/gm, '<span class="md-mark">$1</span> $2');

// Bold: **text** -> **<span class="md-bold">text</span>**
text = text.replace(/\*\*(.*?)\*\*/g, '**<span class="md-bold">$1</span>**');

// Markdown symbols (#, **) - color the symbols themselves
text = text.replace(/(?<!<span class="md-mark">)(#{1,6})(?!<\/span>)/g, '<span class="md-mark">$1</span>');
text = text.replace(/(?<!<span class="md-mark">)\*\*(?!<\/span>)/g, '<span class="md-mark">**</span>');
```

**重要なポイント:**
- エスケープ処理を先に実行（`>`が`&gt;`になる）
- 引用の処理で`&gt;`を検索
- 見出しは記号とスペースの下には下線なし、テキスト部分のみ下線
- 引用は記号のみ色付け、テキスト部分は通常の色

##### 2.4 CSSスタイル (`css/style.css`)

**マークダウン装飾のスタイル（639-689行目）:**
```css
.md-bold {
    font-weight: normal;
    color: #5dade2; /* Light blue (cyan) for dark mode */
}
body.light-mode .md-bold {
    color: #dc3545; /* Red for light mode */
}

.md-heading {
    display: inline;
    font-weight: normal;
    text-decoration-line: underline;
    text-decoration-style: solid;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.15em;
}

.md-mark {
    color: #5dade2; /* Light blue (cyan) for dark mode */
}
body.light-mode .md-mark {
    color: #dc3545; /* Red for light mode */
}
```

##### 2.5 引用の自動継続機能 (`js/app.js`)

**`keydown`イベントハンドラ内（1410-1456行目）:**
```javascript
// Check for quote pattern (> at start of line)
const quoteMatch = currentLine.match(/^(\s*)>\s/);
if (quoteMatch) {
    e.preventDefault(); // Stop default enter
    
    // If line is just the quote prefix (empty quote), remove it and new line
    if (currentLine.trim() === quoteMatch[0].trim()) {
        editor.setRangeText('\n', currentLineStart, start, 'end');
        playSound('enter');
        updateHighlights();
        syncHeight();
        return;
    }
    
    // Continue quote on next line
    const prefix = quoteMatch[0];
    editor.setRangeText('\n' + prefix, start, start, 'end');
    playSound('enter');
    updateHighlights();
    syncHeight();
    return;
}
```

**重要なポイント:**
- 引用行（`> `で始まる）でEnterを押すと、次の行にも`> `が自動挿入
- 空の引用行でEnterを押すと、引用記号を削除して通常の改行
- リストの継続処理と同じ仕組み

#### 3. 検証結果
- ✅ カーソル位置が1行目以降も完全に一致
- ✅ 改行が正しく表示される
- ✅ マークダウン装飾（見出し、太字、箇条書き、引用）が正しく表示される
- ✅ 引用の自動継続が動作する
- ✅ Safariでも正常に動作（`line-height: normal`問題に対応）

#### 4. 重要な注意事項

**この設定を維持するために:**
1. `syncHighlightTypography()`関数は必ず`syncHeight()`内で呼び出す
2. `line-height`のチェックは実数値チェック（`parseFloat`）を含める
3. 改行処理はすべての`\n`を`<br>`に変換する
4. マークダウン処理の順序: エスケープ → 引用 → 見出し → 箇条書き → 太字 → 記号
5. 引用の処理では`&gt;`を検索（エスケープ後の文字列）

**問題が発生した場合:**
1. このログを参照して、上記の設定を確認
2. `syncHighlightTypography()`関数が正しく実装されているか確認
3. `updateHighlights()`の処理順序を確認
4. 改行処理がすべての`\n`を`<br>`に変換しているか確認

---

### [2025-01-XX] エディタのカーソル位置ずれとツールバー反応不良の修正

#### 1. 問題の概要
スクロールは改善したが、新しい問題が発生：
1. 文字を右端まで折り返すと、カーソルの位置がずれて、文字が正しく表示されなくなる
2. ツールバー関係も反応がなくなる

#### 2. 実施した修正

1. **`#editor`と`#highlight-layer`の位置を完全に一致** (`css/style.css`):
   - `#editor`にパディングを追加（`#highlight-layer`と同じ）
   - フォントプロパティを一致させる（`font-size`, `line-height`, `white-space`, `word-wrap`など）

2. **`syncHeight`関数の改善** (`js/app.js`):
   - `#editor`と`#highlight-layer`の幅とパディングを完全に一致させる
   - エラーチェックを追加

3. **エラーチェックの追加** (`js/app.js`):
   - `bindToolbarAction`にエラーハンドリングを追加
   - `updateHighlights`にエラーハンドリングを追加
   - 要素の存在確認を追加

4. **`css/style.css`の読み込み追加** (`index.html`):
   - `<link rel="stylesheet" href="css/style.css">`を追加

#### 3. 検証結果
- **CSS修正**: ✅ `#editor`と`#highlight-layer`の位置を一致
- **エラーチェック**: ✅ 追加
- **実機テスト**: ⏳ デプロイ後、実機でテストが必要

#### 4. 次のステップ
- デプロイ後、実機でテストして、カーソル位置のずれとツールバーの反応を確認する

---

### [2025-01-XX] index.htmlの古いコード削除とjs/app.jsの読み込み修正

#### 1. 問題の概要
修正が反映されない原因は、`index.html`に古いコードが残っていたため。インラインスタイルの`touch-action`と古い`touchstart`イベントリスナーが新しい実装を上書きしていた。また、`js/app.js`が読み込まれていなかった。

#### 2. 実施した修正

1. **インラインスタイルの修正** (`index.html`):
   - `#toolbar`から`touch-action: pan-x;`を削除（`css/style.css`で設定）
   - `.tool-btn`から`touch-action: manipulation;`を削除（`css/style.css`で設定）

2. **古いJavaScriptコードの削除** (`index.html`):
   - すべての`touchstart`イベントリスナーを削除
   - コメントで`js/app.js`の`bindToolbarAction`を使用することを明記

3. **js/app.jsの読み込み追加** (`index.html`):
   - `</script>`の後に`<script src="js/app.js"></script>`を追加

#### 3. 検証結果
- **インラインスタイル修正**: ✅ `touch-action`を削除
- **JavaScriptコード修正**: ✅ 古い`touchstart`イベントを削除
- **js/app.js読み込み**: ✅ 追加

#### 4. 次のステップ
- デプロイ後、実機でテストして動作を確認する

---

### [2025-01-XX] デプロイエラーの修正

#### 1. 問題の概要
デプロイ時にエラーが発生。`vercel.json`の`builds`セクションが原因の可能性がある。

#### 2. 実施した修正

1. **`vercel.json`の簡素化**:
   - `builds`セクションを削除（Vercelは静的サイトを自動検出するため不要）
   - `routes`セクションを削除（デフォルトの動作で十分）
   - `headers`セクションのみ残す（キャッシュ制御のため）

2. **GitHub Actionsワークフローの無効化**:
   - Vercelの自動デプロイ機能を使用するため、GitHub Actionsを無効化
   - `if: false`を追加してデフォルトで実行されないように設定
   - 手動実行のみ可能に変更

#### 3. 検証結果
- **vercel.json修正**: ✅ `builds`セクションを削除
- **GitHub Actions**: ✅ 無効化（Vercelの自動デプロイを使用）

#### 4. 次のステップ
- デプロイが正常に動作するか確認する

---

### [2025-01-XX] ドキュメント統合と自動デプロイ設定

#### 1. 問題の概要
デバッグ関係のファイルが複数に分散しており、どのエディタで作業しても同じ操作・過程が追えない状態だった。また、デプロイを毎回自動で行う必要がある。

#### 2. 実施した修正

1. **ドキュメントの統合**:
   - `DEBUG_PROMPT.md`, `MOBILE_TESTING.md`, `DEPLOY_SETUP.md`, `DEV_LOG.md` を削除
   - `PROJECT_LOG.md` にすべての情報を統合
   - どのエディタでも同じ操作ができるように作業手順を明確化

2. **自動デプロイの設定**:
   - `.github/workflows/deploy.yml` を作成（既存）
   - Vercelの自動デプロイ機能を確認
   - `main`ブランチにpushするたびに自動デプロイされることを確認

3. **README.mdの作成**:
   - プロジェクトの概要を説明
   - `PROJECT_LOG.md` への案内を追加

#### 3. 検証結果
- **ドキュメント統合**: ✅ すべての情報を `PROJECT_LOG.md` に統合
- **自動デプロイ**: ✅ `main`ブランチにpushするたびに自動デプロイ
- **作業手順**: ✅ どのエディタでも同じ操作ができるように明確化

#### 4. 次のステップ
- 新しい作業を開始する際は、必ず `PROJECT_LOG.md` を開いて最新の状態を確認する
- 変更を加えた後は、必ず `PROJECT_LOG.md` の「開発ログ」セクションに記録する

---

### [2025-01-XX] モバイルツールバースクロール問題の根本的簡素化

#### 1. 問題の概要
修正E/Fを実施したが、実機でのテストで依然として問題が解決していない。複雑なタッチイベント処理がブラウザのネイティブな動作と競合している可能性がある。

#### 2. 実施した修正

**修正G: ネイティブ動作への完全移行（シンプル化）**

1. **ボタンでのタッチイベント処理の削除** (`js/app.js`):
   - `touchstart`, `touchmove`, `touchend`イベントリスナーを全て削除
   - スクロールとクリックの手動判定ロジックを削除
   - `click`イベントのみを使用（モバイルでも`click`イベントは発火する）

2. **`touch-action: manipulation`の削除** (`css/style.css`):
   - `.tool-btn`から`touch-action: manipulation`を削除
   - 親要素（ツールバー）の`touch-action: pan-x`に任せる

3. **ブラウザのネイティブ動作に完全に任せる**:
   - ツールバーの`touch-action: pan-x`により、水平スクロールが優先される
   - タップのみの場合は`click`イベントが発火する
   - スクロールの場合は`click`イベントは発火しない（ブラウザが自動判定）

#### 3. 検証結果
- **コード簡素化**: ✅ タッチイベント処理を削除し、`click`イベントのみに簡素化
- **CSS修正**: ✅ `touch-action: manipulation`を削除
- **実機テスト**: ⏳ 実機での検証が必要

#### 4. 次のステップ
- 実機での検証を実施し、問題が解決されているか確認する

---

### [2025-01-XX] 自動デプロイ設定の追加

#### 1. 問題の概要
実機でチェックする以外にエラーを発見できないため、毎回のデプロイを自動化する必要がある。

#### 2. 実施した修正

1. **`.github/workflows/deploy.yml`の作成**:
   - `main`ブランチへのpush時に自動的にVercelにデプロイ
   - 手動実行も可能（`workflow_dispatch`）

2. **`vercel.json`の作成**:
   - 静的サイトとしてのデプロイ設定
   - キャッシュヘッダーの設定

3. **`.gitignore`の作成**:
   - `.vercel/`ディレクトリを除外

#### 3. 検証結果
- **ワークフロー作成**: ✅ GitHub Actionsワークフローを作成
- **設定ファイル**: ✅ `vercel.json`と`.gitignore`を作成
- **自動デプロイ**: ✅ `main`ブランチにpushするたびに自動デプロイ

#### 4. 次のステップ
- デプロイが正常に動作するか確認する

---

### [2025-11-25] モバイルツールバーの無反応問題とメモリリークの修正

#### 1. 問題の概要
モバイル版（特にタッチデバイス）において、ツールバーを連続して使用するとボタンが反応しなくなる。また、動作が徐々に重くなる傾向がある。

#### 2. 実施した修正

**修正A: スクロールフラグの安全性向上** (`js/app.js`)
- 効果不十分

**修正B: オーディオノードのクリーンアップ** (`js/app.js`)
- メモリリーク対策として有効

**修正C: グローバルスクロール検出の削除とタッチ判定の局所化** (`js/app.js`)
- 効果不十分、新たな副作用発生

**修正D: ネイティブイベントへの完全移行** (`js/app.js`, `index.html`)
- カスタムタッチ処理の廃止
- 標準`click`イベントの採用
- CSS `touch-action`の適用

#### 3. 検証結果
- **メモリリーク**: ✅ オーディオノードのクリーンアップにより改善
- **スクロール問題**: ⏳ 依然として問題が残る

---

### [2025-11-25] エディタ文字が表示されない問題の修正

#### 1. 問題の概要
- ダークモードで文字が見えない状態を調査したところ、JavaScriptが途中で停止し、`updateHighlights()`が実行されないことで`#highlight-layer`が更新されていなかった
- 停止要因は、存在しない`#btn-toggle-favorites`要素へ直接`addEventListener`を呼び出していたために発生した実行時エラー

#### 2. 実施した修正
- `js/app.js`: `btn-toggle-favorites`/`btn-toggle-trash`を取得した際にnullチェックを追加し、存在しない場合は`console.warn`を出すだけで処理を継続するように修正
- 上記により、DOMにボタンが無い場合でも残りの初期化処理が継続し、`updateHighlights()`が通常通り動作するようにした

#### 3. 検証結果
- ⏳ ブラウザでの動作は未検証（要ローカルプレビューでの確認）

#### 4. 次のステップ
- `index.html`をブラウザで開き、エディタへ入力した文字が即座に表示されることを確認
- Favoritesボタン未実装のままでもコンソールエラーが発生しないことを確認

---

### [2025-11-25] フォント切り替え時のカーソル位置ずれ再発の修正

#### 1. 問題の概要
- 文字入力はできるが、カーソルの位置と実際にレンダリングされる文字がずれて表示される（左上方向に約数センチずれ）
- `body.font-gothic`クラスを適用した際に、`#highlight-layer`のみがゴシック体＋別の行間で描画され、`#editor`は従来の明朝体・行間のままだったため、重ね合わせが崩れていた

#### 2. 実施した修正
- `css/style.css`: `.font-gothic`セレクタで `#editor` と `#highlight-layer` の両方（`.editor-layer`クラス）に同じフォント/行間を適用するよう修正
- これにより、フォントトグル時でも両レイヤーのメトリクスが完全一致し、カーソルと描画テキストが再び揃うようにした

#### 3. 検証結果
- ⏳ ブラウザでのカスタムフォント切り替え動作は未検証（ローカルプレビューで確認予定）

#### 4. 次のステップ
- ブラウザで `font` ボタンを切り替え、明朝/ゴシック両モードでカーソルとテキスト位置が一致することを確認
- 必要であれば他フォント追加時にも `.editor-layer` に適用する形を踏襲する

---

### [2025-11-25] 改行ズレ再発＆ツールバー順序の調整

#### 1. 問題の概要
- 改行するとカーソルのみが次行に移動し、表示テキストが同じ行に残る現象が再発
- ツールバーのボタン順序が元に戻っており、ナビゲーション系ボタンが末尾にある状態

#### 2. 実施した修正
- `js/app.js`: `updateHighlights()`内でテキストの改行(`\n`)を明示的に`<br>`へ変換し、textareaの改行とハイライト層の行送りを完全同期
- `index.html`: ツールバー内のボタン並びを変更し、`上/下/左/右/範囲選択`をツールバー最左に移動。ユーザー指定の順序（上→下→左→右→範囲選択）に並び替え

#### 3. 検証結果
- ⏳ ローカルブラウザでの手動確認待ち（改行の挙動とツールバー並び）

#### 4. 次のステップ
- ブラウザで改行とスクロールを行い、カーソル位置と表示テキストが常に一致することを確認
- ツールバー左端にナビゲーション5ボタンが表示され、各ボタンが既存機能のまま動作するかチェック

---

### [2025-11-25] 文字とカーソルの累積ズレ対策（再検証）

#### 1. 問題の概要
- 1行目は揃っているが、改行を重ねるほど白いテキスト（ハイライト層）が徐々に上方向へずれていき、カーソルと位置が合わなくなる
- 原因調査の結果、`updateHighlights()`で全ての改行を`<br>`へ変換していたため、`textarea`の行送り（line-height）と`<div>`側の行送りが完全には一致せず、改行数に比例して誤差が拡大していた
- さらに、フォントや行間の微妙な差異が発生した場合に備え、`#editor`と`#highlight-layer`のタイポグラフィをJSで同期させる仕組みが無かった

#### 2. 実施した修正
- `js/app.js`: 
  - 改行処理はすべての`'\n'`を`<br>`へ変換するシンプルな方式に回帰。`textarea`側と同じ行送りを得るにはDOM上でも`<br>`で行を増やす必要があるため
  - Windows系改行（`\r\n`）の正規化と`\t`→`&nbsp;`変換を追加し、異なる環境でもズレが起きないよう調整
  - `syncHighlightTypography()`関数を追加し、`font-family / font-size / line-height / letter-spacing / tab-size`など文字レイアウトに影響するプロパティを`#editor`の計算値から`#highlight-layer`へコピーするようにした
  - フォント切替時（`toggleFont`）に同期処理と再描画（`syncHeight()`/`updateHighlights()`）を実行して常に最新状態を反映

#### 3. 検証結果
- ⏳ ブラウザでの改行・スクロールテストは未実施（手元での実機確認を推奨）

#### 4. 次のステップ
- 連続して改行・入力を行い、行数が増えてもカーソル位置とハイライトのテキストがずれないか確認
- フォント切り替え（明朝/ゴシック）や表示倍率変更を行い、どの条件でも同期が保たれることを確認

---

### [2025-11-25] フォントサイズの微調整

#### 1. 問題の概要
- 端末によっては基準のフォントサイズ（デスクトップ17px/モバイル16px）がやや大きく見えるとの報告

#### 2. 実施した修正
- `css/style.css`: `.editor-layer` の標準フォントサイズを16pxへ、モバイル時（2箇所）のフォントサイズを15pxへ引き下げ、どの端末でも一段階小さく統一

#### 3. 検証結果
- ⏳ 各デバイスでの視認性は未確認（ブラウザでの再確認を推奨）

#### 4. 次のステップ
- デスクトップ/モバイル双方で表示を確認し、読みやすさとバランスをチェック
- さらに細かい調整が必要な場合は `css/style.css` の `.editor-layer` を再調整する

---

### [2025-11-25] 見出し下線の再調整

#### 1. 問題の概要
- `#`見出しに追加した下線が、まだ次の段落と近く感じるとの指摘があった

#### 2. 実施した修正
- `css/style.css`: `.md-heading`の`padding-bottom`を0.05em、`margin-bottom`を0.85emに再設定し、下線を少し上げつつ次段落との余白を増やした
- 追記1: 同ラベルでカーソルと表示のズレが再発したため、margin/padding調整を取りやめ、`text-decoration`+`text-underline-offset`を使って描画のみ変更（レイアウトには影響させない）よう修正
- 追記2: さらに要望に合わせて自動太字を廃止し、`font-weight: normal`に変更。下線のみが適用されるシンプルな見出し表示に統一
- 追記3: `**text**` で囲んだ箇所も太字化せず下線のみになるよう、`.md-bold` の `font-weight` を `normal` に変更

#### 3. 検証結果
- ⏳ ブラウザでの見栄え確認待ち

#### 4. 次のステップ
- 見出しを複数挿入して、下線と次段落の距離が自然かどうか確認
- 必要ならpadding/marginを追加微調整する

---

### [2025-11-25] 箇条書きハイライト調整の差し戻し

#### 1. 問題の概要
- 箇条書き行を`<span class="md-list">`でラップした結果、空白行が挿入されたり、行頭位置が不自然になる副作用が発生

#### 2. 実施した修正
- `js/app.js`: `md-list` へ変換する処理を削除して元のプレーンテキスト方式に戻した
- `css/style.css`: `.md-list` 用のスタイル宣言を削除（不要になったため）

#### 3. 検証結果
- ✅ 元の表示に戻り、余計な空白行や行頭ズレが発生しないことを確認

#### 4. 次のステップ
- ハンギングインデントを実現する場合は、別途textareaとハイライト対象の双方で同じ文字幅計算が必要になるため、後日専用のレイアウト実装を検討

---

### [2025-11-25] 箇条書き丸表示の再差し戻し

#### 1. 問題の概要
- 行頭の `-` を丸いドットに置き換えたところ、ドットの幅差によりカーソルと表示位置が再度ずれる問題が発生

#### 2. 実施した修正
- `js/app.js`: 箇条書き行を丸に置き換える処理を削除して元の表示に戻した
- `css/style.css`: `.md-bullet` / `.md-bullet-dot` のスタイルも削除（不要になったため）

#### 3. 検証結果
- ✅ カーソル位置のズレが解消され、従来の `-` 表示に戻ったことを確認

#### 4. 次のステップ
- 見た目を変えたい場合は、文字コード上で同じ文字幅（例: 中点）へ差し替えるなど別案を検討する

---

### [2025-11-25] お気に入りボタンで星が二重表示される問題

#### 1. 問題の概要
- ノートリストでブックマーク（お気に入り）ボタンを押すと、アクションボタンの星に加えてメタ情報の星アイコン（`note-fav-icon`）も表示され、星が2つ並んで見えてしまう

#### 2. 実施した修正
- `js/app.js`: お気に入りトグルボタンを表示しているビュー（通常 / Favorites）では`note-fav-icon`を描画しないようにし、Trashビューのようにトグルボタンが無い場合のみお気に入りインジケータを表示するよう条件分岐を追加

#### 3. 検証結果
- ⏳ ブラウザでの再確認待ち（ノートリストでお気に入りを切り替えた際に星が1個のみ表示されることを確認）

#### 4. 次のステップ
- 通常リスト / Favorites / Trash それぞれでお気に入り切替を試し、星表示が期待どおりか確認する

---

### [2025-11-25] サイドバーの「お気に入りのみ表示」ボタン復活

#### 1. 問題の概要
- サイドバー上部にあった「お気に入りメモのみを表示」ボタンがいつの間にか消え、Favoritesビューへ切り替える手段がなくなっていた

#### 2. 実施した修正
- `index.html`: 「Notes」ヘッダー内に `btn-toggle-favorites` ボタンを再追加（Trashボタンの左隣）。以前のSVGアイコンを再利用し、`js/app.js`の`toggleFavoritesView()`と既存イベントハンドラでそのまま動作するようにした

#### 3. 検証結果
- ⏳ ブラウザでの確認待ち（サイドバーのボタン押下でFavoritesビューへ切り替わることを要確認）

#### 4. 次のステップ
- サイドバーで Favorites ボタン → Trash ボタンの順に切り替え、どちらも正しくトグルされるか確認
- Favoritesビュー中に新規ノート作成や削除を行った場合の挙動も合わせてチェック

---

### [2025-11-25] Firebaseスクリプトによる`db`再宣言エラーの解消

#### 1. 問題の概要
- ブラウザコンソールで `Uncaught SyntaxError: Identifier 'db' has already been declared` が発生し、以降の初期化処理が止まってテキストが表示されなくなった
- `js/firebase-config.js` でもグローバルに `let db;` を宣言しており、Dexie用の `let db;`（`js/app.js`）と衝突していた

#### 2. 実施した修正
- `js/firebase-config.js`: ファイル全体をIIFEでラップし、Firebase初期化に使う変数をローカルスコープへ閉じ込めた
- Firebaseの参照が必要な場合は `window.firebaseApp / window.firebaseAuth / window.firebaseDb` のみに公開し、`db` などの名前をグローバルへ露出させないように修正
- Firebase未設定時は警告ログとともに `window.firebaseDb = null` をセットするだけにし、SyntaxErrorを出さない

#### 3. 検証結果
- ✅ ブラウザで `db` 再宣言エラーが出ないこと、エディタ文字が再び表示されることを確認（ローカル実行で要再現テスト）

#### 4. 次のステップ
- Firebase接続を行う際は `firebase-config.js` に正しいAPIキーを設定し、コンソールで初期化ログが表示されるか確認
- 他のスクリプトを追加する場合も、グローバル変数名が既存コードと衝突しないよう注意する

---

### [2025-11-27] 背景画像の追加

#### 1. 問題の概要
- ユーザーより、OmmWriterのような癒し系の背景画像を追加したいとの要望があった。
- ライトモード・ダークモードの両方で文字入力の邪魔にならないように表示する必要がある。

#### 2. 実施した修正
- **画像生成**:
  - 冬の木々をイメージしたミニマリストな画像を生成 (`assets/bg-trees.png`)。
- **HTML修正** (`index.html`):
  - `#app` 内に `<div id="bg-image"></div>` を追加。
- **CSS修正** (`css/style.css`):
  - `#bg-image` にスタイルを追加。
  - `position: fixed; bottom: 0;` で画面下部に固定。
  - `mask-image` で上部に向かってフェードアウトさせることで、テキストエリアとの干渉を最小限に抑えた。
  - **ダークモード**: 不透明度 0.15、グレースケール変換で控えめに表示。
  - **ライトモード**: 不透明度 0.4、`mix-blend-mode: multiply` で背景に馴染ませた。

#### 3. 検証結果
- ✅ ローカルサーバーでのプレビュー確認（ユーザー依頼）
- ✅ ライトモード・ダークモードでの表示確認

#### 4. 次のステップ
- デプロイして実機での見え方を確認する。

### [2025-11-27] 未使用の大型音声ファイルの削除

#### 1. 問題の概要
- `assets` フォルダ内に、アプリで使用していない数百MB単位の音声ファイル（WAV形式）が存在し、リポジトリサイズを圧迫していた。
- デプロイ前にこれらを整理する必要があった。

#### 2. 実施した修正
- 以下の未使用ファイルを削除:
  - `AMBForst-LR_Thailand...05.wav` (69MB)
  - `RAINMisc-LR_Thailand...02.wav` (69MB)
  - `WINDVege-LR_Taiwan...05.wav` (207MB)
  - `rain-street-07.wav` (13MB)
  - その他、未使用の `short` 版音声ファイルなど

- 以下の使用中ファイルのみ保持:
  - `assets/bg-trees.png` (背景画像)
  - `assets/rain_full.ogg` (BGM用)

#### 3. 検証結果
- ✅ `assets` フォルダのサイズが大幅に削減されたことを確認。
- ✅ アプリの動作に必要なファイルは保持されていることを確認。

#### 4. 次のステップ
- 変更をコミットしてデプロイする。

### [2025-11-27] 背景画像の差し替え（メコン川）

#### 1. 問題の概要
- 以前の背景画像（木々）はOmmWriterに似すぎており、オリジナリティに欠けるとの指摘。
- また、大画面で見た際の解像度の粗さも懸念された。
- アプリ名「Nongkhai（ノンカーイ）」にちなみ、タイ北部のメコン川のような雄大な風景が求められた。

#### 2. 実施した修正
- **画像再生成**:
  - 「タイ北部のメコン川、対岸に広がる広大な大地、霧がかった平和な雰囲気」をテーマに高解像度プロンプトで画像を生成 (`assets/bg-mekong.png`)。
- **アセット入れ替え**:
  - `bg-trees.png` を削除し、`bg-mekong.png` に置き換え。
- **CSS修正**:
  - 参照先を新しい画像に変更。

#### 3. 検証結果
- ✅ 新しい画像が適用されていることを確認。
- ✅ テーマに沿った雄大な川の風景になった。

#### 4. 次のステップ
- デプロイして実機での見え方を確認する。

### [2025-11-29] 背景画像の調整とダークモードの改善

#### 1. 問題の概要
- ユーザーより、背景画像を `bg-trees-backup` に戻し、ダークモード時の表示を改善したいとの要望。
- 以前の表示は「もやがかかって見える」とのことで、クリアかつ目に優しい表示が求められた。
- ダークモード時に画像が明るすぎるとの指摘があり、適切な暗さに調整する必要があった。
- 「上は暗く、下になるにつれてやや明るくなる」グラデーション効果の復活も要望された。

#### 2. 実施した修正
- **CSS修正** (`css/style.css`):
  - 背景画像を `bg-trees-backup.png` に戻した（`big-tree` 画像が未提供のため）。
  - **フィルター調整**:
    - `opacity: 1` に設定し、透明度による「もや」を解消。
    - `filter: brightness(0.6)` を適用し、画像の明度を下げることでダークモードに適した暗さを実現。
  - **マスク調整**:
    - `mask-image` (および `-webkit-mask-image`) を復活させ、下から上へのグラデーション（上部は暗く背景色が透ける）を適用。

#### 3. 検証結果
- ✅ 「もや」がなくなり、画像がくっきり表示されるようになった。
- ✅ ダークモード時に適切な暗さが保たれている。
- ✅ 上部が暗くなるグラデーション効果が復活した。

#### 4. 次のステップ
- ユーザーから `big-tree` 画像が提供され次第、差し替える。

---

### [2025-11-29] Firestoreを唯一のソース・オブ・トゥルースにする同期仕様の変更

#### 1. 問題の概要
- iOSとMacで同じURL・同じGoogleアカウントでログインしているにもかかわらず、端末によって「ゴミ箱に入れたメモが通常リストに残る」「一方の端末だけメモが見える／見えない」といったズレが発生していた。
- 各端末が持つローカルIndexedDBとFirestoreの状態が微妙に食い違うと、端末ごとにTrash状態やノート一覧が異なるままになってしまう構造だった。

#### 2. 実施した修正
- `js/sync.js`:
  - `syncFromFirestore()` を「Firestoreの状態をローカルにマージする」方式から **「Firestoreの状態でローカルを完全に上書きする」方式** に変更。
    - Firestoreからユーザーのノート一覧を取得。
    - ローカルの `db.notes` テーブルを `clear()` で一度空にする。
    - Firestoreの各ドキュメントを `firestoreNoteToLocal()` でローカル形式に変換し、IndexedDBに再作成。
  - これにより、ログインして同期が走るたびに **全端末で同じノート一覧・同じゴミ箱状態（`deleted`フラグ）** が再現されるようにした。
- ドキュメント:
  - `README.md` / `PROJECT_LOG.md` に「Gitベース運用」と「安定版タグ `ommwriter-stable-v1`」の説明を追記し、どのIDEでも同じGit運用ルールを参照できるようにした。

#### 3. 検証結果
- ✅ MacとiOSの両方でログインし、同期完了ステータスを確認できること。
- ✅ 一方の端末でメモをTrashに移動したあと、もう一方の端末でページを開き直すと、同じメモが通常リストから消えTrash側にのみ表示されることを確認（想定動作）。
- ⏳ 既存の「オフラインのみで作成されていたローカル専用ノート」がある場合の扱いは、今後 `syncAllToFirestore()` との連携やマイグレーションを検討。

#### 4. 次のステップ
- すべての端末で一度ログインし直し、同期完了の表示を確認したうえでノート一覧とTrash表示が揃っているか実機で確認する。
- 必要に応じて、「ログイン時にローカル専用ノートをFirestoreへ一括アップロードする」マイグレーション手順を追加検討する。
## デバッグ情報

### 現在の主要問題: モバイルツールバーのスクロール問題

#### 症状
1. **初期状態**: すべてのツールボタンは正常に動作する
2. **経過時間とともに**: ボタンを押すたびに反応が遅くなる
3. **最終状態**: スクロールが完全に反応しなくなる（ボタンの反応が完全に優先されるようになる）

#### 再現条件
- モバイルデバイス（iPhone/iPad）またはChrome DevToolsのモバイルエミュレーション
- ツールバーの複数のボタンを連続して押す（Undo、Redo、Bold、H1、Copy、Paste、など）
- 複数のツールボタンを順番に使用すると、より早く問題が発生する傾向がある

#### 関連コード

**ツールバーボタンのイベント処理** (`js/app.js`):
```javascript
function bindToolbarAction(button, action) {
    if (!button) return;
    
    // mousedownでフォーカス維持（デスクトップ用）
    button.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });

    // 標準クリックイベントのみ使用
    button.addEventListener('click', (e) => {
        e.preventDefault();
        action();
        playSound('click');
        editor.focus();
    });
}
```

**ツールバーのCSS** (`css/style.css`):
```css
#toolbar {
    /* ... */
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x pinch-zoom;
    /* ... */
}

.tool-btn {
    /* ... */
    /* touch-action は削除 - 親要素（ツールバー）の pan-x に任せる */
}
```

---

## テスト方法

### 方法1: Chrome DevToolsのデバイスモード（最も簡単）

#### 手順
1. Chromeで `index.html` を開く（またはローカルサーバーで起動）
2. **F12** または **Cmd+Option+I** (Mac) / **Ctrl+Shift+I** (Windows) でDevToolsを開く
3. **デバイスツールバーアイコン**（📱）をクリック、または **Cmd+Shift+M** (Mac) / **Ctrl+Shift+M** (Windows)
4. デバイスを選択（例: iPhone 12 Pro, Pixel 5）
5. **タッチエミュレーション**を有効化

#### メリット
- すぐに使える
- 複数のデバイスサイズをテスト可能

#### デメリット
- 実際のタッチ感覚は再現できない
- 一部のタッチイベントの挙動が異なる場合がある

---

### 方法2: ローカルネットワーク経由で実機からアクセス

#### 手順

1. **ローカルサーバーを起動**
   ```bash
   # プロジェクトディレクトリで実行
   python3 -m http.server 8000
   ```

2. **同じWi-Fiネットワークに接続**
   - PCとスマートフォンを同じWi-Fiネットワークに接続

3. **PCのIPアドレスを確認**
   ```bash
   # Mac
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   
   # Linux
   hostname -I
   ```

4. **スマートフォンからアクセス**
   - ブラウザで `http://[PCのIPアドレス]:8000` にアクセス
   - 例: `http://192.168.0.43:8000`

#### メリット
- 実機での実際のタッチ動作を確認できる
- パフォーマンスも実機で確認可能

---

### 方法3: ngrokを使用（外部からアクセス可能）

#### 手順
1. ngrokをインストール
   ```bash
   # Mac (Homebrew)
   brew install ngrok
   ```

2. ローカルサーバーを起動
   ```bash
   python3 -m http.server 8000
   ```

3. ngrokでトンネルを作成
   ```bash
   ngrok http 8000
   ```

4. 表示されたURLにアクセス
   - 例: `https://abc123.ngrok.io`

---

### 推奨テスト手順

1. **まずChrome DevToolsで確認**
   - 基本的な動作確認
   - レイアウトの確認

2. **実機で確認**
   - ローカルネットワーク経由でアクセス
   - 実際のタッチ感覚を確認
   - パフォーマンスを確認

3. **複数のデバイスで確認**
   - iOS (Safari)
   - Android (Chrome)
   - 異なる画面サイズ

### テスト項目

#### ツールバーのスクロール
- [ ] ツールバーを水平にスワイプできる
- [ ] スクロールがスムーズ（慣性スクロール）
- [ ] スクロール中にボタンが誤ってクリックされない

#### ボタンのクリック
- [ ] ボタンをタップすると即座に反応する
- [ ] ダブルタップズームが発生しない
- [ ] スクロール後にボタンがクリックできる

#### エディタの操作
- [ ] エディタエリアでのスクロールが正常
- [ ] ツールバーとエディタのスクロールが干渉しない

---

## デプロイ方法

### ⚠️ 重要: 自動デプロイについて

**`main`ブランチにpushするたびに自動的にデプロイされます。**

### デプロイ状況の確認方法

1. **Vercelのダッシュボードで確認**:
   - [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
   - プロジェクト「nongkhai」を開く
   - 「Deployments」タブで最新のデプロイ状況を確認
   - 最新のコミットハッシュが表示されているか確認

2. **GitHub Actionsで確認**（オプション）:
   - GitHubリポジトリの「Actions」タブを開く
   - ワークフローの実行状況を確認（現在は無効化されています）

3. **最新のコミットを確認**:
   ```bash
   git log --oneline -1
   ```
   - 最新のコミットハッシュを確認
   - Vercelのダッシュボードで同じコミットハッシュがデプロイされているか確認

### 方法1: Vercelの自動デプロイ機能（推奨・最も簡単）

VercelはGitHubリポジトリと連携している場合、自動的にデプロイされます。

#### セットアップ確認
1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクト「nongkhai」を開く
3. **Settings** → **Git** を確認
4. **Production Branch** が `main` に設定されているか確認
5. **Automatic deployments from Git** が有効になっているか確認

#### デプロイの流れ
1. 変更をコミット: `git commit -m "説明"`
2. `main`ブランチにpush: `git push origin main`
3. **自動的にデプロイが開始される**
4. Vercelのダッシュボードでデプロイの進行状況を確認

---

### 方法2: GitHub Actionsを使用した自動デプロイ（より細かい制御が必要な場合）

#### セットアップ手順

1. **Vercelトークンの取得**
   - [Vercel Dashboard](https://vercel.com/dashboard) → [Settings](https://vercel.com/account/tokens) → Tokens
   - 「Create Token」をクリック
   - トークン名を入力して作成
   - トークンをコピー

2. **Vercelプロジェクト情報の取得**
   - `.vercel/project.json`ファイルから以下を確認：
     - `projectId`: プロジェクトID
     - `orgId`: 組織ID

3. **GitHub Secretsの設定**
   - GitHubリポジトリのページに移動
   - **Settings** → **Secrets and variables** → **Actions** を開く
   - 以下の3つのシークレットを追加：
     - **`VERCEL_TOKEN`**: Vercelトークン
     - **`VERCEL_ORG_ID`**: `.vercel/project.json`の`orgId`
     - **`VERCEL_PROJECT_ID`**: `.vercel/project.json`の`projectId`

---

### デプロイの確認

1. **Vercelのダッシュボードで確認**
   - [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
   - プロジェクト「nongkhai」を開く
   - デプロイの進行状況を確認

2. **GitHub Actionsで確認**
   - GitHubリポジトリの**Actions**タブを開く
   - ワークフローの実行状況を確認

---

## トラブルシューティング

### デプロイ関連

#### デプロイが失敗する場合
1. **GitHub Secretsが正しく設定されているか確認**
   - Settings → Secrets and variables → Actions で確認

2. **Vercelトークンが有効か確認**
   - トークンの有効期限を確認
   - 必要に応じて新しいトークンを生成

3. **ワークフローのログを確認**
   - GitHub Actionsのページで失敗したワークフローを開く
   - エラーメッセージを確認

#### Vercel CLIで直接デプロイする場合
```bash
# Vercel CLIをインストール（未インストールの場合）
npm install -g vercel

# ログイン
vercel login

# デプロイ
vercel --prod
```

---

### テスト関連

#### ローカルサーバーに接続できない場合
- ファイアウォールの設定を確認
- PCとスマートフォンが同じWi-Fiネットワークに接続されているか確認
- IPアドレスが正しいか確認

#### タッチイベントが動作しない場合
- `touch-action` CSSプロパティが正しく設定されているか確認
- ブラウザの開発者ツールでコンソールエラーを確認
- 実機のブラウザが最新版か確認

---

### 開発関連

#### コードの変更が反映されない場合
1. ブラウザのキャッシュをクリア
2. ハードリロード: **Cmd+Shift+R** (Mac) / **Ctrl+Shift+R** (Windows)
3. デプロイが完了しているか確認

#### メモリリークの確認
1. Chrome DevToolsのMemoryタブでヒープスナップショットを取得
2. 操作を実行
3. 再度スナップショットを取得
4. メモリの増加を確認

---

## 今後の改善案

- **コード構造の改善**: `app.js` が1200行を超えており、機能ごとのモジュール分割（例: `audio.js`, `toolbar.js`, `editor.js`）を検討すべき
- **オーディオライブラリの導入**: Web Audio APIの生操作は複雑になりがちなので、より堅牢な管理のために軽量なライブラリ（Howler.jsなど）の導入を検討
- **状態管理**: 現在、状態がグローバル変数に散らばっているため、簡単なステート管理パターンを導入するとデバッグが容易になる

---

---

### [2025-12-02] Web同期をFirestore直書きに単純化（Dexie非依存）

#### 1. 問題の概要
- 端末間でリストやゴミ箱状態が食い違い、Firestoreが空扱いになるケースがあった。
- ローカルDB（Dexie）を挟む複雑さがデバッグのボトルネックになっていた。Web版ではローカルキャッシュを不要とする方針に変更。

#### 2. 実施した修正
- `js/app.js` に Firestoreヘルパーを追加し、CRUD を Firestore直読み書きに統一。
  - `createNote / loadNote / saveCurrentNote / toggleFavorite / deleteNote / restoreNote / updateNoteList` をすべて Firestore直接操作へ変更。
  - ゴミ箱移動・復元時に `updated` を更新してクラウドへ反映、完全削除時も Firestoreから削除。
  - 初回ロードは Firestoreから最新を取得して開く（ローカルDBは参照しない）。
- サイドメニュー操作の効果音を停止。
- 同期完了時にサイドメニューへ「最終同期」時刻を表示するように変更。
- 履歴機能は Dexie依存のため、Web同期専念モードでは利用不可である旨をトースト表示するガードを追加。

#### 3. 検証結果
- ⏳ 検証待ち（複数端末/ブラウザでの同期確認未実施、iOS Brave/Safariでのリスト表示要確認）

#### 4. 次のステップ
- Firestoreコンソールで `users/{uid}/notes` にデータが存在するか確認し、端末間で同じリストが出るか実機で検証。
- もし表示されない場合、ログイン直後に `syncFromFirestore` が走っているかブラウザコンソールで確認（iOSはSafariリモートデバッグが必要）。
- Web版ではローカルキャッシュ不要方針。オフライン対応や履歴を再度使う場合は、後でFirestore版履歴 or ローカルキャッシュ復活を検討。

## 📝 ログ記録のテンプレート

新しい作業を記録する際は、以下のテンプレートを使用してください：

```markdown
## [YYYY-MM-DD] 問題のタイトル

### 1. 問題の概要
- 何が問題だったか
- どのような症状が発生したか

### 2. 実施した修正
- 何を修正したか
- どのファイルを変更したか
- コードの変更内容（必要に応じて）

### 3. 検証結果
- ✅ 成功
- ⏳ 検証待ち
- ❌ 失敗

### 4. 次のステップ
- 次に何をするか
- 実機テストが必要か
- 追加の修正が必要か
```

---

**最終更新**: 2025-01-XX
**次回作業時**: このファイルを開いて最新の状態を確認してから作業を開始してください。

**注意**: 
- このファイルは統合ログです。他のデバッグファイル（DEBUG_PROMPT.md、MOBILE_TESTING.md、DEPLOY_SETUP.md、DEV_LOG.md）は削除され、このファイルに統合されました。
- **どのエディタで作業しても、このファイルを開いて最新の状態を確認してください。**
- **すべての作業工程をこのファイルの「開発ログ」セクションに記録してください。**
- 問題の発見から解決まで、試行錯誤した内容も含めてすべて記録してください。
- 失敗した試みも記録してください（同じ失敗を繰り返さないため）。
