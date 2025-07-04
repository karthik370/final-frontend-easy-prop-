import React, { useRef, useEffect, useState, useContext } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { FirebaseAuthContext } from '../context/FirebaseAuthContext';
import Constants from 'expo-constants';

const FirebasePhoneAuth = ({ phoneNumber, onSendOtp, children }) => {
  const recaptchaVerifier = useRef(null);
  const [verificationId, setVerificationId] = useState(null);
  const firebaseAuth = useContext(FirebaseAuthContext);
  
  // Firebase configuration from app.json/app.config.js
  const firebaseConfig = Constants.expoConfig?.extra?.firebase || {
    apiKey: "AIzaSyBbMy8x3rNPoySTTPn490YsBMj54ONX_rU",
    authDomain: "realestate-668fa.firebaseapp.com",
    projectId: "realestate-668fa",
    storageBucket: "realestate-668fa.firebasestorage.app",
    messagingSenderId: "402088305835",
    appId: "1:402088305835:web:e17496d9837969427043ee",
    measurementId: "G-0Y40C6GLMP"
  };

  // Send the OTP when phoneNumber changes
  useEffect(() => {
    const sendOtp = async () => {
      if (phoneNumber && recaptchaVerifier.current) {
        try {
          // Using the Twilio integration from the backend instead of Firebase
          if (onSendOtp) {
            onSendOtp(phoneNumber, recaptchaVerifier.current);
          }
        } catch (error) {
          console.error('Error sending OTP:', error);
        }
      }
    };
    
    if (phoneNumber) {
      sendOtp();
    }
  }, [phoneNumber]);

  return (
    <View style={styles.container}>
      {/* Firebase reCaptcha component - required for security */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification={Platform.OS === 'ios'}
        title="Verify you're human"
        cancelLabel="Cancel"
      />
      
      {/* Render children components (like the OTP input) */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default FirebasePhoneAuth;
