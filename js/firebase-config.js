// Firebase設定ファイル (compat SDK)
console.log('[firebase-config] loading...');

(function() {
    // Firebaseが読み込まれているかチェック
    if (typeof firebase === 'undefined') {
        console.warn('[firebase-config] Firebase SDK not loaded. Waiting for scripts...');
        // 少し待ってから再試行
        setTimeout(function() {
            if (typeof firebase === 'undefined') {
                console.error('[firebase-config] Firebase SDK still not available');
                window.firebaseAuth = null;
                window.firebaseFirestore = null;
                return;
            }
            initializeFirebase();
        }, 100);
        return;
    }

    initializeFirebase();

    function initializeFirebase() {
        try {
            // Firebase設定
            const firebaseConfig = {
                apiKey: "AIzaSyBJigwHKoOImGZlurOVi4Pi56aPL2HBA28",
                authDomain: "nongkhai-editor.firebaseapp.com",
                projectId: "nongkhai-editor",
                storageBucket: "nongkhai-editor.firebasestorage.app",
                messagingSenderId: "1092923123338",
                appId: "1:1092923123338:web:13b32439817f029d132f73",
                measurementId: "G-L7R4TR1MNC"
            };

            // Firebase App初期化
            const firebaseApp = firebase.initializeApp(firebaseConfig);
            
            // Firebase Auth初期化
            const firebaseAuth = firebase.auth();
            
            // Firebase Firestore初期化
            const firestore = firebase.firestore();
            
            // 永続化を有効化
            firestore.enablePersistence().catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('[firebase-config] Firestore persistence failed: Multiple tabs open');
                } else if (err.code === 'unimplemented') {
                    console.warn('[firebase-config] Firestore persistence not available');
                } else {
                    console.warn('[firebase-config] Firestore persistence error:', err);
                }
            });

            // グローバルに公開
            window.firebaseApp = firebaseApp;
            window.firebaseAuth = firebaseAuth;
            window.firebaseFirestore = firestore;
            window.firebaseProvider = new firebase.auth.GoogleAuthProvider();

            console.log('[firebase-config] Firebase initialized successfully', {
                hasAuth: !!window.firebaseAuth,
                hasFirestore: !!window.firebaseFirestore,
            });
        } catch (error) {
            console.error('[firebase-config] Firebase initialization error:', error);
            window.firebaseAuth = null;
            window.firebaseFirestore = null;
        }
    }
})();
