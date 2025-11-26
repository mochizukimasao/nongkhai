// Initialize editor elements with error checking
// 注意: これらの変数はDOMContentLoadedイベントの後に使用される必要がある
let editor, highlightLayer, scrollArea, toast;
let btnFloatingMenu, btnSidebarNew, btnNew, btnStar;
let btnUndo, btnRedo, btnH1, btnBold, btnQuote, btnList, btnOrderedList;
let btnCopy, btnPaste, btnSelectMode;
let btnUp, btnDown, btnLeft, btnRight;
let btnTheme, iconThemeSun, iconThemeMoon, btnFont;
let btnSound, iconSoundOn, iconSoundOff, btnFullscreen;
let btnBgm, iconBgmOn, iconBgmOff;
let sidebar, sidebarOverlay, btnCloseSidebar, noteList, toolbar;

let baseListenersAttached = false;
let editorListenersAttached = false;
let uiListenersAttached = false;

// DOMContentLoadedイベントで要素を取得
function initElements() {
    editor = document.getElementById('editor');
    highlightLayer = document.getElementById('highlight-layer');
    scrollArea = document.getElementById('editor-scroll-area');
    toast = document.getElementById('toast');

    // Check if elements are available
    if (!editor) console.error('Editor element not found');
    if (!highlightLayer) console.error('Highlight layer element not found');
    if (!scrollArea) console.error('Scroll area element not found');
    if (!toast) console.warn('Toast element not found');

// --- Toolbar Buttons ---
    btnFloatingMenu = document.getElementById('btn-floating-menu');
    btnSidebarNew = document.getElementById('btn-sidebar-new');
    btnNew = document.getElementById('btn-new');
    btnStar = document.getElementById('btn-star');
    btnUndo = document.getElementById('btn-undo');
    btnRedo = document.getElementById('btn-redo');
    btnH1 = document.getElementById('btn-h1');
    btnBold = document.getElementById('btn-bold');
    btnQuote = document.getElementById('btn-quote');
    btnList = document.getElementById('btn-list');
    btnOrderedList = document.getElementById('btn-ordered-list');
    btnCopy = document.getElementById('btn-copy');
    btnPaste = document.getElementById('btn-paste');
    btnSelectMode = document.getElementById('btn-select-mode');
    btnUp = document.getElementById('btn-up');
    btnDown = document.getElementById('btn-down');
    btnLeft = document.getElementById('btn-left');
    btnRight = document.getElementById('btn-right');
    btnTheme = document.getElementById('btn-theme');
    iconThemeSun = document.getElementById('icon-theme-sun');
    iconThemeMoon = document.getElementById('icon-theme-moon');
    btnFont = document.getElementById('btn-font');
    btnSound = document.getElementById('btn-sound');
    iconSoundOn = document.getElementById('icon-sound-on');
    iconSoundOff = document.getElementById('icon-sound-off');
    btnBgm = document.getElementById('btn-bgm');
    iconBgmOn = document.getElementById('icon-bgm-on');
    iconBgmOff = document.getElementById('icon-bgm-off');
    btnFullscreen = document.getElementById('btn-fullscreen');

// --- Sidebar Elements ---
    sidebar = document.getElementById('sidebar');
    sidebarOverlay = document.getElementById('sidebar-overlay');
    btnCloseSidebar = document.getElementById('btn-close-sidebar');
    noteList = document.getElementById('note-list');

// --- Toolbar Element ---
    toolbar = document.getElementById('toolbar');
}

// --- Auto-hide Scrollbar Logic ---
let scrollTimeout;

function attachBaseListeners() {
    if (baseListenersAttached) {
        return;
    }
    if (!scrollArea) {
        console.warn('attachBaseListeners: scrollArea not ready, retrying...');
        setTimeout(attachBaseListeners, 100);
        return;
    }
    
    scrollArea.addEventListener('scroll', () => {
        scrollArea.classList.add('scrolling');

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            scrollArea.classList.remove('scrolling');
        }, 500); // Hide after 0.5 second of inactivity
    });
    
    scrollArea.addEventListener('scroll', syncPosition);
    baseListenersAttached = true;
}

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
    syncHighlightTypography();
    syncHeight();
    updateHighlights();
    saveSettings();
}

const handleFontButton = (e) => {
    e.preventDefault();
    toggleFont();
    if (editor) {
        editor.focus();
    }
};
// attachTouchAction removed - relying on native click


// --- State ---
let isSoundEnabled = false;
let currentSoundProfile = 'relax'; // 'cute', 'relax', 'bubble'
const soundProfiles = ['cute', 'relax', 'bubble'];
let isSelectionMode = false;
let selectionAnchor = 0;
let audioCtx = null;

// Kill ring for Emacs-style Ctrl+K / Ctrl+Y
let killRing = '';

// Track last editor content to detect actual text changes
let lastEditorContent = '';

// BGM state
let bgmEnabled = false;
let bgmNode = null;
let bgmGainNode = null;
let bgmAudioBuffers = {}; // Store all BGM audio buffers
let currentBgmType = 'forest'; // 'forest', 'rain', 'wind', null (stopped)
const bgmTypes = ['forest', 'rain', 'wind', null]; // null means stopped
let currentBgmSource = null; // Current playing audio source

// --- Touch/Scroll Detection for Toolbar ---
// Global scroll detection removed to improve responsiveness.
// We now rely on per-button touch handling in attachTouchAction.

// --- DB State ---
let db;
window.db = null; // グローバルスコープでsync.jsからアクセス可能にする
let currentNoteId = null;
let showTrash = false; // Toggle state for sidebar
let showFavorites = false; // Toggle state for favorites filter

