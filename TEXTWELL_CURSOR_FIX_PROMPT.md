   # Textwell風カーソル追従機能の修正プロンプト

## 問題の概要

Textwell風のカーソル追従機能を実装しましたが、デプロイ後の実機テストで動作していません。
タッチデバイスで画面上部のテキストをなぞっても、カーソルが追従しません。

## 現在の実装状況

### 実装済みの内容

1. **CSS** (`css/style.css` 809-816行目)
   - タッチデバイス時に`#highlight-layer`の`pointer-events: auto`を設定
   - メディアクエリ: `@media (hover: none) and (pointer: coarse)`

2. **JavaScript** (`js/app.js` 1331-1480行目あたり)
   - `initTextwellCursorTracking()`関数を実装
   - `initOtherEventListeners()`内で呼び出し
   - タッチイベント（`touchstart`, `touchmove`, `touchend`）を`#highlight-layer`に追加

### 実装の詳細

```javascript
// js/app.js 1331行目あたり
function initTextwellCursorTracking() {
    if (!highlightLayer || !editor) return;
    
    // タッチデバイス判定
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;
    
    // タッチ位置からカーソル位置を計算する関数
    function getCursorPositionFromTouch(touchX, touchY) {
        // ... 実装済み
    }
    
    // タッチイベントハンドラー
    highlightLayer.addEventListener('touchstart', ...);
    highlightLayer.addEventListener('touchmove', ...);
    highlightLayer.addEventListener('touchend', ...);
}
```

## 考えられる問題点

### 1. **スクロール位置の計算が間違っている（最重要）**
   - `getCursorPositionFromTouch`関数内（1360行目）で`editor.scrollTop`を使用しているが、実際のスクロールは`#editor-scroll-area`（`scrollArea`変数）で行われている
   - `js/app.js`の4行目で`const scrollArea = document.getElementById('editor-scroll-area');`として定義されている
   - **修正が必要**: `editor.scrollTop`を`scrollArea.scrollTop`に変更

### 2. **CSSメディアクエリの互換性**
   - `@media (hover: none) and (pointer: coarse)`が一部のブラウザで正しく動作しない可能性
   - より確実な方法として、JavaScript側でタッチデバイスを検出してクラスを追加する方法を検討

### 3. **初期化タイミングの問題**
   - `initOtherEventListeners()`が`initializeApp()`内で呼ばれているが、DOM要素が準備できていない可能性
   - `highlightLayer`と`editor`が確実に存在するか確認が必要

### 4. **タッチイベントの伝播が阻害されている可能性**
   - 他のイベントハンドラーが`preventDefault()`を呼んでいる可能性
   - `#highlight-layer`の`pointer-events`が正しく設定されているか確認

## 必要な修正

### 1. スクロール位置の修正（最重要）

`getCursorPositionFromTouch`関数内で、`editor.scrollTop`の代わりに`scrollArea.scrollTop`を使用する必要があります。

**現在のコード（1360行目）:**
```javascript
const editorRect = editor.getBoundingClientRect();
const scrollTop = editor.scrollTop || 0;  // ← これが問題

// タッチ位置をエディタ内の相対座標に変換
const relativeX = touchX - editorRect.left;
const relativeY = touchY - editorRect.top + scrollTop;  // ← scrollTopが0のまま
```

**修正案:**
```javascript
const editorRect = editor.getBoundingClientRect();
// scrollAreaのスクロール位置を使用（scrollAreaはグローバル変数として定義済み）
const scrollTop = (scrollArea && scrollArea.scrollTop) || 0;

// タッチ位置をエディタ内の相対座標に変換
const relativeX = touchX - editorRect.left;
const relativeY = touchY - editorRect.top + scrollTop;
```

**注意**: `scrollArea`は`js/app.js`の4行目でグローバル変数として定義されているので、`initTextwellCursorTracking`関数内でも使用可能です。

### 2. デバッグログの追加

動作確認のため、以下の箇所に`console.log`を追加してデバッグ:

```javascript
function initTextwellCursorTracking() {
    console.log('[Textwell] 初期化開始');
    if (!highlightLayer || !editor) {
        console.error('[Textwell] highlightLayerまたはeditorが見つかりません');
        return;
    }
    
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    console.log('[Textwell] タッチデバイス判定:', isTouchDevice);
    if (!isTouchDevice) return;
    
    // ... 中略 ...
    
    highlightLayer.addEventListener('touchstart', (e) => {
        console.log('[Textwell] touchstart発火', e.touches.length);
        // ... 中略 ...
    });
}
```

### 3. CSSメディアクエリのフォールバック

より確実な方法として、JavaScript側でタッチデバイスを検出してクラスを追加:

```javascript
// タッチデバイスの場合、bodyにクラスを追加
if (isTouchDevice) {
    document.body.classList.add('touch-device');
}
```

CSS側（`css/style.css`）:
```css
.touch-device #highlight-layer {
    pointer-events: auto;
}
```

これにより、メディアクエリの互換性問題を回避できます。

### 4. 初期化タイミングの確認

`initializeApp()`が呼ばれるタイミングで、`highlightLayer`と`editor`が確実に存在するか確認。必要に応じて、`DOMContentLoaded`イベント後に初期化するように変更。

## 関連ファイル

- `js/app.js`: メインのJavaScriptファイル（2857行）
- `css/style.css`: スタイルシート
- `index.html`: HTML構造（`#highlight-layer`と`#editor`の定義を確認）

## 期待される動作

1. タッチデバイスで`#highlight-layer`上をタッチ
2. タッチ位置に対応するテキスト内のカーソル位置を計算
3. `editor.setSelectionRange()`でカーソルを移動
4. タッチを動かすと、カーソルがスムーズに追従

## テスト方法

1. タッチデバイス（iPhone、iPad、Android）でアプリを開く
2. エディタにテキストを入力
3. `#highlight-layer`上（画面上部のテキスト表示部分）を指でなぞる
4. カーソルが追従するか確認

## 参考: Textwellの動作

Textwellでは、モバイル版で画面上部の文章をなぞると、自動的に文字入力位置のカーソルが追従して移動する機能がありました。この機能を再現することが目標です。

