// Initialize editor elements with error checking
// 注意: これらの変数はDOMContentLoadedイベントの後に使用される必要がある
let editor, highlightLayer, scrollArea, toast;
let btnFloatingMenu, btnSidebarNew, btnNew, btnStar;
let btnUndo, btnRedo, btnH1, btnBold, btnQuote, btnList, btnOrderedList;
let btnCopy, btnPaste, btnSelectMode;
let btnUp, btnDown, btnLeft, btnRight;
let btnTheme, iconThemeSun, iconThemeMoon, btnFont;
let btnSound, iconSoundOn, iconSoundOff, btnFullscreen;
let sidebar, sidebarOverlay, btnCloseSidebar, noteList, toolbar;

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

// --- Touch/Scroll Detection for Toolbar ---
// Global scroll detection removed to improve responsiveness.
// We now rely on per-button touch handling in attachTouchAction.

// --- DB State ---
let db;
let currentNoteId = null;
let showTrash = false; // Toggle state for sidebar
let showFavorites = false; // Toggle state for favorites filter

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
        editor.value = note.text;
        // If viewing a deleted note, maybe show a warning or disable editing?
        // For now, allow viewing.
        updateHighlights();
        syncHeight();
        updateStarState(note.favorite);
        scrollArea.scrollTop = 0;
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
        await db.notes.update(id, { deleted: Date.now() });
        showToast('Moved to Trash');
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
    await db.notes.update(id, { deleted: null });
    showToast('Restored from Trash');
    updateNoteList();
    playSound('click');
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

        const title = note.text.split('\n')[0].trim() || 'Untitled';
        const date = new Date(showTrash ? note.deleted : note.updated).toLocaleString();

        // Action Buttons
        let actionBtns = '';
        if (showTrash) {
            // Restore & Delete
            actionBtns = `
            <button class="note-action-btn restore" title="Restore">↩</button>
            <button class="note-action-btn delete" title="Delete Permanently">×</button>
        `;
        } else {
            // Delete (Move to Trash)
            actionBtns = `
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
        const btnDelete = li.querySelector('.delete');
        if (btnDelete) btnDelete.addEventListener('click', (e) => deleteNote(note.id, e));

        const btnRestore = li.querySelector('.restore');
        if (btnRestore) btnRestore.addEventListener('click', (e) => restoreNote(note.id, e));

        noteList.appendChild(li);
    });
}

// --- Event Listeners for New Features ---



btnFloatingMenu.addEventListener('click', (e) => {
    e.preventDefault();
    toggleSidebar();
});
// btnMenu.addEventListener('click', ...); // Removed

btnSidebarNew.addEventListener('click', (e) => {
    e.preventDefault();
    createNote();
    // Keep sidebar open? Yes, usually.
    // editor.focus(); // Focus editor?
});

btnNew.addEventListener('click', (e) => {
    e.preventDefault();
    createNote();
    editor.focus();
});
btnStar.addEventListener('click', (e) => {
    e.preventDefault();
    toggleFavorite();
});

// Favorites Toggle
document.getElementById('btn-toggle-favorites').addEventListener('click', (e) => {
    e.preventDefault();
    toggleFavoritesView();
});

// Trash Toggle
document.getElementById('btn-toggle-trash').addEventListener('click', (e) => {
    e.preventDefault();
    toggleTrashView();
});

btnCloseSidebar.addEventListener('click', (e) => {
    e.preventDefault();
    toggleSidebar();
});
sidebarOverlay.addEventListener('click', toggleSidebar);

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
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    loadSettings(); // Load settings first
    initDB();

    // Initialize mobile/responsive behavior
    handleResize();

    editor.focus();
});


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

    // Escape HTML to prevent XSS and rendering issues
    text = text.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Apply Markdown Styling
    // Bold: **text** -> **<span class="md-bold">text</span>**
    // We want to underline ONLY the text inside.
    text = text.replace(/\*\*(.*?)\*\*/g, '**<span class="md-bold">$1</span>**');

    // Heading: # text (at start of line)
    // Support # through ######
    text = text.replace(/^(#{1,6})\s+(.*)$/gm, '<span class="md-heading">$1 $2</span>');

    // Handle trailing newline for display
    if (text.endsWith('\n')) {
        text += '<br>';
    }

    highlightLayer.innerHTML = text;
    } catch (error) {
        console.error('Error in updateHighlights:', error);
    }
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

editor.addEventListener('input', () => {
    updateHighlights();
    syncHeight();
    syncPosition();
});
window.addEventListener('resize', () => {
    handleResize();
    syncHeight();
    syncPosition();
});
scrollArea.addEventListener('scroll', syncPosition);

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
function initAll() {
    initElements();
    initEditor();
    
    // ツールバーボタンのイベントリスナーを設定
    bindToolbarActions();
}

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

function bindToolbarActions() {
    if (!btnUndo || !btnRedo || !btnH1 || !btnBold || !btnCopy || !btnPaste || !btnSelectMode) {
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