// --- Initialize DB ---
async function initDB() {
    db = new Dexie("SimpleEditorDB");
    window.db = db; // グローバルスコープに設定
    db.version(3).stores({
        notes: '++id, text, created, updated, favorite, deleted, firestoreId, syncedAt' // Added firestoreId and syncedAt for sync
    }).upgrade(tx => {
        if (tx.version === 2) {
            // Upgrade from version 2: add firestoreId and syncedAt fields
            return tx.notes.toCollection().modify(note => {
                if (!note.hasOwnProperty('firestoreId')) {
                    note.firestoreId = null;
                }
                if (!note.hasOwnProperty('syncedAt')) {
                    note.syncedAt = null;
                }
            });
        } else if (tx.version === 1) {
            // Upgrade from version 1: add deleted, firestoreId, and syncedAt fields
            return tx.notes.toCollection().modify(note => {
                if (!note.hasOwnProperty('deleted')) {
                    note.deleted = null;
                }
                if (!note.hasOwnProperty('firestoreId')) {
                    note.firestoreId = null;
                }
                if (!note.hasOwnProperty('syncedAt')) {
                    note.syncedAt = null;
                }
            });
        }
    });

    // Cleanup old trash
    await cleanupTrash();

    // Load last edited note (only if not deleted)
    const lastNote = await db.notes
        .filter(n => !n.deleted) // Robust check for null/undefined
        .reverse()
        .sortBy('updated');

    if (lastNote.length > 0) {
        // Load the last edited note, regardless of whether it's empty
        loadNote(lastNote[0].id);
    } else {
        // Only create a new note if no notes exist
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

// --- Note Logic ---
async function createNote() {
    const id = await db.notes.add({
        text: '',
        created: Date.now(),
        updated: Date.now(),
        favorite: 0,
        deleted: null,
        firestoreId: null,
        syncedAt: null
    });
    await loadNote(id);
    showToast('New Note Created');
    playSound('click');
    if (sidebar && sidebar.classList.contains('open')) toggleSidebar();
    
    // Firestoreに同期（非同期で実行、エラーは無視）
    try {
        if (window.syncManager && window.syncManager.isAuthenticated()) {
            const note = await db.notes.get(id);
            if (note) {
                window.syncManager.syncNoteToFirestore(id, note).catch(err => {
                    console.warn('Sync failed (will retry later):', err);
                });
            }
        }
    } catch (error) {
        console.warn('Sync error:', error);
    }
}

async function loadNote(id) {
    const note = await db.notes.get(id);
    if (note) {
        currentNoteId = id;
        
        // Add fade-in animation
        const editorContainer = document.getElementById('editor-container');
        if (editorContainer) {
            editorContainer.classList.add('fade-in');
            // Remove animation class after animation completes
            setTimeout(() => {
                editorContainer.classList.remove('fade-in');
            }, 400);
        }
        
        if (editor) {
            editor.value = note.text;
            // Update last content tracker
            lastEditorContent = note.text;
            // If viewing a deleted note, maybe show a warning or disable editing?
            // For now, allow viewing.
            if (highlightLayer) {
                updateHighlights();
            }
            syncHeight();
        }
        updateStarState(note.favorite);
        if (scrollArea) {
            scrollArea.scrollTop = 0;
        }
    }
}

async function saveCurrentNote() {
    if (currentNoteId === null) return;

    const text = editor.value;
    try {
        await db.notes.update(currentNoteId, {
            text: text,
            updated: Date.now()
        });
        updateNoteList();
        
        // Firestoreに同期（非同期で実行、エラーは無視）
        try {
            if (window.syncManager && window.syncManager.isAuthenticated()) {
                const note = await db.notes.get(currentNoteId);
                if (note) {
                    window.syncManager.syncNoteToFirestore(currentNoteId, note).catch(err => {
                        console.warn('Sync failed (will retry later):', err);
                    });
                }
            }
        } catch (error) {
            console.warn('Sync error:', error);
        }
    } catch (e) {
        console.error("Save failed", e);
        showToast("Save Failed!");
    }
}

async function toggleFavorite() {
    if (currentNoteId === null) return;
    await toggleNoteFavorite(currentNoteId);
}

async function toggleNoteFavorite(noteId) {
    if (!noteId) return;
    const note = await db.notes.get(noteId);
    if (!note) return;
    
    const newFav = note.favorite ? 0 : 1;
    await db.notes.update(noteId, { favorite: newFav, updated: Date.now() });
    
    // 現在のメモの場合、ツールバーの星ボタンも更新
    if (noteId === currentNoteId) {
        updateStarState(newFav);
    }
    
    updateNoteList();
    showToast(newFav ? 'Added to Favorites' : 'Removed from Favorites');
    playSound('click');
    
    // Firestoreに同期（非同期で実行、エラーは無視）
    try {
        if (window.syncManager && window.syncManager.isAuthenticated()) {
            const updatedNote = await db.notes.get(noteId);
            if (updatedNote) {
                window.syncManager.syncNoteToFirestore(noteId, updatedNote).catch(err => {
                    console.warn('Sync failed (will retry later):', err);
                });
            }
        }
    } catch (error) {
        console.warn('Sync error:', error);
    }
}

async function deleteNote(id, event) {
    if (event) event.stopPropagation();

    const note = await db.notes.get(id);
    if (!note) return;

    if (note.deleted === null) {
        // Move to Trash
        await db.notes.update(id, { deleted: Date.now() });
        showToast('Moved to Trash');
        
        // Firestoreに同期（非同期で実行、エラーは無視）
        try {
            if (window.syncManager && window.syncManager.isAuthenticated()) {
                const updatedNote = await db.notes.get(id);
                if (updatedNote) {
                    window.syncManager.syncNoteToFirestore(id, updatedNote).catch(err => {
                        console.warn('Sync failed (will retry later):', err);
                    });
                }
            }
        } catch (error) {
            console.warn('Sync error:', error);
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
            // Firestoreからも削除
            try {
                if (window.syncManager && window.syncManager.isAuthenticated() && note.firestoreId) {
                    window.syncManager.deleteNoteFromFirestore(note.firestoreId).catch(err => {
                        console.warn('Firestore delete failed:', err);
                    });
                }
            } catch (error) {
                console.warn('Sync error:', error);
            }
            
            await db.notes.delete(id);
            showToast('Deleted Permanently');
            if (currentNoteId === id) {
                editor.value = '';
                currentNoteId = null;
            }
        }
    }
    updateNoteList();
    playSound('delete');
}

async function restoreNote(id, event) {
    if (event) event.stopPropagation();
    await db.notes.update(id, { deleted: null, updated: Date.now() });
    showToast('Restored from Trash');
    updateNoteList();
    playSound('click');
    
    // Firestoreに同期（非同期で実行、エラーは無視）
    try {
        if (window.syncManager && window.syncManager.isAuthenticated()) {
            const note = await db.notes.get(id);
            if (note) {
                window.syncManager.syncNoteToFirestore(id, note).catch(err => {
                    console.warn('Sync failed (will retry later):', err);
                });
            }
        }
    } catch (error) {
        console.warn('Sync error:', error);
    }
}

function updateStarState(isFav) {
    if (!btnStar) return;
    
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
    if (!sidebar) return;
    
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
    if (!sidebar || !sidebarOverlay) return;
    
    const isOpening = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('visible');

    // Hide/show floating menu button when sidebar opens/closes
    if (sidebar.classList.contains('open')) {
        document.body.classList.add('sidebar-open');
        // Force hide button with multiple methods
        if (btnFloatingMenu) {
            btnFloatingMenu.style.display = 'none';
            btnFloatingMenu.style.visibility = 'hidden';
            btnFloatingMenu.style.opacity = '0';
            btnFloatingMenu.style.pointerEvents = 'none';
        }
        updateNoteList();
    } else {
        document.body.classList.remove('sidebar-open');
        // Restore button visibility - always restore, CSS will handle mobile/desktop display
        if (btnFloatingMenu) {
            btnFloatingMenu.style.display = '';
            btnFloatingMenu.style.visibility = '';
            btnFloatingMenu.style.opacity = '';
            btnFloatingMenu.style.pointerEvents = '';
        }
    }
    playSound('click');
}

function toggleFavoritesView() {
    showFavorites = !showFavorites;
    const btn = document.getElementById('btn-toggle-favorites');
    if (btn) {
        btn.classList.toggle('active', showFavorites);
    }
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
    if (btn) {
        btn.classList.toggle('active', showTrash);
    }
    // Disable favorites view when showing trash
    if (showTrash) {
        showFavorites = false;
        const favBtn = document.getElementById('btn-toggle-favorites');
        if (favBtn) favBtn.classList.remove('active');
    }
    updateNoteList();
}

async function updateNoteList() {
    if (!noteList || !db) return;
    
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

        const title = note.text.split('\n')[0].trim() || 'Untitled';
        const date = new Date(showTrash ? note.deleted : note.updated).toLocaleString();

        // Action Buttons
        let actionBtns = '';
        const favClass = note.favorite ? 'favorite-active' : '';
        const showFavoriteToggle = !showTrash;
        if (showTrash) {
            // Restore & Delete
            actionBtns = `
            <button class="note-action-btn restore" title="Restore">↩</button>
            <button class="note-action-btn delete" title="Delete Permanently">×</button>
        `;
        } else {
            // Favorite & Delete
            actionBtns = `
            <button class="note-action-btn favorite ${favClass}" title="${note.favorite ? 'Remove from Favorites' : 'Add to Favorites'}" data-note-id="${note.id}">★</button>
            <button class="note-action-btn delete" title="Move to Trash">×</button>
        `;
        }
        const favoriteIndicator = (!showFavoriteToggle && note.favorite)
            ? '<span class="note-fav-icon">★</span>'
            : '';

        li.innerHTML = `
        <div style="flex:1; overflow:hidden;">
            <div class="note-title">${title}</div>
            <div class="note-meta">
                <span>${date}</span>
                ${favoriteIndicator}
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
                const noteId = parseInt(btnFavorite.getAttribute('data-note-id'));
                if (noteId) {
                    await toggleNoteFavorite(noteId);
                }
            });
        }

        const btnDelete = li.querySelector('.delete');
        if (btnDelete) btnDelete.addEventListener('click', (e) => deleteNote(note.id, e));

        const btnRestore = li.querySelector('.restore');
        if (btnRestore) btnRestore.addEventListener('click', (e) => restoreNote(note.id, e));

        noteList.appendChild(li);
    });
}

// --- Event Listeners for New Features ---



// Favorites Toggle
const btnToggleFavorites = document.getElementById('btn-toggle-favorites');
if (btnToggleFavorites) {
    btnToggleFavorites.addEventListener('click', (e) => {
        e.preventDefault();
        toggleFavoritesView();
    });
} else {
    console.warn('btn-toggle-favorites not found; favorites toggle disabled');
}

// Trash Toggle
const btnToggleTrash = document.getElementById('btn-toggle-trash');
if (btnToggleTrash) {
    btnToggleTrash.addEventListener('click', (e) => {
        e.preventDefault();
        toggleTrashView();
    });
} else {
    console.warn('btn-toggle-trash not found; trash toggle disabled');
}

// --- Settings Persistence ---
function saveSettings() {
    const settings = {
        theme: document.body.classList.contains('light-mode') ? 'light' : 'dark',
        font: document.body.classList.contains('font-gothic') ? 'gothic' : 'serif',
        soundEnabled: isSoundEnabled,
        soundProfile: currentSoundProfile
    };
    localStorage.setItem('editorSettings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('editorSettings');
    let settings = null;
    
    if (saved) {
        settings = JSON.parse(saved);
    } else {
        // 初回起動時はライトモードをデフォルトにする
        settings = {
            theme: 'light',
            font: 'serif',
            soundEnabled: false,
            soundProfile: 'relax'
        };
        localStorage.setItem('editorSettings', JSON.stringify(settings));
    }

    // Theme
    if (iconThemeSun && iconThemeMoon) {
        if (settings.theme === 'light') {
            document.body.classList.add('light-mode');
            iconThemeSun.style.display = 'none';
            iconThemeMoon.style.display = 'block';
        } else {
            document.body.classList.remove('light-mode');
            iconThemeSun.style.display = 'block';
            iconThemeMoon.style.display = 'none';
        }
    }

    // Font
    if (btnFont) {
        const span = btnFont.querySelector('span');
        if (span) {
            if (settings.font === 'gothic') {
                document.body.classList.add('font-gothic');
                span.style.fontFamily = 'sans-serif';
            } else {
                document.body.classList.remove('font-gothic');
                span.style.fontFamily = 'serif';
            }
        }
    }

    // Sound
    if (btnSound && iconSoundOn && iconSoundOff) {
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
    }
}

// --- Helper: Prevent Default & Play Sound ---
function handleAction(e, action) {
    // Removed global scroll check.
    // Rely on attachTouchAction to filter out scroll gestures on buttons.

    e.preventDefault(); // Keep focus
    action();
    playSound('click');
    if (editor) {
        editor.focus(); // Ensure focus
    }
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
            e.stopPropagation();
            try {
        action();
                if (typeof playSound === 'function') {
        playSound('click');
                }
                if (editor) {
        editor.focus();
                }
            } catch (error) {
                console.error('Error in toolbar action:', error, button);
            }
        });
        
        // タッチデバイス用にtouchendも追加
        button.addEventListener('touchend', (e) => {
            // スクロールと区別するため、短いタッチのみ処理
            e.preventDefault();
            e.stopPropagation();
            try {
                action();
                if (typeof playSound === 'function') {
                    playSound('click');
                }
                if (editor) {
                    editor.focus();
                }
            } catch (error) {
                console.error('Error in toolbar action (touch):', error, button);
            }
        }, { passive: false });
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
        
        // Early return for empty or invalid text
        if (text === null || text === undefined) {
            if (highlightLayer) {
                highlightLayer.innerHTML = '';
            }
            return;
        }

        // Normalize line endings FIRST - before any other processing
        // This is critical for regex patterns that use ^ and $ anchors
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Escape HTML to prevent XSS and rendering issues
        text = text.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Apply Markdown Styling
        // Bold: **text** -> <span class="md-mark">**</span><span class="md-bold">text</span><span class="md-mark">**</span>
        // Color the ** markers and underline the text inside.
        text = text.replace(/\*\*(.*?)\*\*/g, '<span class="md-mark">**</span><span class="md-bold">$1</span><span class="md-mark">**</span>');

        // Heading: # text (at start of line)
        // Support # through ###### - color the # symbols
        text = text.replace(/^(#{1,6})\s+(.*)$/gm, (match, hashes, content) => {
            return `<span class="md-mark">${hashes}</span> <span class="md-heading">${content}</span>`;
        });

        // Bullet list: - at start of line -> colored bullet
        text = text.replace(/^(\s*)(- )/gm, '$1<span class="md-bullet">- </span>');
        
        // Numbered list: 1. 2. etc. at start of line -> colored number
        text = text.replace(/^(\s*)(\d+\. )/gm, '$1<span class="md-bullet">$2</span>');
        
        // Asterisk bullet: * at start of line -> colored bullet
        text = text.replace(/^(\s*)(\* )/gm, '$1<span class="md-bullet">* </span>');
        
        // Quote: > at start of line -> colored quote marker
        text = text.replace(/^(\s*)(&gt; )/gm, '$1<span class="md-bullet">&gt; </span>');

    // Convert tabs to spaces to keep alignment consistent
    text = text.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

    // Convert newlines to <br> so the display layer matches the textarea's line breaks exactly.
    // This avoids accumulating vertical drift because each newline becomes one DOM line break.
    text = text.replace(/\n/g, '<br>');

        highlightLayer.innerHTML = text;
    } catch (error) {
        console.error('Error in updateHighlights:', error);
        // Fallback: set empty content to prevent display issues
        if (highlightLayer) {
            try {
                highlightLayer.innerHTML = '';
            } catch (e) {
                console.error('Error clearing highlightLayer:', e);
            }
        }
    }
}

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

function syncHighlightTypography() {
    if (!editor || !highlightLayer) {
        return;
    }
    try {
        const computed = window.getComputedStyle(editor);
        const props = [
            'fontFamily',
            'fontSize',
            'fontWeight',
            'fontStyle',
            'fontVariant',
            'lineHeight',
            'letterSpacing',
            'wordSpacing',
            'textTransform',
            'textIndent',
            'textAlign',
            'tabSize',
            'MozTabSize'
        ];
        props.forEach(prop => {
            if (computed[prop]) {
                highlightLayer.style[prop] = computed[prop];
            }
        });
    } catch (error) {
        console.error('Error syncing highlight typography:', error);
    }
}

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

// Sync position on scroll and resize
function syncPosition() {
    if (!editor || !highlightLayer || !scrollArea) return;
    
    try {
        // #editorと#highlight-layerは同じパディングを持っているので、
        // position: absoluteでtop: 0; left: 0;に設定すれば同じ位置になる
        // 幅も同じにする
        highlightLayer.style.width = editor.offsetWidth + 'px';
    } catch (error) {
        console.error('Error in syncPosition:', error);
    }
}

// Actually, standard textarea scrolls internally.
// If we want overlay, we usually make the container scroll, and textarea + div grow.
// Let's try the "Textarea grows, Container scrolls" approach.

function handleEditorContentSync(e) {
    if (!editor) return;
    
    const currentContent = editor.value;
    
    // Only update highlights if text content actually changed
    // This prevents unnecessary updates when only selection changes
    if (currentContent !== lastEditorContent) {
        lastEditorContent = currentContent;
        updateHighlights();
    }
    
    syncHeight();
    syncPosition();
}
window.addEventListener('resize', () => {
    handleResize();
    syncHeight();
    syncPosition();
});

// Initial call for editor setup
// Note: This is separate from main DOMContentLoaded to ensure editor elements are ready
function initEditor() {
    if (!editor || !highlightLayer || !scrollArea) {
        console.warn('Editor elements not ready, retrying...');
        setTimeout(initEditor, 100);
        return;
    }
    
    // レイアウトが完了するまで待つ
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // 2回のrequestAnimationFrameで確実にレイアウトが完了する
        updateHighlights();
        syncHeight();
            syncPosition();
        editor.focus();
    });
    });
}

// 要素の初期化とエディタの初期化を順番に実行
async function initAll() {
    initElements();
    attachBaseListeners();
    bindUIControls();
    loadSettings();
    
    // エディタリスナーを先に設定（initDB内でloadNoteが呼ばれる前に）
    attachEditorListeners();
    initEditor();
    bindToolbarActions();
    handleResize();
    
    // 認証を初期化（Firebaseが利用可能な場合のみ、エラーは無視）
    try {
        if (typeof initAuth === 'function') {
            initAuth();
        }
    } catch (error) {
        console.warn('Auth initialization failed:', error);
    }
    
    // DB初期化は最後に（非同期なので、エディタが準備できてから）
    // initDB内でloadNote/createNoteが呼ばれるが、その時点でeditorとhighlightLayerは準備済み
    await initDB();
}

// --- Markdown Insertion ---
function insertMarkdown(type) {
    if (!editor) return;
    
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

    // bindToolbarAction の呼び出しは bindToolbarActions 関数内で実行

// --- Clipboard Operations ---
function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 2000);
}

function copyAll() {
    if (!editor) return;
    navigator.clipboard.writeText(editor.value).then(() => {
        showToast('Copied All!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showToast('Copy Failed');
    });
}

function pastePlain() {
    if (!editor) return;
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

// --- Navigation & Selection Logic ---
function toggleSelectionMode() {
    const btnSelectMode = document.getElementById('btn-select-mode');
    if (!btnSelectMode || !editor) return;
    
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

function bindUIControls() {
    if (uiListenersAttached) {
        return;
    }
    if (!btnFont || !btnFloatingMenu || !btnSidebarNew || !btnNew || !btnStar || !btnCloseSidebar || !sidebarOverlay || !btnSound || !btnBgm || !btnFullscreen || !btnTheme) {
        console.warn('bindUIControls: UI buttons not ready, retrying...');
        setTimeout(bindUIControls, 100);
        return;
    }

    btnFont.addEventListener('click', handleFontButton);

    btnFloatingMenu.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSidebar();
    });

    btnSidebarNew.addEventListener('click', (e) => {
        e.preventDefault();
        createNote();
    });

    btnNew.addEventListener('click', (e) => {
        e.preventDefault();
        createNote();
        if (editor) {
            editor.focus();
        }
    });

    btnStar.addEventListener('click', (e) => {
        e.preventDefault();
        toggleFavorite();
    });

    btnCloseSidebar.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSidebar();
    });
    sidebarOverlay.addEventListener('click', toggleSidebar);

    btnSound.addEventListener('click', handleSoundButton);
    btnBgm.addEventListener('click', handleBgmButton);
    btnFullscreen.addEventListener('click', handleFullscreenButton);
    btnTheme.addEventListener('click', handleThemeButton);

    uiListenersAttached = true;
}

function bindToolbarActions() {
    if (!btnUndo || !btnRedo || !btnH1 || !btnBold || !btnCopy || !btnPaste || !btnSelectMode || !btnLeft || !btnRight || !btnUp || !btnDown) {
        console.warn('Toolbar buttons not ready, retrying...');
        setTimeout(bindToolbarActions, 100);
        return;
    }
    
    // --- Undo/Redo ---
    bindToolbarAction(btnUndo, () => document.execCommand('undo'));
    bindToolbarAction(btnRedo, () => document.execCommand('redo'));

    // --- Markdown Insertion ---
    bindToolbarAction(btnH1, () => insertMarkdown('h1'));
    bindToolbarAction(btnBold, () => insertMarkdown('bold'));
    bindToolbarAction(btnQuote, () => insertMarkdown('quote'));
    bindToolbarAction(btnList, () => insertMarkdown('list'));
    bindToolbarAction(btnOrderedList, () => insertMarkdown('ordered-list'));

    // --- Clipboard Operations ---
    bindToolbarAction(btnCopy, copyAll);
    bindToolbarAction(btnPaste, pastePlain);

    // --- Navigation & Selection Logic ---
    bindToolbarAction(btnSelectMode, toggleSelectionMode);
    bindToolbarAction(btnLeft, () => moveCursor('left'));
    bindToolbarAction(btnRight, () => moveCursor('right'));
    bindToolbarAction(btnUp, () => moveCursor('up'));
    bindToolbarAction(btnDown, () => moveCursor('down'));
}

function moveCursor(direction) {
    if (!editor) return;
    
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
} else {
    initAll();
}

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
    if (!btnSound) return;
    
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
    if (!btnSound || !iconSoundOn || !iconSoundOff) return;
    
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

// --- BGM Logic ---

// Load BGM audio file
async function loadBgmAudio(type) {
    if (bgmAudioBuffers[type]) return bgmAudioBuffers[type];
    
    if (!audioCtx) initAudio();
    
    const fileMap = {
        'forest': 'assets/forest_short.wav',
        'rain': 'assets/rain_short_stereo.wav',
        'wind': 'assets/wind_short.wav'
    };
    
    const filename = fileMap[type];
    if (!filename) {
        console.error('Unknown BGM type:', type);
        return null;
    }
    
    try {
        // Load audio file
        console.log(`Loading BGM file: ${filename}`);
        const response = await fetch(filename);
        if (!response.ok) {
            console.error(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`);
            return null;
        }
        console.log(`Fetched ${filename}, size: ${response.headers.get('content-length')} bytes`);
        const arrayBuffer = await response.arrayBuffer();
        console.log(`Decoding audio data for ${type}...`);
        
        // AudioBufferにデコード
        bgmAudioBuffers[type] = await audioCtx.decodeAudioData(arrayBuffer);
        console.log(`Successfully loaded BGM: ${type}, duration: ${bgmAudioBuffers[type].duration}s, channels: ${bgmAudioBuffers[type].numberOfChannels}`);
        return bgmAudioBuffers[type];
    } catch (error) {
        console.error(`Error loading ${type} audio file (${filename}):`, error);
        console.error('Error details:', error.message, error.stack);
        return null;
    }
}

