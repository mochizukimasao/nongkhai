// Firebase同期レイヤー
// ローカル（IndexedDB）とクラウド（Firestore）の同期を管理

let syncInProgress = false;
let syncStatusListeners = [];
let unsubscribeNotes = null;

// デバウンス用のタイマー
let syncDebounceTimer = null;
const SYNC_DEBOUNCE_MS = 500; // 500ms待機
const NOTE_SYNC_DEBOUNCE_MS = 500;
const MAX_SYNC_RETRY = 3;
const RETRY_BASE_DELAY_MS = 500;

// ローカル→クラウド同期のキュー
let pendingLocalNoteSyncs = new Set();
let localSyncTimer = null;
let localSyncInFlight = false;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 同期状態のリスナーを登録
function onSyncStatusChange(callback) {
    syncStatusListeners.push(callback);
}

// 同期状態を通知
function notifySyncStatus(status, message, progress = null) {
    syncStatusListeners.forEach(callback => callback(status, message, progress));
}

// ユーザーがログインしているか確認
function isAuthenticated() {
    return window.firebaseAuth && window.firebaseAuth.currentUser !== null;
}

// Firestoreのパスを取得
function getNotesCollection() {
    if (!isAuthenticated()) return null;
    const userId = window.firebaseAuth.currentUser.uid;
    return window.firebaseDb.collection('users').doc(userId).collection('notes');
}

// ローカルノートをFirestore形式に変換
function localNoteToFirestore(note, delta = null) {
    const data = {
        text: note.text || '',
        created: note.created || Date.now(),
        updated: note.updated || Date.now(),
        favorite: note.favorite || 0,
        deleted: note.deleted || null,
        syncedAt: Date.now()
    };
    
    // フェーズ2: 差分がある場合は追加
    if (delta) {
        data.lastDelta = delta;
        data.deltaUpdated = Date.now();
    }
    
    return data;
}

// Firestoreノートをローカル形式に変換（フェーズ2: 差分適用対応）
function firestoreNoteToLocal(firestoreId, firestoreData, localText = null) {
    let text = firestoreData.text || '';
    
    // フェーズ2: 差分がある場合、ローカルテキストに適用を試みる
    if (localText && firestoreData.lastDelta && typeof diff_match_patch !== 'undefined') {
        try {
            const dmp = new diff_match_patch();
            const patches = dmp.patch_fromText(firestoreData.lastDelta);
            const [patchedText, results] = dmp.patch_apply(patches, localText);
            
            // パッチがすべて適用できた場合のみ使用
            if (results.every(r => r === true)) {
                text = patchedText;
            }
            // パッチが適用できない場合は、テキスト全体を使用（フォールバック）
        } catch (error) {
            console.warn('Failed to apply delta, using full text:', error);
            // エラーが発生した場合は、テキスト全体を使用
        }
    }
    
    return {
        id: null, // ローカルIDは後で設定
        firestoreId: firestoreId,
        text: text,
        created: firestoreData.created || Date.now(),
        updated: firestoreData.updated || Date.now(),
        favorite: firestoreData.favorite || 0,
        deleted: firestoreData.deleted || null,
        syncedAt: firestoreData.syncedAt || Date.now()
    };
}

// 単一のノートをFirestoreに保存（フェーズ2: 差分対応）
async function syncNoteToFirestore(noteId, note, delta = null) {
    if (!isAuthenticated() || !window.db) return false;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        notifySyncStatus('disconnected', 'オフラインのため同期待機中');
        return false;
    }
    if (!note) return false;
    
    try {
        const notesCollection = getNotesCollection();
        if (!notesCollection) return false;
        
        const firestoreData = localNoteToFirestore(note, delta);
        const firestoreId = note.firestoreId;
        
        if (firestoreId) {
            // 既存のノートを更新
            await notesCollection.doc(firestoreId).update(firestoreData);
        } else {
            // 新しいノートを作成
            const docRef = await notesCollection.add(firestoreData);
            // ローカルDBにfirestoreIdを保存
            await window.db.notes.update(noteId, { firestoreId: docRef.id });
        }
        
        return true;
    } catch (error) {
        console.error('Error syncing note to Firestore:', error);
        return false;
    }
}

