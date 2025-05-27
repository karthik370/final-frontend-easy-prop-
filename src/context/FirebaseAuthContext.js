import React, { createContext, useContext, useEffect } from 'react';
import { AuthContext } from './AuthContext';

// Create a context for Firebase authentication
export const FirebaseAuthContext = createContext();

// Provider component that wraps your app and makes Firebase auth available
export const FirebaseAuthProvider = ({ children }) => {
  const authContext = useContext(AuthContext);
  
  // Create a Firebase-compatible API that delegates to the regular auth context
  const firebaseAuth = {
    // This maintains compatibility with any code that expects Firebase auth
    // but delegates to the regular MongoDB-based authentication
    currentUser: authContext.user ? {
      uid: authContext.user._id,
      phoneNumber: authContext.user.phoneNumber,
      email: authContext.user.email,
      displayName: authContext.user.name,
    } : null,
    
    // Firebase-compatible login method that uses regular auth
    signInWithPhoneNumber: async (phoneNumber, recaptchaVerifier) => {
      console.log('Firebase auth is deprecated. Using MongoDB auth instead.');
      // This is a stub that maintains compatibility
      return {
        confirm: async (code) => {
          console.log('Using MongoDB auth for verification');
          // The real verification happens in OtpVerificationScreen
          return { user: authContext.user };
        }
      };
    }
  };
  
  return (
    <FirebaseAuthContext.Provider value={firebaseAuth}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};