// createRainSound function removed - now handled directly in startBGM

// Create BGM sound from loaded audio buffer
function createBgmFromBuffer(buffer) {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    // ステレオパンニング（中央）
    const panner = audioCtx.createStereoPanner();
    panner.pan.value = 0;
    
    // 音量調整はbgmGainNodeで行うので、ここでは直接接続
    source.connect(panner);
    
    source.start(0);
    return { source, panner };
}

// Create procedurally generated rain sound with improved stereo
function createRainProcedural() {
    const bufferSize = 4096;
    
    try {
        // Create stereo ScriptProcessorNode
        const processor = audioCtx.createScriptProcessor(bufferSize, 0, 2);
        
        // Multiple layers for natural sound
        let phase1 = Math.random() * Math.PI * 2;
        let phase2 = Math.random() * Math.PI * 2;
        let phase3 = Math.random() * Math.PI * 2;
        let burstTimer = 0;
        
        processor.onaudioprocess = (e) => {
            const leftOutput = e.outputBuffer.getChannelData(0);
            const rightOutput = e.outputBuffer.getChannelData(1);
            
            for (let i = 0; i < bufferSize; i++) {
                // Layer 1: Basic white noise (slightly different for L/R)
                const noise1L = (Math.random() * 2 - 1) * 0.25;
                const noise1R = (Math.random() * 2 - 1) * 0.25;
                
                // Layer 2: Low-frequency modulation (rain drops)
                phase1 += 0.008 + Math.random() * 0.004;
                const mod1 = Math.sin(phase1) * 0.15;
                const noise2L = (Math.random() * 2 - 1) * 0.2 * (1 + mod1);
                const noise2R = (Math.random() * 2 - 1) * 0.2 * (1 + mod1 * 0.9);
                
                // Layer 3: High-frequency component (fine rain)
                phase2 += 0.03 + Math.random() * 0.02;
                const mod2 = Math.sin(phase2) * 0.08;
                const noise3L = (Math.random() * 2 - 1) * 0.15 * (1 + mod2);
                const noise3R = (Math.random() * 2 - 1) * 0.15 * (1 + mod2 * 1.1);
                
                // Layer 4: Random bursts (bigger drops)
                burstTimer += Math.random() * 0.5;
                let burst = 0;
                if (burstTimer > 50 + Math.random() * 100) {
                    burst = (Math.random() - 0.5) * 0.25;
                    burstTimer = 0;
                }
                
                // Combine layers with slight stereo difference
                leftOutput[i] = noise1L + noise2L + noise3L + burst;
                rightOutput[i] = noise1R + noise2R + noise3R + burst * 0.8;
            }
        };
        
        // Add subtle reverb using delay
        const delay = audioCtx.createDelay();
        delay.delayTime.value = 0.02;
        const delayGain = audioCtx.createGain();
        delayGain.gain.value = 0.15;
        
        // Stereo panner for spatial effect
        const pannerL = audioCtx.createStereoPanner();
        const pannerR = audioCtx.createStereoPanner();
        pannerL.pan.value = -0.2;
        pannerR.pan.value = 0.2;
        
        // Volume control
        const gain = audioCtx.createGain();
        gain.gain.value = 0.25;
        
        // Connect: processor -> delay -> panners -> gain
        processor.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(pannerR);
        
        // Merge channels
        const merger = audioCtx.createChannelMerger(2);
        processor.connect(pannerL);
        processor.connect(pannerR);
        pannerL.connect(merger, 0, 0);
        pannerR.connect(merger, 0, 1);
        delayGain.connect(merger, 0, 1);
        
        merger.connect(gain);
        
        return { processor, gain, merger };
        
    } catch (error) {
        console.warn('ScriptProcessorNode not available, using simple fallback');
        // Fallback: simple filtered noise
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc.frequency.value = 100;
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        filter.Q.value = 1;
        gain.gain.value = 0.1;
        
        osc.connect(filter);
        filter.connect(gain);
        return { source: osc, gain };
    }
}

