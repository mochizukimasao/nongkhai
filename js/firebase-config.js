// Firebase設定ファイル
// Firebase Console (https://console.firebase.google.com/) でプロジェクトを作成し、
// 設定情報をここに記入してください。

(function () {
    const firebaseConfig = {
        apiKey: "AIzaSyBJigwHKoOImGZlurOVi4Pi56aPL2HBA28",
        authDomain: "nongkhai-editor.firebaseapp.com",
        projectId: "nongkhai-editor",
        storageBucket: "nongkhai-editor.appspot.com",
        messagingSenderId: "1092923123338",
        appId: "1:1092923123338:web:13b32439817f029d132f73"
    };

    if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not loaded. Skipping Firebase initialization.');
        return;
    }

    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        console.warn('Firebase not configured. Please set up firebase-config.js with your Firebase project credentials.');
        window.firebaseAuth = null;
        window.firebaseDb = null;
        return;
    }

    try {
        const firebaseApp = firebase.initializeApp(firebaseConfig);
        const firebaseAuth = firebase.auth();
        const firestore = firebase.firestore();

        // ネットワーク環境や一部ブラウザでWebChannelがブロックされる場合に備えてロングポーリングを自動検知
        firestore.settings({
            experimentalAutoDetectLongPolling: true,
            useFetchStreams: false
        });

        firestore.enablePersistence().catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Firestore persistence failed: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                console.warn('Firestore persistence not available');
            }
        });

        window.firebaseApp = firebaseApp;
        window.firebaseAuth = firebaseAuth;
        window.firebaseDb = firestore;

        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error);
        window.firebaseAuth = null;
        window.firebaseDb = null;
    }
})();