async function syncNoteToFirestoreWithRetry(noteId, note) {
    let delayMs = RETRY_BASE_DELAY_MS;
    for (let attempt = 1; attempt <= MAX_SYNC_RETRY; attempt++) {
        const currentNote = note || await window.db.notes.get(noteId);
        if (!currentNote) return false;

        const success = await syncNoteToFirestore(noteId, currentNote);
        if (success) return true;

        if (attempt < MAX_SYNC_RETRY) {
            await delay(delayMs);
            delayMs *= 2;
            notifySyncStatus('syncing', `再試行中... (${attempt}/${MAX_SYNC_RETRY})`);
        }
    }
    return false;
}

// Firestoreからノートを削除
async function deleteNoteFromFirestore(firestoreId) {
    if (!isAuthenticated() || !firestoreId) return false;
    
    try {
        const notesCollection = getNotesCollection();
        if (!notesCollection) return false;
        
        await notesCollection.doc(firestoreId).delete();
        return true;
    } catch (error) {
        console.error('Error deleting note from Firestore:', error);
        return false;
    }
}

// ローカル保存済みノートの同期をキューイング
function queueNoteSync(noteId) {
    if (!noteId || !window.db) return;
    pendingLocalNoteSyncs.add(noteId);
    if (localSyncTimer) clearTimeout(localSyncTimer);
    localSyncTimer = setTimeout(processLocalSyncQueue, NOTE_SYNC_DEBOUNCE_MS);
}

async function processLocalSyncQueue() {
    if (localSyncInFlight) return;
    if (pendingLocalNoteSyncs.size === 0) return;

    if (localSyncTimer) {
        clearTimeout(localSyncTimer);
        localSyncTimer = null;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        notifySyncStatus('disconnected', 'オフラインのため同期待機中');
        return;
    }

    if (!isAuthenticated()) {
        localSyncTimer = setTimeout(processLocalSyncQueue, RETRY_BASE_DELAY_MS * 4);
        return;
    }

    // 他の同期処理と競合しそうなら少し後でリトライ
    if (syncInProgress) {
        if (localSyncTimer) clearTimeout(localSyncTimer);
        localSyncTimer = setTimeout(processLocalSyncQueue, SYNC_DEBOUNCE_MS);
        return;
    }

    localSyncInFlight = true;
    const noteIds = Array.from(pendingLocalNoteSyncs);
    pendingLocalNoteSyncs.clear();

    try {
        for (const noteId of noteIds) {
            const synced = await syncNoteToFirestoreWithRetry(noteId);
            if (!synced) {
                // 再試行のために戻す
                pendingLocalNoteSyncs.add(noteId);
            }
        }
    } catch (error) {
        console.error('Error processing local sync queue:', error);
        notifySyncStatus('error', 'ローカル変更の同期に失敗しました');
    } finally {
        localSyncInFlight = false;
        if (pendingLocalNoteSyncs.size > 0) {
            if (localSyncTimer) clearTimeout(localSyncTimer);
            localSyncTimer = setTimeout(processLocalSyncQueue, RETRY_BASE_DELAY_MS * 2);
        }
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        notifySyncStatus('syncing', 'オンラインに復帰しました。同期を再開します。');
        processLocalSyncQueue();
        // ネット復帰後に最新を取り直す
        if (typeof syncFromFirestore === 'function') {
            syncFromFirestore();
        }
    });
    window.addEventListener('offline', () => {
        notifySyncStatus('disconnected', 'オフラインになりました');
    });
}