async function startBGM(type = null) {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    // If type is provided, switch to that type
    if (type !== null && type !== undefined) {
        currentBgmType = type;
    }
    
    // If current type is null (stopped), don't start
    if (currentBgmType === null || currentBgmType === undefined) {
        console.warn('startBGM: currentBgmType is null, cannot start');
        return;
    }
    
    // Save current type before stopping (stopBGM sets it to null)
    const bgmTypeToStart = currentBgmType;
    
    // Stop current BGM if playing (but don't reset currentBgmType)
    if (bgmNode) {
        // Temporarily save the type
        const savedType = currentBgmType;
        stopBGM();
        // Restore the type after stopping
        currentBgmType = savedType;
    }
    
    // Try to load audio file
    console.log(`Starting BGM with type: ${bgmTypeToStart}`);
    const audioBuffer = await loadBgmAudio(bgmTypeToStart);
    
    // Use audio file if available, otherwise use procedural sound
    if (audioBuffer) {
        console.log(`Using audio buffer for BGM: ${currentBgmType}`);
        bgmGainNode = audioCtx.createGain();
        bgmGainNode.gain.value = 0.5; // Volume for background
        
        const bgmSound = createBgmFromBuffer(audioBuffer);
        bgmNode = bgmSound.source;
        currentBgmSource = bgmSound.source;
        bgmSound.panner.connect(bgmGainNode);
        bgmGainNode.connect(audioCtx.destination);
        bgmEnabled = true;
    } else {
        // Fallback to procedural sound
        console.warn(`Audio buffer not available for ${currentBgmType}, using procedural sound`);
        bgmGainNode = audioCtx.createGain();
        bgmGainNode.gain.value = 0.25;
        
        const rainSound = createRainProcedural();
        if (rainSound) {
            if (rainSound.processor) {
                bgmNode = rainSound.processor;
                rainSound.gain.connect(bgmGainNode);
            } else {
                bgmNode = rainSound;
                bgmNode.connect(bgmGainNode);
            }
            bgmGainNode.connect(audioCtx.destination);
            bgmEnabled = true;
        }
    }
    
    // Update UI
    if (bgmEnabled) {
        if (btnBgm) {
            btnBgm.classList.add('active');
        }
        if (iconBgmOn && iconBgmOff) {
            iconBgmOn.style.display = 'block';
            iconBgmOff.style.display = 'none';
        }
    }
}

