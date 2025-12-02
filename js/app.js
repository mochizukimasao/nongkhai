// Initialize editor elements with error checking
const editor = document.getElementById('editor');
const highlightLayer = document.getElementById('highlight-layer');
const scrollArea = document.getElementById('editor-scroll-area');
const toast = document.getElementById('toast');

    // Check if elements are available
    if (!editor) console.error('Editor element not found');
    if (!highlightLayer) console.error('Highlight layer element not found');
    if (!scrollArea) console.error('Scroll area element not found');
    if (!toast) console.warn('Toast element not found');

// --- Toolbar Buttons ---
// --- Toolbar Buttons ---
const btnFloatingMenu = document.getElementById('btn-floating-menu');
const btnSidebarNew = document.getElementById('btn-sidebar-new');
// const btnMenu = document.getElementById('btn-menu'); // Removed
const btnNew = document.getElementById('btn-new');
const btnStar = document.getElementById('btn-star');
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnH1 = document.getElementById('btn-h1');
const btnBold = document.getElementById('btn-bold');
const btnQuote = document.getElementById('btn-quote');
const btnList = document.getElementById('btn-list');
const btnOrderedList = document.getElementById('btn-ordered-list');
const btnCopy = document.getElementById('btn-copy');
const btnPaste = document.getElementById('btn-paste');
const btnSelectMode = document.getElementById('btn-select-mode');
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnTheme = document.getElementById('btn-theme');
const iconThemeSun = document.getElementById('icon-theme-sun');
const iconThemeMoon = document.getElementById('icon-theme-moon');
const btnFont = document.getElementById('btn-font'); // New Font Button
const btnSound = document.getElementById('btn-sound');
const iconSoundOn = document.getElementById('icon-sound-on');
const iconSoundOff = document.getElementById('icon-sound-off');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnBgImage = document.getElementById('btn-bg-image');
const bgImage = document.getElementById('bg-image');

// --- Sidebar Elements ---
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
const noteList = document.getElementById('note-list');

// --- Toolbar Element ---
const toolbar = document.getElementById('toolbar');

// --- Auto-hide Scrollbar Logic ---
let scrollTimeout;
    scrollArea.addEventListener('scroll', () => {
        scrollArea.classList.add('scrolling');

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            scrollArea.classList.remove('scrolling');
        }, 500); // Hide after 0.5 second of inactivity
    });

// --- Font Toggle Logic ---
function toggleFont() {
    document.body.classList.toggle('font-gothic');
    const isGothic = document.body.classList.contains('font-gothic');
    const span = btnFont.querySelector('span');

    if (isGothic) {
        span.style.fontFamily = 'sans-serif';
        showToast('Font: Gothic');
    } else {
        span.style.fontFamily = 'serif';
        showToast('Font: Mincho');
    }
    playSound('click');
    saveSettings();
    syncHeight();
}

const handleFontButton = (e) => {
    e.preventDefault();
    toggleFont();
        editor.focus();
};

btnFont.addEventListener('click', handleFontButton);
// attachTouchAction removed - relying on native click


// --- State ---
let isSoundEnabled = false;
let currentSoundProfile = 'relax'; // 'cute', 'relax', 'bubble'
const soundProfiles = ['cute', 'relax', 'bubble'];
let isSelectionMode = false;
let selectionAnchor = 0;
let audioCtx = null;

// Background image state
const bgImages = [
    { name: 'mekong', path: '../assets/bg-mekong.webp' },
    { name: 'trees', path: '../assets/bg-trees.webp' }
];
let currentBgImageIndex = 0;

// --- Touch/Scroll Detection for Toolbar ---
// Global scroll detection removed to improve responsiveness.
// We now rely on per-button touch handling in attachTouchAction.

// --- DB State ---
let db;
let currentNoteId = null;
let showTrash = false; // Toggle state for sidebar
let showFavorites = false; // Toggle state for favorites filter
let lastSyncedAt = null;

// --- Initialize DB ---
async function initDB() {
    db = new Dexie("SimpleEditorDB");
    db.version(2).stores({
        notes: '++id, text, created, updated, favorite, deleted' // Added deleted index
    }).upgrade(tx => {
        // Upgrade existing notes to have deleted: null
            return tx.notes.toCollection().modify(note => {
                    note.deleted = null;
        });
    });
    db.version(3).stores({
        notes: '++id, text, created, updated, favorite, deleted',
        noteHistory: '++id, noteId, timestamp, title, text'
    });
    // 新しいバージョンを追加してfirestoreIdインデックスを追加
    db.version(4).stores({
        notes: '++id, text, created, updated, favorite, deleted, firestoreId',
        noteHistory: '++id, noteId, timestamp, title, text'
    }).upgrade(tx => {
        // 既存のノートにfirestoreIdフィールドを追加（nullで初期化）
            return tx.notes.toCollection().modify(note => {
            if (!note.firestoreId) {
                    note.firestoreId = null;
                }
            });
    });
    window.db = db;

    // Cleanup old trash
    await cleanupTrash();

    // Load last edited note or create new (only if not deleted)
    const lastNote = await db.notes
        .filter(n => !n.deleted) // Robust check for null/undefined
        .reverse()
        .sortBy('updated');

    if (lastNote.length > 0 && lastNote[0].text.trim() === '') {
        // Reuse the last note if it's empty
        loadNote(lastNote[0].id);
    } else {
        // Otherwise, start with a fresh note
        createNote();
    }

    updateNoteList();
}

async function cleanupTrash() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    // Delete items where 'deleted' timestamp is older than 30 days
    // Dexie doesn't support complex filtering in delete directly easily, so iterate
    await db.notes
        .filter(note => note.deleted !== null && note.deleted < thirtyDaysAgo)
        .delete();
}

function getNoteTitle(text = '') {
    return (text || '').split('\n')[0].trim() || 'Untitled';
}

