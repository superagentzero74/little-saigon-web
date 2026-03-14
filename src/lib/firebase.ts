import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "little-saigon-c055a.firebaseapp.com",
  projectId: "little-saigon-c055a",
  storageBucket: "little-saigon-c055a.firebasestorage.app",
  messagingSenderId: "570934597896",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app;
let db;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} else {
  app = getApps()[0];
  db = getFirestore(app);
}
const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

export { app, db, auth, storage, googleProvider, appleProvider };