function stopBGM() {
    // Stop current source if it exists (bgmNode and currentBgmSource may be the same)
    if (currentBgmSource && currentBgmSource !== bgmNode) {
        try {
            if (currentBgmSource.stop) {
                currentBgmSource.stop();
            }
            if (currentBgmSource.disconnect) {
                currentBgmSource.disconnect();
            }
        } catch (e) {
            console.warn('Error stopping BGM source:', e);
        }
        currentBgmSource = null;
    }
    
    if (bgmNode) {
        try {
            // Stop source if it's a BufferSource
            if (bgmNode.stop) {
                bgmNode.stop();
            }
            // Disconnect processor
            if (bgmNode.disconnect) {
                bgmNode.disconnect();
            }
            // Clear processor callback
            if (bgmNode.onaudioprocess) {
                bgmNode.onaudioprocess = null;
            }
        } catch (e) {
            console.warn('Error stopping BGM node:', e);
        }
        bgmNode = null;
        currentBgmSource = null; // Clear both since they may be the same
    }
    if (bgmGainNode) {
        try {
            bgmGainNode.disconnect();
        } catch (e) {
            console.warn('Error disconnecting BGM gain node:', e);
        }
        bgmGainNode = null;
    }
    
    bgmEnabled = false;
    // Set to null to mark as stopped
    currentBgmType = null;
    
    // Update UI
    if (btnBgm) {
        btnBgm.classList.remove('active');
    }
    if (iconBgmOn && iconBgmOff) {
        iconBgmOn.style.display = 'none';
        iconBgmOff.style.display = 'block';
    }
}

