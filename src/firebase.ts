
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
  
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBg2STmAblLlasomCu9dhXqsFCmwdQH9zg",
  authDomain: "knowcode-2-0.firebaseapp.com",
  projectId: "knowcode-2-0",
  storageBucket: "knowcode-2-0.firebasestorage.app",
  messagingSenderId: "426078506744",
  appId: "1:426078506744:web:2fb7b76d7927741f7eb50d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);
export { auth };

// Initialize Firestore
export const db = getFirestore(app);