function escapeForHTML(text = '') {
    return (text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// --- Note Logic ---
async function createNote() {
    const id = await db.notes.add({
        text: '',
        created: Date.now(),
        updated: Date.now(),
        favorite: 0,
        deleted: null
    });
    loadNote(id);
    showToast('New Note Created');
    playSound('click');
    if (sidebar.classList.contains('open')) toggleSidebar();
}

async function loadNote(id) {
    const note = await db.notes.get(id);
    if (note) {
        currentNoteId = id;
        window.currentNoteId = currentNoteId;
        // 軽いフェード演出（CSSを触らず JS だけで適用）
        if (editor) {
            editor.style.transition = 'opacity 140ms ease';
            editor.style.opacity = '0';
        }
            editor.value = note.text;
            // If viewing a deleted note, maybe show a warning or disable editing?
            // For now, allow viewing.
                updateHighlights();
            syncHeight();
        updateStarState(note.favorite);
            scrollArea.scrollTop = 0;
        if (editor) {
            // 2フレーム待ってからフェードインし、確実にトランジションを効かせる
            requestAnimationFrame(() => {
                editor.getBoundingClientRect(); // force reflow
                requestAnimationFrame(() => {
                    editor.style.opacity = '1';
                });
            });
        }
    }
}

async function saveCurrentNote() {
    if (currentNoteId === null) return;

    const text = editor.value;
    try {
        const currentNote = await db.notes.get(currentNoteId);
        if (!currentNote) return;

        if (currentNote.text !== text) {
            // 保存前の状態を履歴として保存
            await db.noteHistory.add({
                noteId: currentNoteId,
                timestamp: Date.now(),
                text: currentNote.text || '',
                title: getNoteTitle(currentNote.text)
            });

        await db.notes.update(currentNoteId, {
            text: text,
            updated: Date.now()
        });
        updateNoteList();

        // ローカル保存が完了したらクラウド同期を要求（実処理はsyncManager側でキュー制御）
        if (window.syncManager && typeof window.syncManager.queueNoteSync === 'function') {
            window.syncManager.queueNoteSync(currentNoteId);
        }
        }
    } catch (e) {
        console.error("Save failed", e);
        showToast("Save Failed!");
    }
}

async function toggleFavorite() {
    if (currentNoteId === null) return;
    const note = await db.notes.get(currentNoteId);
    const newFav = note.favorite ? 0 : 1;
    await db.notes.update(currentNoteId, { favorite: newFav });
        updateStarState(newFav);
    updateNoteList();
    showToast(newFav ? 'Added to Favorites' : 'Removed from Favorites');
    playSound('click');
}

async function deleteNote(id, event) {
    if (event) event.stopPropagation();

    const note = await db.notes.get(id);
    if (!note) return;

    if (note.deleted === null) {
        // Move to Trash
        const now = Date.now();
        await db.notes.update(id, { deleted: now, updated: now });
        showToast('Moved to Trash');
        if (window.syncManager && typeof window.syncManager.queueNoteSync === 'function') {
            window.syncManager.queueNoteSync(id);
        }
    } else {
        // Restore or Permanently Delete? 
        // Let's implement Restore for now if clicking delete in trash
        // Or maybe a separate restore button?
        // User asked for "Trash", usually implies Restore capability.
        // Let's make this button "Restore" if in trash?
        // Or "Delete Permanently"?
        // "ゴミ箱に入れて...自動的に削除" implies temporary storage.
        // Let's assume clicking delete in trash = Permanent Delete for manual cleanup
        if (confirm('Delete permanently?')) {
            if (note.firestoreId && window.syncManager && typeof window.syncManager.deleteNoteFromFirestore === 'function') {
                try {
                    window.syncManager.deleteNoteFromFirestore(note.firestoreId);
                } catch (err) {
                    console.warn('Failed to delete from Firestore', err);
                }
            }
            await db.notes.delete(id);
            showToast('Deleted Permanently');
            if (currentNoteId === id) {
                editor.value = '';
                currentNoteId = null;
                window.currentNoteId = currentNoteId;
            }
        }
    }
    updateNoteList();
}

async function restoreNote(id, event) {
    if (event) event.stopPropagation();
    const now = Date.now();
    await db.notes.update(id, { deleted: null, updated: now });
    showToast('Restored from Trash');
    if (window.syncManager && typeof window.syncManager.queueNoteSync === 'function') {
        window.syncManager.queueNoteSync(id);
    }
    updateNoteList();
}

async function getNoteHistory(noteId) {
    if (!noteId) return [];
    try {
        const history = await db.noteHistory.where('noteId').equals(noteId).sortBy('timestamp');
        return history.reverse(); // 新しい順
    } catch (error) {
        console.error('Get note history failed', error);
        return [];
    }
}

async function restoreNoteFromHistory(noteId, historyId) {
    if (!noteId || !historyId) return;

    try {
        const note = await db.notes.get(noteId);
        const historyEntry = await db.noteHistory.get(historyId);

        if (!note || !historyEntry || historyEntry.noteId !== noteId) return;

        // 復元前の状態を履歴に保存
        await db.noteHistory.add({
            noteId,
            timestamp: Date.now(),
            text: note.text || '',
            title: getNoteTitle(note.text)
        });

        await db.notes.update(noteId, {
            text: historyEntry.text || '',
            updated: Date.now()
        });

        await loadNote(noteId);
        updateNoteList();
        showToast('履歴から復元しました');

        // 復元後のリストを最新に更新
        await renderHistoryList(noteId);
    } catch (error) {
        console.error('Restore note from history failed', error);
        showToast('履歴の復元に失敗しました');
    }
}

function updateStarState(isFav) {
    if (isFav) {
        btnStar.classList.add('favorite-active');
    } else {
        btnStar.classList.remove('favorite-active');
    }
}

// --- Mobile Detection & Responsive Helpers ---
function isMobile() {
    return window.innerWidth <= 768;
}

function handleResize() {
    // If resizing from mobile to desktop and sidebar is open, keep it open
    // If resizing from desktop to mobile and sidebar is open, close it to prevent layout issues
    if (!isMobile() && sidebar.classList.contains('open')) {
        // Desktop: sidebar can stay open
        // No action needed
    } else if (isMobile() && sidebar.classList.contains('open')) {
        // Mobile: sidebar is overlay, keep current state
        // No action needed
    }

    // Sync height on resize
    syncHeight();
}

// --- Sidebar Logic ---
function toggleSidebar() {
    try {
        // 要素の存在確認
        const sidebarEl = document.getElementById('sidebar');
        const sidebarOverlayEl = document.getElementById('sidebar-overlay');
        const floatingMenuBtn = document.getElementById('btn-floating-menu');
        
        if (!sidebarEl || !sidebarOverlayEl) {
            console.error('[toggleSidebar] Sidebar elements not found');
            return;
        }
        
        const isOpening = !sidebarEl.classList.contains('open');
        
        // 状態を確実に切り替え
        sidebarEl.classList.toggle('open');
        sidebarOverlayEl.classList.toggle('visible');

    // Hide/show floating menu button when sidebar opens/closes
        if (sidebarEl.classList.contains('open')) {
        document.body.classList.add('sidebar-open');
        // Force hide button with multiple methods
            if (floatingMenuBtn) {
                floatingMenuBtn.style.display = 'none';
                floatingMenuBtn.style.visibility = 'hidden';
                floatingMenuBtn.style.opacity = '0';
                floatingMenuBtn.style.pointerEvents = 'none';
            }
            // updateNoteList()はエラーが発生してもサイドバーは開いたままにする
            try {
        updateNoteList();
            } catch (error) {
                console.error('[toggleSidebar] Error updating note list:', error);
            }
    } else {
        document.body.classList.remove('sidebar-open');
        // Restore button visibility - always restore, CSS will handle mobile/desktop display
            if (floatingMenuBtn) {
                floatingMenuBtn.style.display = '';
                floatingMenuBtn.style.visibility = '';
                floatingMenuBtn.style.opacity = '';
                floatingMenuBtn.style.pointerEvents = '';
            }
        }
        
        // サイドメニューでは効果音を鳴らさない
    } catch (error) {
        console.error('[toggleSidebar] Unexpected error:', error);
        // エラーが発生した場合、サイドバーの状態をリセット
        const sidebarEl = document.getElementById('sidebar');
        const sidebarOverlayEl = document.getElementById('sidebar-overlay');
        if (sidebarEl) sidebarEl.classList.remove('open');
        if (sidebarOverlayEl) sidebarOverlayEl.classList.remove('visible');
        document.body.classList.remove('sidebar-open');
    }
}

function toggleFavoritesView() {
    showFavorites = !showFavorites;
    const btn = document.getElementById('btn-toggle-favorites');
        btn.classList.toggle('active', showFavorites);
    // Disable trash view when showing favorites
    if (showFavorites) {
        showTrash = false;
        const trashBtn = document.getElementById('btn-toggle-trash');
        if (trashBtn) trashBtn.classList.remove('active');
    }
    updateNoteList();
}

function toggleTrashView() {
    showTrash = !showTrash;
    const btn = document.getElementById('btn-toggle-trash');
        btn.classList.toggle('active', showTrash);
    // Disable favorites view when showing trash
    if (showTrash) {
        showFavorites = false;
        const favBtn = document.getElementById('btn-toggle-favorites');
        if (favBtn) favBtn.classList.remove('active');
    }
    updateNoteList();
}

async function renderHistoryList(noteId) {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    historyList.innerHTML = '';
    const historyItems = await getNoteHistory(noteId);

    if (historyItems.length === 0) {
        historyList.innerHTML = '<div style="padding:12px; color:#888;">履歴がありません</div>';
        return;
    }

    historyItems.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.style.padding = '10px 8px';
        item.style.borderBottom = '1px solid #333';
        item.style.cursor = 'pointer';

        const timestamp = new Date(entry.timestamp).toLocaleString();
        const title = escapeForHTML(entry.title || '');
        const previewSource = entry.text || '';
        const preview = escapeForHTML(previewSource.replace(/\s+/g, ' ').slice(0, 50));
        const overflow = previewSource.length > 50 ? '...' : '';

        item.innerHTML = `
            <div style="font-size:12px; color:#888;">${timestamp}</div>
            <div style="font-weight:bold; margin:2px 0;">${title}</div>
            <div style="font-size:12px; color:#aaa; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${preview}${overflow}</div>
        `;

        item.addEventListener('click', async (e) => {
            e.stopPropagation();
            await restoreNoteFromHistory(noteId, entry.id);
        });

        historyList.appendChild(item);
    });
}