function toggleBGM() {
    console.log(`toggleBGM called: bgmEnabled=${bgmEnabled}, currentBgmType=${currentBgmType}`);
    
    if (bgmEnabled) {
        // Cycle to next BGM type (including stop)
        // Use current type or default to forest if somehow null
        const currentType = currentBgmType || 'forest';
        let currentIndex = bgmTypes.indexOf(currentType);
        
        // If current type not found in array, default to first
        if (currentIndex === -1) {
            currentIndex = 0;
        }
        
        const nextIndex = (currentIndex + 1) % bgmTypes.length;
        const nextType = bgmTypes[nextIndex];
        
        console.log(`Cycling: currentType=${currentType}, currentIndex=${currentIndex}, nextType=${nextType}`);
        
        if (nextType === null) {
            // Stop BGM
            stopBGM();
            showToast('BGM: Off');
        } else {
            // Show toast with BGM type name
            const typeNames = {
                'forest': 'Forest',
                'rain': 'Rain',
                'wind': 'Wind'
            };
            showToast(`BGM: ${typeNames[nextType]}`);
            
            // Switch to next BGM
            startBGM(nextType);
        }
    } else {
        // Start BGM with current type (or forest if stopped)
        if (currentBgmType === null || currentBgmType === undefined) {
            currentBgmType = 'forest';
        }
        
        // Show toast with BGM type name
        const typeNames = {
            'forest': 'Forest',
            'rain': 'Rain',
            'wind': 'Wind'
        };
        showToast(`BGM: ${typeNames[currentBgmType]}`);
        
        console.log(`Starting BGM with type: ${currentBgmType}`);
        startBGM();
    }
}

