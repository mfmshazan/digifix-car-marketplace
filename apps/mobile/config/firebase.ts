import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration from your google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyCiDG1vGmenMtEbcVNB_KN9ZmyAaSUlXUA",
  authDomain: "chatappwpf.firebaseapp.com",
  projectId: "chatappwpf",
  storageBucket: "chatappwpf.firebasestorage.app",
  messagingSenderId: "477521405069",
  appId: "1:477521405069:android:9364da14905312073beec4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(app);

export { app, auth };