async function showNoteHistory(noteId) {
    const modal = document.getElementById('history-modal');
    const titleEl = document.getElementById('history-modal-title');
    if (!modal || !titleEl) return;

    const note = await db.notes.get(noteId);
    titleEl.textContent = note ? `${getNoteTitle(note.text)}` : '';
    modal.dataset.noteId = noteId;
    modal.style.display = 'flex';

    await renderHistoryList(noteId);
}

function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.dataset.noteId = '';
}

function initHistoryModalEvents() {
    const modal = document.getElementById('history-modal');
    const closeBtn = document.getElementById('btn-close-history');

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeHistoryModal();
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeHistoryModal();
            }
        });
    }
}

async function updateNoteList() {
    let notes;
    if (showTrash) {
        // Show deleted notes (deleted is a timestamp)
        notes = await db.notes
            .filter(n => !!n.deleted)
            .reverse()
            .sortBy('deleted');
    } else if (showFavorites) {
        // Show favorite notes only (active notes with favorite flag)
        notes = await db.notes
            .filter(n => !n.deleted && n.favorite)
            .reverse()
            .sortBy('updated');
    } else {
        // Show active notes (deleted is null or undefined)
        notes = await db.notes
            .filter(n => !n.deleted)
            .reverse()
            .sortBy('updated');
    }

    noteList.innerHTML = '';

    if (notes.length === 0) {
        let message = 'No notes';
        if (showTrash) {
            message = 'Trash is empty';
        } else if (showFavorites) {
            message = 'No favorites';
        }
        noteList.innerHTML = `<li style="padding:20px; color:#666; text-align:center;">${message}</li>`;
        return;
    }

    notes.forEach(note => {
        const li = document.createElement('li');
        li.className = 'note-item';
        if (note.id === currentNoteId) li.classList.add('active');
        if (note.favorite) li.classList.add('favorite');

        const title = getNoteTitle(note.text);
        const date = new Date(showTrash ? note.deleted : note.updated).toLocaleString();

        // Action Buttons
        let actionBtns = '';
        if (showTrash) {
            // Restore & Delete
            actionBtns = `
            <button class="note-action-btn history" title="履歴" data-note-id="${note.id}">
                <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor;">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
            </button>
            <button class="note-action-btn restore" title="Restore">↩</button>
            <button class="note-action-btn delete" title="Delete Permanently">×</button>
        `;
        } else {
            // Favorite, History & Delete
            const favoriteClass = note.favorite ? 'favorite favorite-active' : 'favorite';
            actionBtns = `
            <button class="note-action-btn ${favoriteClass}" title="Toggle Favorite" data-note-id="${note.id}">
                <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor;">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
            </button>
            <button class="note-action-btn history" title="履歴" data-note-id="${note.id}">
                <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor;">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
            </button>
            <button class="note-action-btn delete" title="Move to Trash">×</button>
        `;
        }

        li.innerHTML = `
        <div style="flex:1; overflow:hidden;">
            <div class="note-title">${title}</div>
            <div class="note-meta">
                <span>${date}</span>
                <span class="note-fav-icon">★</span>
            </div>
        </div>
        <div class="note-actions">
            ${actionBtns}
        </div>
    `;

        // Click on item to load
        li.addEventListener('click', () => {
            loadNote(note.id);
            // Auto-close sidebar on mobile after selecting a note
            if (isMobile()) {
                toggleSidebar();
            }
        });

        // Button Events
        const btnFavorite = li.querySelector('.favorite');
        if (btnFavorite) {
            btnFavorite.addEventListener('click', async (e) => {
                e.stopPropagation();
                const noteId = parseInt(e.currentTarget.getAttribute('data-note-id'));
                if (noteId) {
                    const note = await db.notes.get(noteId);
                    if (note) {
                        const newFav = note.favorite ? 0 : 1;
                        await db.notes.update(noteId, { favorite: newFav });
                        updateNoteList();
                        if (noteId === currentNoteId) {
                            updateStarState(newFav);
                        }
                        showToast(newFav ? 'Added to Favorites' : 'Removed from Favorites');
                    }
                }
            });
        }

        const btnDelete = li.querySelector('.delete');
        if (btnDelete) btnDelete.addEventListener('click', (e) => deleteNote(note.id, e));

        const btnRestore = li.querySelector('.restore');
        if (btnRestore) btnRestore.addEventListener('click', (e) => restoreNote(note.id, e));

        const btnHistory = li.querySelector('.history');
        if (btnHistory) btnHistory.addEventListener('click', (e) => {
            e.stopPropagation();
            showNoteHistory(note.id);
        });

        noteList.appendChild(li);
    });

    // リストの差し替え時に軽い「入れ替わり」感を出すトランジションを付与
    const items = Array.from(noteList.querySelectorAll('.note-item')).slice(0, 20); // 上位だけで十分
    requestAnimationFrame(() => {
        items.forEach((item, idx) => {
            item.style.transition = 'transform 220ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 220ms ease';
            item.style.transform = 'translateY(-14px)';
            item.style.opacity = '0.75';
            item.getBoundingClientRect(); // force reflow
            requestAnimationFrame(() => {
                item.style.transform = 'translateY(0)';
                item.style.opacity = '1';
                setTimeout(() => {
                    item.style.transition = '';
                    item.style.transform = '';
                    item.style.opacity = '';
                }, 260);
            });
        });
    });
}

// --- Event Listeners for New Features ---
// イベントリスナーは initSidebarEventListeners() で初期化される

