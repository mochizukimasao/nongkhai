//------------------------------------------------------------
// Sync Module for Nongkhai Text Editor
// Handles Firestore synchronization for notes
//------------------------------------------------------------

console.log('[sync] loading...');

//------------------------------------------------------------
// Get Firestore collection for current user
//------------------------------------------------------------
function getNotesCollection(user) {
    // window.firebaseFirestoreを使用
    const firestore = window.firebaseFirestore;
  
    if (!firestore) {
      console.error('[sync] Firestore is not initialized (window.firebaseFirestore is undefined)');
      throw new Error('Firestore is not initialized');
    }
  
    if (!user || !user.uid) {
      console.error('[sync] User is not available for getNotesCollection');
      throw new Error('User is not available');
    }
  
    return firestore
      .collection('users')
      .doc(user.uid)
      .collection('notes');
}

//------------------------------------------------------------
// SyncManager class
//------------------------------------------------------------
function SyncManager() {
    this.listenerUnsubscribe = null;
    this.syncStatusCallbacks = [];
    this.currentUser = null;
}

SyncManager.prototype.setupFirestoreListener = function() {
    if (!window.firebaseAuth || !window.firebaseFirestore) {
        console.error('[sync] Firebase not initialized');
        return;
    }

    const user = window.firebaseAuth.currentUser;
    if (!user) {
        console.warn('[sync] No user logged in');
        return;
    }

    this.currentUser = user;

    try {
        const collection = getNotesCollection(user);
        
        // 既存のリスナーを解除
        if (this.listenerUnsubscribe) {
            this.listenerUnsubscribe();
        }

        this.listenerUnsubscribe = collection.orderBy('updatedAt', 'desc').onSnapshot(
            (snapshot) => {
                const notes = [];
                snapshot.forEach((doc) => {
                    notes.push({ id: doc.id, ...doc.data() });
                });
                
                // 同期状態を更新
                this.updateSyncStatus('synced');
                
                // ノートをローカルDBに保存
                if (window.db && window.saveNoteLocally) {
                    notes.forEach(note => {
                        window.saveNoteLocally(note.id, note);
                    });
                }
                
                // ノートリストを更新
                if (window.updateNoteList) {
                    window.updateNoteList();
                }
            },
            (error) => {
                console.error('[sync] Firestore listener error', error);
                this.updateSyncStatus('error');
            }
        );

        console.log('[sync] Firestore listener set up');
    } catch (error) {
        console.error('[sync] Error setting up Firestore listener:', error);
        this.updateSyncStatus('error');
    }
};

SyncManager.prototype.syncFromFirestore = async function() {
    if (!window.firebaseAuth || !window.firebaseFirestore) {
        console.error('[sync] Firebase not initialized');
        return;
    }

    const user = window.firebaseAuth.currentUser;
    if (!user) {
        console.warn('[sync] No user logged in');
        return;
    }

    try {
        this.updateSyncStatus('syncing');
        const collection = getNotesCollection(user);
        const snapshot = await collection.get();

        if (window.db && window.saveNoteLocally) {
            snapshot.forEach((doc) => {
                window.saveNoteLocally(doc.id, doc.data());
            });
        }

        this.updateSyncStatus('synced');
        console.log('[sync] Firestore → local sync complete');
    } catch (error) {
        console.error('[sync] Error syncing from Firestore:', error);
        this.updateSyncStatus('error');
    }
};

SyncManager.prototype.syncToFirestore = async function(noteId, noteData) {
    if (!window.firebaseAuth || !window.firebaseFirestore) {
        console.error('[sync] Firebase not initialized');
        return;
    }

    const user = window.firebaseAuth.currentUser;
    if (!user) {
        console.warn('[sync] No user logged in');
        return;
    }

    try {
        const collection = getNotesCollection(user);
        await collection.doc(noteId).set({
            ...noteData,
            updatedAt: new Date().toISOString()
        });

        this.updateSyncStatus('synced');
        console.log(`[sync] local → Firestore note ${noteId} saved`);
    } catch (error) {
        console.error('[sync] Error syncing to Firestore:', error);
        this.updateSyncStatus('error');
    }
};

SyncManager.prototype.stopSync = function() {
    if (this.listenerUnsubscribe) {
        this.listenerUnsubscribe();
        this.listenerUnsubscribe = null;
    }
    this.currentUser = null;
    this.updateSyncStatus('disconnected');
};

SyncManager.prototype.onSyncStatusChange = function(callback) {
    if (typeof callback === 'function') {
        this.syncStatusCallbacks.push(callback);
    }
};

SyncManager.prototype.updateSyncStatus = function(status) {
    this.syncStatusCallbacks.forEach(callback => {
        try {
            callback(status);
        } catch (error) {
            console.error('[sync] Error in sync status callback:', error);
        }
    });
};

// グローバルに公開
window.SyncManager = SyncManager;
window.syncManager = new SyncManager();

// 後方互換性のための関数
window.setupFirestoreListener = function(user, onNoteUpdate, onError) {
    if (!window.syncManager) return null;
    // この関数は非推奨だが、後方互換性のため残す
    return window.syncManager.setupFirestoreListener();
};

window.syncFromFirestore = async function(user, saveNoteLocally, onError) {
    if (!window.syncManager) return;
    await window.syncManager.syncFromFirestore();
};

window.syncToFirestore = async function(user, noteId, noteData, onError) {
    if (!window.syncManager) return;
    await window.syncManager.syncToFirestore(noteId, noteData);
};

console.log('[sync] loaded successfully');
