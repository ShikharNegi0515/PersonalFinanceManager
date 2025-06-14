import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import {
    getDatabase,
    ref,
    set,
    push,
    onValue,
    remove,
    update
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-database.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    updateProfile,
    signOut
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import {
    getStorage
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-storage.js"; // ✅ Added this line

const firebaseConfig = {
    apiKey: "AIzaSyDwrpZz7Mivv-U_izYxAuMMP0IGh9geuy8",
    authDomain: "finance-buddy-2651b.firebaseapp.com",
    databaseURL: "https://finance-buddy-2651b-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "finance-buddy-2651b",
    storageBucket: "finance-buddy-2651b.appspot.com",
    messagingSenderId: "574969551538",
    appId: "1:574969551538:web:0c891f5af2327e8ca147ab",
    measurementId: "G-H3M2Q79LHJ"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

export {
    db,
    ref,
    set,
    push,
    onValue,
    remove,
    update,
    auth,
    updateProfile,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    storage
};