// --- Settings Persistence ---
function saveSettings() {
    const settings = {
        theme: document.body.classList.contains('light-mode') ? 'light' : 'dark',
        font: document.body.classList.contains('font-gothic') ? 'gothic' : 'serif',
        soundEnabled: isSoundEnabled,
        soundProfile: currentSoundProfile,
        bgImageIndex: currentBgImageIndex,
        bgmEnabled: isBgmEnabled
    };
    localStorage.setItem('editorSettings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('editorSettings');
    if (saved) {
        const settings = JSON.parse(saved);

    // Theme
        if (settings.theme === 'light') {
            document.body.classList.add('light-mode');
            iconThemeSun.style.display = 'none';
            iconThemeMoon.style.display = 'block';
        } else {
            document.body.classList.remove('light-mode');
            iconThemeSun.style.display = 'block';
            iconThemeMoon.style.display = 'none';
    }

    // Font
            if (settings.font === 'gothic') {
                document.body.classList.add('font-gothic');
            btnFont.querySelector('span').style.fontFamily = 'sans-serif';
            } else {
                document.body.classList.remove('font-gothic');
            btnFont.querySelector('span').style.fontFamily = 'serif';
    }

    // Sound
        if (settings.soundEnabled) {
            isSoundEnabled = true;
            currentSoundProfile = settings.soundProfile || 'relax';
            btnSound.classList.add('active');
            iconSoundOn.style.display = 'block';
            iconSoundOff.style.display = 'none';
            updateSoundIconColor();
        } else {
            isSoundEnabled = false;
            currentSoundProfile = settings.soundProfile || 'relax';
            btnSound.classList.remove('active');
            iconSoundOn.style.display = 'none';
            iconSoundOff.style.display = 'block';
            btnSound.style.color = '';
        }

        // Background Image
        if (settings.bgImageIndex !== undefined && bgImage) {
            currentBgImageIndex = settings.bgImageIndex;
            bgImage.style.backgroundImage = `url('${bgImages[currentBgImageIndex].path}')`;
        }
        
        // BGM
        if (settings.bgmEnabled) {
            // Delay BGM start slightly to avoid autoplay restrictions
            setTimeout(() => {
                startBGM();
            }, 500);
        } else {
            updateBgmUI();
        }
    }
}

// --- Initialize Sidebar Event Listeners ---
function initSidebarEventListeners() {
    console.log('[initSidebarEventListeners] Starting initialization...');
    
    // フローティングメニューボタン
    const floatingMenuBtn = document.getElementById('btn-floating-menu');
    console.log('[initSidebarEventListeners] Floating menu button found:', !!floatingMenuBtn);
    
    if (floatingMenuBtn) {
        // 既存のイベントリスナーを削除（重複防止）
        floatingMenuBtn.onclick = null;
        
        // 複数の方法でイベントリスナーを設定（カーソルの内蔵ブラウザ対応）
        const handleToggle = function(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            console.log('[initSidebarEventListeners] Button clicked!', e?.type || 'unknown');
            toggleSidebar();
            return false;
        };
        
        // addEventListener（標準的な方法）
        floatingMenuBtn.addEventListener('click', handleToggle, { capture: true });
        
        // onclick（フォールバック、カーソルの内蔵ブラウザ対応）
        floatingMenuBtn.onclick = handleToggle;
        
        // mousedown（より低レベルのイベント）
        floatingMenuBtn.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[initSidebarEventListeners] Button mousedown!');
            toggleSidebar();
            return false;
        }, { capture: true });
        
        // pointerdown（ポインターイベント）
        if (floatingMenuBtn.addEventListener) {
            floatingMenuBtn.addEventListener('pointerdown', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[initSidebarEventListeners] Button pointerdown!');
                toggleSidebar();
                return false;
            }, { capture: true });
        }
        
        // ボタンの状態を確認
        const rect = floatingMenuBtn.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(floatingMenuBtn);
        console.log('[initSidebarEventListeners] Button state:', {
            visible: computedStyle.display !== 'none',
            pointerEvents: computedStyle.pointerEvents,
            zIndex: computedStyle.zIndex,
            position: computedStyle.position,
            rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
        });
        
        // CSSで確実にクリック可能にする
        floatingMenuBtn.style.pointerEvents = 'auto';
        floatingMenuBtn.style.zIndex = '2500';
        floatingMenuBtn.style.position = 'fixed';
        floatingMenuBtn.style.cursor = 'pointer';
    } else {
        console.error('[initSidebarEventListeners] Floating menu button NOT FOUND!');
    }

    // サイドバー内の新規作成ボタン
    const sidebarNewBtn = document.getElementById('btn-sidebar-new');
    if (sidebarNewBtn) {
        sidebarNewBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            createNote();
        });
    }

    // サイドバーを閉じるボタン
    const closeSidebarBtn = document.getElementById('btn-close-sidebar');
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar();
        });
    }

    // オーバーレイのクリック処理（オーバーレイ自体のみをクリックした場合に閉じる）
    const sidebarOverlayEl = document.getElementById('sidebar-overlay');
    if (sidebarOverlayEl) {
        sidebarOverlayEl.addEventListener('click', (e) => {
            // オーバーレイ自体をクリックした場合のみ閉じる（子要素のクリックは無視）
            if (e.target === sidebarOverlayEl) {
                e.preventDefault();
                e.stopPropagation();
                toggleSidebar();
            }
        });
    }

    // お気に入り/ゴミ箱トグルボタン
    const toggleFavoritesBtn = document.getElementById('btn-toggle-favorites');
    if (toggleFavoritesBtn) {
        toggleFavoritesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavoritesView();
        });
    }

    const toggleTrashBtn = document.getElementById('btn-toggle-trash');
    if (toggleTrashBtn) {
        toggleTrashBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleTrashView();
        });
    }
}

// --- Initialize Other Event Listeners ---
function initOtherEventListeners() {
    // 新規作成ボタン
    if (btnNew) {
        btnNew.addEventListener('click', (e) => {
            e.preventDefault();
            createNote();
            if (editor) editor.focus();
        });
    }

    // お気に入りボタン
    if (btnStar) {
        btnStar.addEventListener('click', (e) => {
            e.preventDefault();
            toggleFavorite();
        });
    }
}

// Initialize - 複数のタイミングで初期化を試みる（カーソルの内蔵ブラウザ対応）
function initializeApp() {
    console.log('[initializeApp] Starting app initialization...');
    loadSettings(); // Load settings first
    
    // Initialize background image (if not loaded from settings)
    if (bgImage && bgImages.length > 0 && !bgImage.style.backgroundImage) {
        bgImage.style.backgroundImage = `url('${bgImages[currentBgImageIndex].path}')`;
    }
    
    // Initialize event listeners
    initSidebarEventListeners();
    initOtherEventListeners();
    
    initDB();
    initHistoryModalEvents();
    
    // Initialize BGM (but don't auto-start, wait for user interaction)
    initBgm();

    // Firebase Auth / Firestore 同期の初期化
    if (typeof initAuth === 'function') {
        try {
            initAuth();
        } catch (e) {
            console.warn('initAuth failed:', e);
        }
    }

    // Initialize mobile/responsive behavior
    handleResize();

    if (editor) {
        editor.focus();
    }
    
    console.log('[initializeApp] App initialization complete');
}

// 複数のタイミングで初期化を試みる
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        if (!window.appInitialized) {
            initializeApp();
            window.appInitialized = true;
        }
    });
} else {
    // DOMContentLoadedが既に発火している場合
    if (!window.appInitialized) {
        setTimeout(() => {
            initializeApp();
            window.appInitialized = true;
        }, 100);
    }
}