const handleBgmButton = (e) => {
    e.preventDefault();
    console.log('BGM button clicked');
    toggleBGM();
    if (editor) {
        editor.focus();
    }
};


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
    if (editor) {
        editor.focus();
    }
};

// --- Theme Logic ---
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');

    if (iconThemeSun && iconThemeMoon) {
        if (isLight) {
            iconThemeSun.style.display = 'none';
            iconThemeMoon.style.display = 'block';
        } else {
            iconThemeSun.style.display = 'block';
            iconThemeMoon.style.display = 'none';
        }
    }
    updateSoundIconColor(); // Update sound icon color for new theme
    playSound('click');
    saveSettings();
}

const handleThemeButton = (e) => {
    e.preventDefault();
    toggleTheme();
    if (editor) {
        editor.focus();
    }
};


// --- Typing Event & List Continuation ---

let saveTimeout;

// Handle IME input for sound AND Auto-save
function handleEditorAutoSaveInput(e) {
    // Auto-save (Debounced)
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveCurrentNote, 500);

    // Update UI - only if text actually changed
    // handleEditorContentSync already handles this, so we don't need to call updateHighlights here
    // updateHighlights(); // Removed - already called by handleEditorContentSync
    syncHeight();

    // Sound for IME
    if (e.inputType === 'insertCompositionText' || e.isComposing) {
        playSound('click');
    }
}

