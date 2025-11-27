// Firebase同期レイヤー
// ローカル（IndexedDB）とクラウド（Firestore）の同期を管理

let syncInProgress = false;
let syncStatusListeners = [];
let unsubscribeNotes = null;

// デバウンス用のタイマー
let syncDebounceTimer = null;
const SYNC_DEBOUNCE_MS = 500; // 500ms待機

// 同期状態のリスナーを登録
function onSyncStatusChange(callback) {
    syncStatusListeners.push(callback);
}

// 同期状態を通知
function notifySyncStatus(status, message) {
    syncStatusListeners.forEach(callback => callback(status, message));
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
function localNoteToFirestore(note) {
    return {
        text: note.text || '',
        created: note.created || Date.now(),
        updated: note.updated || Date.now(),
        favorite: note.favorite || 0,
        deleted: note.deleted || null,
        syncedAt: Date.now()
    };
}

// Firestoreノートをローカル形式に変換
function firestoreNoteToLocal(firestoreId, firestoreData) {
    return {
        id: null, // ローカルIDは後で設定
        firestoreId: firestoreId,
        text: firestoreData.text || '',
        created: firestoreData.created || Date.now(),
        updated: firestoreData.updated || Date.now(),
        favorite: firestoreData.favorite || 0,
        deleted: firestoreData.deleted || null,
        syncedAt: firestoreData.syncedAt || Date.now()
    };
}

// 単一のノートをFirestoreに保存
async function syncNoteToFirestore(noteId, note) {
    if (!isAuthenticated() || !window.db) return false;
    
    try {
        const notesCollection = getNotesCollection();
        if (!notesCollection) return false;
        
        const firestoreData = localNoteToFirestore(note);
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

// 変更差分を処理する関数（最適化版）
async function syncFromFirestoreChanges(changes) {
    if (!isAuthenticated() || !window.db) return;
    
    if (syncInProgress) return;
    syncInProgress = true;
    
    try {
        notifySyncStatus('syncing', '同期中...');
        
        let hasChanges = false;
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
                    // 編集中のノートは、更新時刻を比較してリモートの方が新しい場合のみ更新
                    if (firestoreData.updated > localNote.updated) {
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
                    if (firestoreData.updated > localNote.updated) {
                        await window.db.notes.update(localNote.id, {
                            text: firestoreData.text,
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
        }
        
        if (hasChanges) {
            notifySyncStatus('synced', '同期完了');
            
            // ノートリストを更新
            if (typeof updateNoteList === 'function') {
                updateNoteList();
            }
        }
        
    } catch (error) {
        console.error('Error syncing from Firestore changes:', error);
        notifySyncStatus('error', '同期エラー: ' + error.message);
    } finally {
        syncInProgress = false;
    }
}

// Firestoreからすべてのノートを取得してローカルDBを更新（初回同期用）
async function syncFromFirestore() {
    if (!isAuthenticated() || !window.db) return;
    
    if (syncInProgress) return;
    syncInProgress = true;
    
    try {
        notifySyncStatus('syncing', 'Firestoreから同期中...');
        
        const notesCollection = getNotesCollection();
        if (!notesCollection) {
            syncInProgress = false;
            return;
        }
        
        const snapshot = await notesCollection.get();
        const firestoreNotes = [];
        
        snapshot.forEach(doc => {
            firestoreNotes.push({
                firestoreId: doc.id,
                ...doc.data()
            });
        });
        
        // ローカルDBのすべてのノートを取得
        const localNotes = await window.db.notes.toArray();
        
        // FirestoreのノートでローカルDBを更新
        for (const firestoreNote of firestoreNotes) {
            const localNote = localNotes.find(n => n.firestoreId === firestoreNote.firestoreId);
            
            if (localNote) {
                // 既存のノート: 更新時刻を比較して新しい方を優先
                if (firestoreNote.updated > localNote.updated) {
                    await window.db.notes.update(localNote.id, {
                        text: firestoreNote.text,
                        updated: firestoreNote.updated,
                        favorite: firestoreNote.favorite,
                        deleted: firestoreNote.deleted,
                        syncedAt: firestoreNote.syncedAt || Date.now()
                    });
                }
            } else {
                // 新しいノート: ローカルDBに追加
                const localNoteData = firestoreNoteToLocal(firestoreNote.firestoreId, firestoreNote);
                delete localNoteData.id; // idは自動生成される
                await window.db.notes.add(localNoteData);
            }
        }
        
        // ローカルにのみ存在するノートをFirestoreにアップロード
        for (const localNote of localNotes) {
            if (!localNote.firestoreId && !localNote.deleted) {
                await syncNoteToFirestore(localNote.id, localNote);
            }
        }
        
        notifySyncStatus('synced', '同期完了');
        
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
    isAuthenticated
};