// 念のため、window.onloadでも初期化を試みる
window.addEventListener('load', () => {
    if (!window.appInitialized) {
        console.log('[initializeApp] Initializing on window.load (fallback)');
        initializeApp();
        window.appInitialized = true;
    }
});

// さらに念のため、少し遅延させて再初期化を試みる
setTimeout(() => {
    const btn = document.getElementById('btn-floating-menu');
    if (btn) {
        console.log('[initializeApp] Re-initializing button (delayed fallback)');
        // ボタンの状態を再確認
        const rect = btn.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(btn);
        console.log('[initializeApp] Button check:', {
            exists: !!btn,
            onclick: typeof btn.onclick,
            visible: computedStyle.display !== 'none',
            pointerEvents: computedStyle.pointerEvents,
            zIndex: computedStyle.zIndex,
            rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
        });
        
        // まだonclickが設定されていない場合、再初期化
        if (!btn.onclick) {
            initSidebarEventListeners();
        }
    }
}, 1000);


// --- Helper: Prevent Default & Play Sound ---
function handleAction(e, action) {
    // Removed global scroll check.
    // Rely on attachTouchAction to filter out scroll gestures on buttons.

    e.preventDefault(); // Keep focus
    action();
    playSound('click');
        editor.focus(); // Ensure focus
}

function bindToolbarAction(button, action) {
    if (!button) {
        console.warn('bindToolbarAction: button is null or undefined');
        return;
    }
    
    try {
        // mousedownでフォーカス維持（デスクトップ用）
    button.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Keep focus on editor
    });

        // 標準クリックイベントのみ使用
        // ブラウザのネイティブな動作に任せる：
        // - ツールバーの touch-action: pan-x により、水平スクロールが優先される
        // - タップのみの場合は click イベントが発火する
        // - スクロールの場合は click イベントは発火しない
    button.addEventListener('click', (e) => {
            e.preventDefault();
            try {
        action();
        playSound('click');
        editor.focus();
            } catch (error) {
                console.error('Error in toolbar action:', error);
            }
        });
    } catch (error) {
        console.error('Error binding toolbar action:', error, button);
    }
}