// 変更差分を処理する関数（最適化版）
async function syncFromFirestoreChanges(changes) {
    if (!isAuthenticated() || !window.db) return;
    
    if (syncInProgress) return;
    syncInProgress = true;
    
    try {
        notifySyncStatus('syncing', '同期中...');
        
        let hasChanges = false;
        const totalChanges = changes.length;
        let processedChanges = 0;
        let conflictNotified = false;
        const currentNoteId = window.currentNoteId || null;
        
        // 変更されたノートだけを処理
        for (const change of changes) {
            const doc = change.doc;
            const firestoreId = doc.id;
            const firestoreData = doc.data();
            
            if (change.type === 'removed') {
                // 削除されたノートをローカルからも削除
                const localNote = await window.db.notes.where('firestoreId').equals(firestoreId).first();
                if (localNote) {
                    await window.db.notes.delete(localNote.id);
                    hasChanges = true;
                }
            } else {
                // 追加または更新されたノートを処理
                const localNote = await window.db.notes.where('firestoreId').equals(firestoreId).first();
                
                // 現在編集中のノートは、リモート変更を即座に適用しない（競合を避ける）
                if (localNote && localNote.id === currentNoteId) {
                    const editorDirty = typeof editor !== 'undefined' && editor && editor.value !== localNote.text;
                    // 編集中のノートは、更新時刻を比較してリモートの方が新しい場合のみ更新
                    // フェーズ2: 編集中のノートは差分を適用せず、テキスト全体を使用（安全性のため）
                    if (editorDirty && firestoreData.updated > localNote.updated) {
                        if (!conflictNotified && typeof showToast === 'function') {
                            showToast('他の端末で更新がありました。保存後に再読み込みしてください。');
                        }
                        conflictNotified = true;
                        notifySyncStatus('error', '編集中のノートにリモート更新があり、上書きを保留しました');
                    } else if (firestoreData.updated > localNote.updated) {
                        await window.db.notes.update(localNote.id, {
                            text: firestoreData.text,
                            updated: firestoreData.updated,
                            favorite: firestoreData.favorite,
                            deleted: firestoreData.deleted,
                            syncedAt: firestoreData.syncedAt || Date.now()
                        });
                        hasChanges = true;
                        
                        // 現在表示中のノートが更新された場合、エディタを更新
                        if (typeof loadNote === 'function') {
                            loadNote(localNote.id);
                        }
                    }
                } else if (localNote) {
                    // 編集中でないノートは、更新時刻を比較して新しい方を優先
                    // フェーズ2: 差分を適用してテキストを再構築
                    if (firestoreData.updated > localNote.updated) {
                        const mergedNoteData = firestoreNoteToLocal(firestoreId, firestoreData, localNote.text);
                        await window.db.notes.update(localNote.id, {
                            text: mergedNoteData.text,
                            updated: firestoreData.updated,
                            favorite: firestoreData.favorite,
                            deleted: firestoreData.deleted,
                            syncedAt: firestoreData.syncedAt || Date.now()
                        });
                        hasChanges = true;
                    }
                } else {
                    // 新しいノートを追加
                    const localNoteData = firestoreNoteToLocal(firestoreId, firestoreData);
                    delete localNoteData.id;
                    await window.db.notes.add(localNoteData);
                    hasChanges = true;
                }
            }

            processedChanges++;
            // 大量更新時に進捗が分かるよう、数件ごとにステータスを更新
            if (totalChanges > 0 && (processedChanges === totalChanges || processedChanges % 5 === 0)) {
                const progress = Math.round((processedChanges / totalChanges) * 100);
                notifySyncStatus('syncing', `クラウドから ${processedChanges}/${totalChanges} 件を反映中...`, progress);
            }
        }
        
        if (hasChanges) {
            notifySyncStatus('synced', '同期完了', 100);
            
            // ノートリストを更新
            if (typeof updateNoteList === 'function') {
                updateNoteList();
            }
        } else {
            // 変更がなくても進捗表示をリセット
            notifySyncStatus('synced', '同期完了 (変更なし)', 100);
        }
        
    } catch (error) {
        console.error('Error syncing from Firestore changes:', error);
        notifySyncStatus('error', '同期エラー: ' + error.message);
    } finally {
        syncInProgress = false;
    }
}

// ローカルに存在する未同期ノート（firestoreIdがないもの）をクラウドへアップロード
async function uploadLocalOrphanNotes() {
    if (!isAuthenticated() || !window.db) return;
    // Dexie 3.x does not allow equals(null) on indexed fields; use filter instead
    const orphanNotes = await window.db.notes.filter(note => !note.firestoreId).toArray();
    if (orphanNotes.length === 0) return;

    notifySyncStatus('syncing', `ローカル未同期ノート ${orphanNotes.length} 件をアップロード中...`);
    let uploaded = 0;

    for (const note of orphanNotes) {
        const success = await syncNoteToFirestoreWithRetry(note.id, note);
        if (success) uploaded++;
    }

    notifySyncStatus('syncing', `ローカル未同期ノート ${uploaded}/${orphanNotes.length} 件をアップロード完了`);
}

