import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAuiSV72ipLxa7udqZi8uE0CqBpnDF9M8c",
  authDomain: "polla-mundial-2026-3f217.firebaseapp.com",
  projectId: "polla-mundial-2026-3f217",
  storageBucket: "polla-mundial-2026-3f217.firebasestorage.app",
  messagingSenderId: "515602900251",
  appId: "1:515602900251:web:17b63fbaec837fd3a51fbe",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