// --- Syntax Highlighting ---
function updateHighlights() {
    if (!editor || !highlightLayer) {
        console.warn('updateHighlights: editor or highlightLayer is not available');
        return;
    }
    
    try {
    let text = editor.value;

    // Escape HTML to prevent XSS and rendering issues
        // Do this first, but we'll handle quotes specially
    text = text.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Apply Markdown Styling
        // Process in order: Quote -> Heading -> Bullet -> Bold -> Symbols
        
        // Quote: > at start of line (after escaping, so we match &gt;)
        // > symbol gets colored, text part is not styled
        text = text.replace(/^(&gt;)\s+(.*)$/gm, '<span class="md-mark">&gt;</span> $2');

        // Heading: # text (at start of line)
        // Support # through ######
        // # symbol gets colored, only the text part gets underlined
        text = text.replace(/^(#{1,6})\s+(.*)$/gm, '<span class="md-mark">$1</span> <span class="md-heading">$2</span>');

        // Bullet list: - or * at start of line
        text = text.replace(/^([-*])\s+(.*)$/gm, '<span class="md-mark">$1</span> $2');

    // Bold: **text** -> **<span class="md-bold">text</span>**
    // We want to underline ONLY the text inside.
    text = text.replace(/\*\*(.*?)\*\*/g, '**<span class="md-bold">$1</span>**');

        // Markdown symbols (#, **) - color the symbols themselves
        // Only process standalone symbols that weren't already processed
        text = text.replace(/(?<!<span class="md-mark">)(#{1,6})(?!<\/span>)/g, '<span class="md-mark">$1</span>');
        text = text.replace(/(?<!<span class="md-mark">)\*\*(?!<\/span>)/g, '<span class="md-mark">**</span>');

    // Heading: # text (at start of line)
    // Support # through ######
        // # symbol gets colored, only the text part gets underlined
        text = text.replace(/^(#{1,6})\s+(.*)$/gm, '<span class="md-mark">$1</span> <span class="md-heading">$2</span>');

        // Bullet list: - or * at start of line
        text = text.replace(/^([-*])\s+(.*)$/gm, '<span class="md-mark">$1</span> $2');

        // Bold: **text** -> **<span class="md-bold">text</span>**
        // We want to underline ONLY the text inside.
        text = text.replace(/\*\*(.*?)\*\*/g, '**<span class="md-bold">$1</span>**');

        // Markdown symbols (#, **) - color the symbols themselves
        // Only process standalone symbols that weren't already processed
        text = text.replace(/(?<!<span class="md-mark">)(#{1,6})(?!<\/span>)/g, '<span class="md-mark">$1</span>');
        text = text.replace(/(?<!<span class="md-mark">)\*\*(?!<\/span>)/g, '<span class="md-mark">**</span>');

        // Convert all newlines to <br> tags
        // This ensures line breaks are properly rendered in HTML
    text = text.replace(/\n/g, '<br>');

    highlightLayer.innerHTML = text;
    } catch (error) {
        console.error('Error in updateHighlights:', error);
    }
}

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

editor.addEventListener('input', updateHighlights);

// Sync Scroll
// Since we are scrolling the parent #editor-scroll-area, and both children are absolute/full size,
// they should move together naturally if they are large enough?
// Wait, if they are position:absolute, they don't expand the parent?
// Actually, if they are absolute, the parent needs to know the size to scroll.
// Better approach: 
// Make textarea static (or relative) so it expands the parent.
// Make highlight layer absolute, top 0, left 0, matching size.
// Let's adjust the CSS logic slightly in JS or CSS.

// Correction:
// If textarea is static, it pushes the scroll height.
// Highlight layer is absolute.
// We just need to make sure highlight layer expands to match textarea height.
// Textarea auto-expands? No, textarea has fixed height 100% in CSS?
// In CSS: .editor-layer { min-height: 100%; }
// If content is longer than 100%, textarea grows? 
// Standard textarea with overflow:hidden (on itself) and height:auto (via scrollHeight) is one way.
// BUT here we have a scrollable container #editor-scroll-area.
// If we set textarea height to scrollHeight, it expands.

function syncHeight() {
    if (!editor || !highlightLayer || !scrollArea) {
        console.warn('syncHeight: editor, highlightLayer, or scrollArea is not available');
        return;
    }
    
    try {
        syncHighlightTypography();
        // Reset height to get correct scrollHeight
    editor.style.height = 'auto';
    highlightLayer.style.height = 'auto';

        // Calculate height - ensure it's at least the scroll area height
        const scrollAreaHeight = scrollArea.clientHeight;
        const editorScrollHeight = editor.scrollHeight;
        const height = Math.max(editorScrollHeight, scrollAreaHeight);
        
        // Set heights
    editor.style.height = height + 'px';
    highlightLayer.style.height = height + 'px';
        
        // #editorと#highlight-layerは同じパディングを持っているので、
        // position: absoluteでtop: 0; left: 0;に設定すれば同じ位置になる
        // 幅も同じにする
        highlightLayer.style.width = editor.offsetWidth + 'px';
    } catch (error) {
        console.error('Error in syncHeight:', error);
    }
}

// Actually, standard textarea scrolls internally.
// If we want overlay, we usually make the container scroll, and textarea + div grow.
// Let's try the "Textarea grows, Container scrolls" approach.

editor.addEventListener('input', syncHeight);
window.addEventListener('resize', handleResize);

// Initial call for editor setup
// Note: This is separate from main DOMContentLoaded to ensure editor elements are ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        updateHighlights();
        syncHeight();
        editor.focus();
    });
} else {
    // DOM already loaded
    updateHighlights();
    syncHeight();
    editor.focus();
}


// --- Undo/Redo ---
bindToolbarAction(btnUndo, () => document.execCommand('undo'));
bindToolbarAction(btnRedo, () => document.execCommand('redo'));

// --- Markdown Insertion ---
function insertMarkdown(type) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const text = editor.value;
    const selectedText = text.substring(start, end);
    let replacement = '';

    if (type === 'h1') {
        const lastNewline = text.lastIndexOf('\n', start - 1);
        const lineStart = lastNewline + 1;
        const nextNewline = text.indexOf('\n', start);
        const actualLineEnd = nextNewline === -1 ? text.length : nextNewline;
        const currentLine = text.substring(lineStart, actualLineEnd);

        const match = currentLine.match(/^(#{1,6})\s*(.*)$/); // Added * for optional space

        if (match) {
            // Already a heading, cycle level
            const currentLevel = match[1].length;
            const headingText = match[2];
            let newLevel = (currentLevel % 6) + 1; // Cycle 1-6

            if (newLevel === 1 && currentLevel === 6) {
                // If it was H6 and now cycles to H1, remove heading instead
                replacement = headingText;
            } else {
                const newHashes = '#'.repeat(newLevel);
                replacement = `${newHashes} ${headingText}`;
            }

            editor.setRangeText(replacement, lineStart, actualLineEnd, 'end');
        } else {
            // Not a heading, apply H1
            if (selectedText.length > 0) {
                replacement = `# ${selectedText}`;
                editor.setRangeText(replacement, start, end, 'end');
            } else {
                // Insert H1 at the beginning of the current line
                replacement = '# ';
                editor.setRangeText(replacement, lineStart, lineStart, 'end');
            }
        }
        updateHighlights();
        syncHeight();
        return;
    }

    switch (type) {
        case 'bold':
            replacement = `**${selectedText}**`;
            break;
        case 'quote':
            replacement = `> ${selectedText}`;
            break;
        case 'list':
            replacement = `- ${selectedText}`;
            break;
        case 'ordered-list':
            replacement = `1. ${selectedText}`;
            break;
    }

    if (document.queryCommandSupported('insertText')) {
        document.execCommand('insertText', false, replacement);
    } else {
        editor.setRangeText(replacement, start, end, 'end');
    }
    updateHighlights();
    syncHeight();
}

bindToolbarAction(btnH1, () => insertMarkdown('h1'));
bindToolbarAction(btnBold, () => insertMarkdown('bold'));
bindToolbarAction(btnQuote, () => insertMarkdown('quote'));
bindToolbarAction(btnList, () => insertMarkdown('list'));
bindToolbarAction(btnOrderedList, () => insertMarkdown('ordered-list'));

// --- Clipboard Operations ---
function showToast(message) {
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 2000);
}

function copyAll() {
    navigator.clipboard.writeText(editor.value).then(() => {
        showToast('Copied All!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showToast('Copy Failed');
    });
}

function pastePlain() {
    navigator.clipboard.readText().then(text => {
        if (document.queryCommandSupported('insertText')) {
            document.execCommand('insertText', false, text);
        } else {
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            editor.setRangeText(text, start, end, 'end');
        }
        updateHighlights();
        syncHeight();
        showToast('Pasted!');
    }).catch(err => {
        console.error('Failed to read clipboard: ', err);
        showToast('Paste Failed (Check Permissions)');
    });
}

bindToolbarAction(btnCopy, copyAll);

bindToolbarAction(btnPaste, pastePlain);


// --- Navigation & Selection Logic ---
function toggleSelectionMode() {
    isSelectionMode = !isSelectionMode;
    if (isSelectionMode) {
        btnSelectMode.classList.add('select-mode-active');
        selectionAnchor = editor.selectionStart; // Set anchor to current position
    } else {
        btnSelectMode.classList.remove('select-mode-active');
        // Collapse selection to end
        const end = editor.selectionEnd;
        editor.setSelectionRange(end, end);
    }
}

    bindToolbarAction(btnSelectMode, toggleSelectionMode);

function moveCursor(direction) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    let newPos = isSelectionMode ? end : start;

    let currentFocus = isSelectionMode ? (editor.selectionDirection === 'backward' ? start : end) : start;

    if (direction === 'left') {
        newPos = Math.max(0, currentFocus - 1);
    } else if (direction === 'right') {
        newPos = Math.min(value.length, currentFocus + 1);
    } else if (direction === 'up') {
        const lastNewline = value.lastIndexOf('\n', currentFocus - 1);
        if (lastNewline === -1) {
            newPos = 0;
        } else {
            const prevLineStart = value.lastIndexOf('\n', lastNewline - 1) + 1;
            const currentColumn = currentFocus - (lastNewline + 1);
            newPos = Math.min(lastNewline, prevLineStart + currentColumn);
        }
    } else if (direction === 'down') {
        const nextNewline = value.indexOf('\n', currentFocus);
        if (nextNewline === -1) {
            newPos = value.length;
        } else {
            const currentLineStart = value.lastIndexOf('\n', currentFocus - 1) + 1;
            const currentColumn = currentFocus - currentLineStart;
            const nextLineEnd = value.indexOf('\n', nextNewline + 1);
            const actualNextLineEnd = nextLineEnd === -1 ? value.length : nextLineEnd;
            newPos = Math.min(actualNextLineEnd, nextNewline + 1 + currentColumn);
        }
    }

    if (isSelectionMode) {
        if (newPos < selectionAnchor) {
            editor.setSelectionRange(newPos, selectionAnchor, 'backward');
        } else {
            editor.setSelectionRange(selectionAnchor, newPos, 'forward');
        }
    } else {
        editor.setSelectionRange(newPos, newPos);
    }
}

bindToolbarAction(btnLeft, () => moveCursor('left'));
bindToolbarAction(btnRight, () => moveCursor('right'));
bindToolbarAction(btnUp, () => moveCursor('up'));
bindToolbarAction(btnDown, () => moveCursor('down'));


// --- State ---
// (Variables declared at top of script, removing duplicates here)

// ... (handleAction helper remains same) ...

// ... (updateHighlights, syncHeight remain same) ...

// ... (Undo/Redo, Markdown Insertion, Clipboard, Navigation remain same) ...

// --- Audio Logic (Web Audio API) ---
function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(type) {
    if (!isSoundEnabled) return;

    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Common connections
    // Some profiles use filter, some don't.

    if (currentSoundProfile === 'relax') {
        // --- RELAX PROFILE (OmmWriter-ish) ---
        const filter = audioCtx.createBiquadFilter();
        osc.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, t);

        if (type === 'enter') {
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.4, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            osc.start(t);
            osc.stop(t + 0.3);
        } else if (type === 'space') {
            osc.frequency.setValueAtTime(400, t);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.2);
        } else if (type === 'delete') {
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.linearRampToValueAtTime(100, t + 0.1);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.4, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
        } else {
            const basePitch = 600;
            const randomPitch = basePitch + (Math.random() * 100 - 50);
            osc.frequency.setValueAtTime(randomPitch, t);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
        }
        osc.connect(filter);
        filter.connect(gain);

    } else if (currentSoundProfile === 'cute') {
        // --- CUTE PROFILE (Original Sine) ---
        osc.type = 'sine';

        if (type === 'enter') {
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
        } else if (type === 'space') {
            osc.frequency.setValueAtTime(800, t);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
        } else if (type === 'delete') {
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.linearRampToValueAtTime(200, t + 0.1);
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
        } else {
            const pitch = 1000 + Math.random() * 200;
            osc.frequency.setValueAtTime(pitch, t);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
            osc.start(t);
            osc.stop(t + 0.08);
        }
        osc.connect(gain);

    } else if (currentSoundProfile === 'bubble') {
        // --- BUBBLE PROFILE (Puchi Puchi) ---
        osc.type = 'sine'; // Sine is best for "pop"

        if (type === 'enter') {
            // Big Pop
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
            gain.gain.setValueAtTime(0.6, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
        } else if (type === 'space') {
            // High Pop
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(600, t + 0.05);
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
            osc.start(t);
            osc.stop(t + 0.05);
        } else if (type === 'delete') {
            // Reverse Pop? Or just low click
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.linearRampToValueAtTime(50, t + 0.05);
            gain.gain.setValueAtTime(0.6, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
            osc.start(t);
            osc.stop(t + 0.05);
        } else {
            // Normal Puchi
            // Fast frequency sweep down
            const startFreq = 1000 + Math.random() * 400;
            osc.frequency.setValueAtTime(startFreq, t);
            osc.frequency.exponentialRampToValueAtTime(startFreq / 2, t + 0.03);

            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03); // Very short

            osc.start(t);
            osc.stop(t + 0.03);
        }
        osc.connect(gain);
    }

    gain.connect(audioCtx.destination);

    // Cleanup nodes after playback
    osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
    };
}

function updateSoundIconColor() {
    if (!isSoundEnabled) {
        btnSound.style.color = ''; // Reset
        return;
    }

    const isLight = document.body.classList.contains('light-mode');

    switch (currentSoundProfile) {
        case 'relax':
            btnSound.style.color = isLight ? '#007aff' : '#a8d5e2'; // Blue
            break;
        case 'cute':
            btnSound.style.color = isLight ? '#ff2d55' : '#ffb7b2'; // Pink
            break;
        case 'bubble':
            btnSound.style.color = isLight ? '#34c759' : '#e2f0cb'; // Green
            break;
    }
}

function toggleSound() {
    if (!isSoundEnabled) {
        // Turn On
        isSoundEnabled = true;
        initAudio();
        btnSound.classList.add('active');
        iconSoundOn.style.display = 'block';
        iconSoundOff.style.display = 'none';
        updateSoundIconColor();
        showToast(`Sound: ${currentSoundProfile.charAt(0).toUpperCase() + currentSoundProfile.slice(1)}`);
        playSound('click');
    } else {
        // Cycle Profiles
        const currentIndex = soundProfiles.indexOf(currentSoundProfile);
        const nextIndex = currentIndex + 1;

        if (nextIndex < soundProfiles.length) {
            currentSoundProfile = soundProfiles[nextIndex];
            updateSoundIconColor();
            showToast(`Sound: ${currentSoundProfile.charAt(0).toUpperCase() + currentSoundProfile.slice(1)}`);
            playSound('click');
        } else {
            // Turn Off
            isSoundEnabled = false;
            btnSound.classList.remove('active');
            btnSound.style.color = ''; // Reset
            iconSoundOn.style.display = 'none';
            iconSoundOff.style.display = 'block';
            showToast('Sound: Off');
            currentSoundProfile = soundProfiles[0];
        }
    }
    saveSettings();
}

const handleSoundButton = (e) => { e.preventDefault(); toggleSound(); };
btnSound.addEventListener('click', handleSoundButton);

// --- BGM Logic ---
let bgmAudio = null;
let isBgmEnabled = false;
const btnBgm = document.getElementById('btn-bgm');
const iconBgmOn = document.getElementById('icon-bgm-on');
const iconBgmOff = document.getElementById('icon-bgm-off');

function initBgm() {
    if (bgmAudio) return; // Already initialized
    
    bgmAudio = new Audio('../assets/rain_full.ogg');
    bgmAudio.loop = true;
    bgmAudio.volume = 0.3; // 30% volume
    
    // Handle audio errors
    bgmAudio.addEventListener('error', (e) => {
        console.error('BGM audio error:', e);
        showToast('BGM読み込みエラー');
    });
    
    // Handle audio ended (shouldn't happen with loop, but just in case)
    bgmAudio.addEventListener('ended', () => {
        if (isBgmEnabled) {
            bgmAudio.play().catch(err => console.error('BGM play error:', err));
        }
    });
}

function startBGM() {
    if (!bgmAudio) initBgm();
    
    if (bgmAudio) {
        bgmAudio.play().catch(err => {
            console.error('BGM play error:', err);
            showToast('BGM再生エラー');
        });
        isBgmEnabled = true;
        updateBgmUI();
    }
}

function stopBGM() {
    if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio.currentTime = 0; // Reset to beginning
        isBgmEnabled = false;
        updateBgmUI();
    }
}

function toggleBGM() {
    if (!isBgmEnabled) {
        startBGM();
        showToast('BGM: ON');
    } else {
        stopBGM();
        showToast('BGM: OFF');
    }
    playSound('click');
    saveSettings();
}

function updateBgmUI() {
    if (!btnBgm || !iconBgmOn || !iconBgmOff) return;
    
    if (isBgmEnabled) {
        btnBgm.classList.add('active');
        iconBgmOn.style.display = 'block';
        iconBgmOff.style.display = 'none';
    } else {
        btnBgm.classList.remove('active');
        iconBgmOn.style.display = 'none';
        iconBgmOff.style.display = 'block';
    }
}

// Initialize BGM button event listener
if (btnBgm) {
    btnBgm.addEventListener('click', (e) => {
        e.preventDefault();
        toggleBGM();
        editor.focus();
    });
}

// --- Background Image Toggle Logic ---
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

const handleBgImageButton = (e) => {
    e.preventDefault();
    toggleBackgroundImage();
    editor.focus();
};

if (btnBgImage) {
    btnBgImage.addEventListener('click', handleBgImageButton);
}

// --- Fullscreen Logic ---
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

const handleFullscreenButton = (e) => {
    e.preventDefault();
    toggleFullscreen();
        editor.focus();
};
btnFullscreen.addEventListener('click', handleFullscreenButton);
// attachTouchAction removed

// --- Theme Logic ---
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');

        if (isLight) {
            iconThemeSun.style.display = 'none';
            iconThemeMoon.style.display = 'block';
        } else {
            iconThemeSun.style.display = 'block';
            iconThemeMoon.style.display = 'none';
    }
    updateSoundIconColor(); // Update sound icon color for new theme
    playSound('click');
    saveSettings();
}

const handleThemeButton = (e) => {
    e.preventDefault();
    toggleTheme();
        editor.focus();
};
btnTheme.addEventListener('click', handleThemeButton);
// attachTouchAction removed


// --- Typing Event & List Continuation ---

let saveTimeout;

// Handle IME input for sound AND Auto-save
editor.addEventListener('input', (e) => {
    // Auto-save (Debounced)
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveCurrentNote, 500);

    // Update UI
    updateHighlights();
    syncHeight();

    // Sound for IME
    if (e.inputType === 'insertCompositionText' || e.isComposing) {
        playSound('click');
    }
});