// Firestoreからすべてのノートを取得してローカルDBを「サーバー状態で上書き」する
// 👉 Firestore を唯一のソース・オブ・トゥルースとみなし、
//    各端末の IndexedDB は毎回ここから再構築する方針にする。
//    これにより「端末ごとに Trash 状態がずれる」「重複ノートが端末ごとに違う」
//    といった状態をリセットして常に揃える。
async function syncFromFirestore() {
    if (!isAuthenticated() || !window.db) return;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        notifySyncStatus('disconnected', 'オフラインのためクラウド同期を保留しました');
        return;
    }
    
    if (syncInProgress) return;
    syncInProgress = true;
    
    try {
        // クリア前にローカルのみ存在するノートをアップロードして消失を防ぐ
        await uploadLocalOrphanNotes();

        notifySyncStatus('syncing', 'Firestoreから同期中...');
        
        const notesCollection = getNotesCollection();
        if (!notesCollection) {
            syncInProgress = false;
            return;
        }

        const snapshot = await notesCollection.get();

        // リモートが空の場合はローカルを消さずに終了
        if (snapshot.empty) {
            notifySyncStatus('synced', 'クラウドにデータがありません');
            return;
        }

        // --- 重要方針 ---
        // Firestore 上の状態をそのままローカルにミラーするため、
        // いったんローカル notes テーブルをクリアしてから
        // Firestore の内容で再構築する。
        await window.db.notes.clear();

        const docs = [];
        snapshot.forEach((doc) => {
            docs.push(doc);
        });

        const total = docs.length;
        let processed = 0;

        for (const doc of docs) {
            const firestoreId = doc.id;
            const data = doc.data();
            const localNoteData = firestoreNoteToLocal(firestoreId, data);
            delete localNoteData.id; // idは自動生成される
            await window.db.notes.add(localNoteData);

            processed++;
            if (total > 0 && (processed === total || processed % 10 === 0)) {
                const progress = Math.round((processed / total) * 100);
                notifySyncStatus('syncing', `Firestoreから ${processed}/${total} 件を同期中...`, progress);
            }
        }
        
        notifySyncStatus('synced', '同期完了', 100);
        
        // ノートリストを更新
        if (typeof updateNoteList === 'function') {
            updateNoteList();
        }
        
    } catch (error) {
        console.error('Error syncing from Firestore:', error);
        notifySyncStatus('error', '同期エラー: ' + error.message);
    } finally {
        syncInProgress = false;
    }
}

// Firestoreのリアルタイムリスナーを設定
function setupFirestoreListener() {
    if (!isAuthenticated() || !window.db) return;
    
    // 既存のリスナーを解除
    if (unsubscribeNotes) {
        unsubscribeNotes();
    }
    
    try {
        const notesCollection = getNotesCollection();
        if (!notesCollection) return;
        
        unsubscribeNotes = notesCollection.onSnapshot(
            (snapshot) => {
                // 変更差分を取得
                const changes = snapshot.docChanges();
                
                if (changes.length === 0) return;
                
                // デバウンス処理：連続する変更をまとめる
                if (syncDebounceTimer) {
                    clearTimeout(syncDebounceTimer);
                }
                
                syncDebounceTimer = setTimeout(() => {
                    // 変更差分だけを処理（全ノートを再取得しない）
                    syncFromFirestoreChanges(changes);
                }, SYNC_DEBOUNCE_MS);
            },
            (error) => {
                console.error('Firestore listener error:', error);
                notifySyncStatus('error', 'リアルタイム同期エラー');
            }
        );
    } catch (error) {
        console.error('Error setting up Firestore listener:', error);
    }
}

// すべてのローカルノートをFirestoreに同期
async function syncAllToFirestore() {
    if (!isAuthenticated() || !window.db) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        notifySyncStatus('disconnected', 'オフラインのため全件同期を保留しました');
        return;
    }
    
    if (syncInProgress) return;
    syncInProgress = true;
    
    try {
        notifySyncStatus('syncing', 'Firestoreに同期中...');
        
        const localNotes = await window.db.notes.toArray();
        let syncedCount = 0;
        
        for (const note of localNotes) {
            if (!note.deleted) {
                const success = await syncNoteToFirestore(note.id, note);
                if (success) syncedCount++;
            }
        }
        
        notifySyncStatus('synced', `${syncedCount}件のノートを同期しました`);
        
    } catch (error) {
        console.error('Error syncing all to Firestore:', error);
        notifySyncStatus('error', '同期エラー: ' + error.message);
    } finally {
        syncInProgress = false;
    }
}

// 同期を停止（ログアウト時など）
function stopSync() {
    if (unsubscribeNotes) {
        unsubscribeNotes();
        unsubscribeNotes = null;
    }
    syncInProgress = false;
    notifySyncStatus('disconnected', '同期を停止しました');
}

// エクスポート
window.syncManager = {
    syncNoteToFirestore,
    deleteNoteFromFirestore,
    syncFromFirestore,
    syncAllToFirestore,
    setupFirestoreListener,
    stopSync,
    onSyncStatusChange,
    isAuthenticated,
    queueNoteSync
};