function handleEditorKeydown(e) {
    if (!editor) return;
    
    // CRITICAL: Check for IME composition
    if (e.isComposing || e.keyCode === 229) {
        return; // Do nothing if IME is active
    }

    // Keyboard Shortcuts
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    const ctrlOnly = e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;

    // Emacs-style kill ring: Ctrl+K (kill to end of line) and Ctrl+Y (yank)
    if (ctrlOnly && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const value = editor.value;
        
        // Find end of current line
        const lineEnd = value.indexOf('\n', start);
        const killEnd = lineEnd === -1 ? value.length : lineEnd;
        
        // Get text from cursor to end of line
        const killedText = value.substring(start, killEnd);
        
        // If there's a newline, include it
        const textToKill = killEnd < value.length && value[killEnd] === '\n' 
            ? killedText + '\n' 
            : killedText;
        
        if (textToKill.length > 0) {
            killRing = textToKill;
            // Delete the text
            editor.setRangeText('', start, killEnd < value.length && value[killEnd] === '\n' ? killEnd + 1 : killEnd, 'end');
            updateHighlights();
            syncHeight();
        }
        return;
    }

    if (ctrlOnly && e.key.toLowerCase() === 'y') {
        // Ctrl+Y for yank (paste from kill ring) on Mac
        // On Windows/Linux, Ctrl+Y is redo
        if (isMac) {
            e.preventDefault();
            if (killRing) {
                const start = editor.selectionStart;
                if (document.queryCommandSupported('insertText')) {
                    document.execCommand('insertText', false, killRing);
                } else {
                    editor.setRangeText(killRing, start, start, 'end');
                }
                updateHighlights();
                syncHeight();
            }
            return;
        } else {
            // Windows/Linux: Ctrl+Y is redo
            e.preventDefault();
            document.execCommand('redo');
            updateHighlights();
            syncHeight();
            return;
        }
    }

    if (cmdOrCtrl && !e.altKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
            case 'z':
                e.preventDefault();
                document.execCommand('undo');
                updateHighlights();
                syncHeight();
                return;
            case 'c':
                e.preventDefault();
                copyAll();
                return;
            case 'v':
                e.preventDefault();
                pastePlain();
                return;
            case 'x':
                e.preventDefault();
                if (document.queryCommandSupported('cut')) {
                    document.execCommand('cut');
                    updateHighlights();
                    syncHeight();
                }
                return;
            case 'a':
                e.preventDefault();
                editor.select();
                return;
            case 'b':
                e.preventDefault();
                insertMarkdown('bold');
                return;
        }
    }

    // Cmd+Shift+Z or Ctrl+Shift+Z for redo (Mac and Windows/Linux)
    if (cmdOrCtrl && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        document.execCommand('redo');
        updateHighlights();
        syncHeight();
        return;
    }

    // List Continuation Logic
    if (e.key === 'Enter') {
        const start = editor.selectionStart;
        const value = editor.value;

        // Find current line
        const lastNewline = value.lastIndexOf('\n', start - 1);
        const currentLineStart = lastNewline + 1;
        const currentLine = value.substring(currentLineStart, start);

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
}

function attachEditorListeners() {
    if (editorListenersAttached) {
        return;
    }
    if (!editor) {
        console.warn('attachEditorListeners: editor not ready, retrying...');
        setTimeout(attachEditorListeners, 100);
        return;
    }
    editor.addEventListener('input', handleEditorContentSync);
    editor.addEventListener('input', handleEditorAutoSaveInput);
    editor.addEventListener('keydown', handleEditorKeydown);
    editorListenersAttached = true;
}

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

function updateSyncStatusUI(status, message) {
    const syncIndicator = document.getElementById('sync-indicator');
    const syncText = document.getElementById('sync-text');
    
    if (!syncIndicator || !syncText) return;
    
    try {
        syncText.textContent = message || '';
        
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