editor.addEventListener('keydown', (e) => {
    // CRITICAL: Check for IME composition
    if (e.isComposing || e.keyCode === 229) {
        return; // Do nothing if IME is active
    }

    // List Continuation Logic
    if (e.key === 'Enter') {
        const start = editor.selectionStart;
        const value = editor.value;

        // Find current line
        const lastNewline = value.lastIndexOf('\n', start - 1);
        const currentLineStart = lastNewline + 1;
        const currentLine = value.substring(currentLineStart, start);

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

        // Check for list pattern
        const listMatch = currentLine.match(/^(\s*)([-*]|\d+\.)\s/);

        if (listMatch) {
            e.preventDefault(); // Stop default enter

            let prefix = listMatch[0];

            // If line is just the prefix (empty list item), remove it and new line
            if (currentLine.trim() === listMatch[0].trim()) {
                // Remove the prefix from current line
                editor.setRangeText('\n', currentLineStart, start, 'end');
                playSound('enter');
                updateHighlights();
                syncHeight();
                return;
            }

            // Auto-increment ordered list
            if (listMatch[2].match(/\d+\./)) {
                const num = parseInt(listMatch[2]);
                prefix = prefix.replace(/\d+/, num + 1);
            }

            // Insert newline + prefix
            const insertion = '\n' + prefix;
            if (document.queryCommandSupported('insertText')) {
                document.execCommand('insertText', false, insertion);
            } else {
                editor.setRangeText(insertion, start, start, 'end');
            }
            playSound('enter');
            updateHighlights();
            syncHeight();
            return;
        }
    }

    if (e.key === 'Enter') {
        playSound('enter');
    } else if (e.key === ' ') {
        playSound('space');
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        playSound('delete');
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Normal keys (English input)
        playSound('click');
    }
});

