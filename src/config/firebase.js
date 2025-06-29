import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import Constants from 'expo-constants';

// Firebase configuration from app.json
const firebaseConfig = Constants.expoConfig?.extra?.firebase || {
  apiKey: "AIzaSyBbMy8x3rNPoySTTPn490YsBMj54ONX_rU",
  authDomain: "realestate-668fa.firebaseapp.com",
  projectId: "realestate-668fa",
  storageBucket: "realestate-668fa.firebasestorage.app",
  messagingSenderId: "402088305835",
  appId: "1:402088305835:web:e17496d9837969427043ee",
  measurementId: "G-0Y40C6GLMP"
};

// Initialize Firebase only if it hasn't been initialized already
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Get Firebase auth instance
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google Auth Provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;