// --- Firebase Authentication ---
function initAuth() {
    // Firebaseが利用可能かチェック
    if (typeof firebase === 'undefined' || !window.firebaseAuth) {
        console.warn('Firebase Auth not available');
        return;
    }
    
    try {
        // 認証状態の変更を監視
        window.firebaseAuth.onAuthStateChanged(async (user) => {
            try {
                if (user) {
                    // ログイン済み
                    updateAuthUI(user);
                    
                    // 同期状態のリスナーを設定
                    if (window.syncManager) {
                        window.syncManager.onSyncStatusChange(updateSyncStatusUI);
                        
                        // Firestoreリスナーを設定
                        window.syncManager.setupFirestoreListener();
                        
                        // 初回同期
                        await window.syncManager.syncFromFirestore();
                    }
                } else {
                    // ログアウト済み
                    updateAuthUI(null);
                    
                    // 同期を停止
                    if (window.syncManager) {
                        window.syncManager.stopSync();
                    }
                }
            } catch (error) {
                console.error('Auth state change error:', error);
            }
        });
        
        // ログインボタンのイベントリスナー
        const btnLoginGoogle = document.getElementById('btn-login-google');
        if (btnLoginGoogle) {
            btnLoginGoogle.addEventListener('click', handleGoogleLogin);
        }
        
        // ログアウトボタンのイベントリスナー
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', handleLogout);
        }
    } catch (error) {
        console.error('Auth initialization error:', error);
    }
}

async function handleGoogleLogin() {
    // Firebaseが利用可能かチェック
    if (typeof firebase === 'undefined' || !window.firebaseAuth) {
        showToast('Firebaseが設定されていません');
        return;
    }
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        showToast('ログイン中...');
        await window.firebaseAuth.signInWithPopup(provider);
        showToast('ログインしました');
        playSound('click');
    } catch (error) {
        console.error('Login error:', error);
        showToast('ログインに失敗しました: ' + error.message);
    }
}

async function handleLogout() {
    if (!window.firebaseAuth) return;
    
    try {
        // 同期を停止
        if (window.syncManager) {
            window.syncManager.stopSync();
        }
        
        await window.firebaseAuth.signOut();
        showToast('ログアウトしました');
        playSound('click');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('ログアウトに失敗しました');
    }
}

function updateAuthUI(user) {
    const authStatus = document.getElementById('auth-status');
    const authLogin = document.getElementById('auth-login');
    
    if (!authStatus || !authLogin) return;
    
    try {
        if (user) {
            // ログイン済みUIを表示
            authLogin.style.display = 'none';
            authStatus.style.display = 'block';
            
            // ユーザー情報を表示
            const userName = document.getElementById('user-name');
            const userEmail = document.getElementById('user-email');
            const userAvatar = document.getElementById('user-avatar');
            
            if (userName) userName.textContent = user.displayName || 'ユーザー';
            if (userEmail) userEmail.textContent = user.email || '';
            if (userAvatar) {
                if (user.photoURL) {
                    userAvatar.style.backgroundImage = `url(${user.photoURL})`;
                    userAvatar.style.backgroundSize = 'cover';
                    userAvatar.textContent = '';
                } else {
                    userAvatar.style.backgroundImage = '';
                    userAvatar.textContent = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
                }
            }
        } else {
            // ログインUIを表示
            authStatus.style.display = 'none';
            authLogin.style.display = 'block';
        }
    } catch (error) {
        console.error('Update auth UI error:', error);
    }
}

function updateSyncStatusUI(status, message, progress = null) {
    const syncIndicator = document.getElementById('sync-indicator');
    const syncText = document.getElementById('sync-text');
    
    if (!syncIndicator || !syncText) return;
    
    try {
        if (status === 'synced') {
            lastSyncedAt = Date.now();
        }

        const formatTime = (ts) => {
            if (!ts) return '';
            const d = new Date(ts);
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            const yyyy = d.getFullYear();
            const mon = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}/${mon}/${dd} ${hh}:${mm}`;
        };

        const hasProgress = progress !== null && progress !== undefined;
        const progressText = hasProgress ? ` (${progress}%)` : '';
        const timeText = status === 'synced' && lastSyncedAt ? ` | 最終同期 ${formatTime(lastSyncedAt)}` : '';
        const displayMessage = message ? `${message}${progressText}${timeText}` : (hasProgress ? `${progress}%${timeText}` : timeText || '');
        syncText.textContent = displayMessage;
        
        // ステータスに応じてインジケーターの色を変更
        switch (status) {
            case 'syncing':
                syncIndicator.style.color = '#4a90e2'; // Blue
                syncIndicator.textContent = '●';
                break;
            case 'synced':
                syncIndicator.style.color = '#34c759'; // Green
                syncIndicator.textContent = '●';
                break;
            case 'error':
                syncIndicator.style.color = '#ff3b30'; // Red
                syncIndicator.textContent = '●';
                break;
            case 'disconnected':
                syncIndicator.style.color = '#888'; // Gray
                syncIndicator.textContent = '○';
                break;
            default:
                syncIndicator.style.color = '#888';
                syncIndicator.textContent = '○';
        }
    } catch (error) {
        console.error('Update sync status UI error:', error);
    }
}
