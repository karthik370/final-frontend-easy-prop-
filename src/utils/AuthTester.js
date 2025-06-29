import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { auth } from '../config/firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

WebBrowser.maybeCompleteAuthSession();

const AuthTester = () => {
  const [testStatus, setTestStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '402088305835-p2ganbq17plqr467o261jo6d34srg09n.apps.googleusercontent.com',
    webClientId: '402088305835-p2ganbq17plqr467o261jo6d34srg09n.apps.googleusercontent.com',
    responseType: 'token',
  });

  const testGoogleAuth = async () => {
    try {
      setLoading(true);
      setTestStatus('Testing Google auth...');
      
      const result = await promptAsync();
      
      if (result.type === 'success') {
        setTestStatus('Google auth successful! Token received.');
        
        const { access_token } = result.params;
        
        if (!access_token) {
          setTestStatus('Error: No access token returned');
          return;
        }
        
        setTestStatus('Getting user info from Google...');
        
        // Get user info from Google
        const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        
        const userInfo = await response.json();
        setTestStatus(`Google user info: ${JSON.stringify(userInfo)}`);
        
        // Create Firebase credential
        setTestStatus('Creating Firebase credential...');
        const credential = GoogleAuthProvider.credential(null, access_token);
        
        // Sign in with Firebase
        setTestStatus('Signing in with Firebase...');
        const userCredential = await signInWithCredential(auth, credential);
        
        setTestStatus(`Firebase sign-in successful: ${userCredential.user.uid}`);
      } else {
        setTestStatus(`Google auth failed: ${result.type}`);
      }
    } catch (error) {
      setTestStatus(`Error: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const testEmailAuth = async () => {
    try {
      setLoading(true);
      setTestStatus('Testing email/password auth...');
      
      // Use a test account - update with valid credentials
      const success = await login('test@example.com', 'password123');
      
      if (success) {
        setTestStatus('Email/password login successful!');
      } else {
        setTestStatus('Email/password login failed');
      }
    } catch (error) {
      setTestStatus(`Error: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authentication Tester</Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={testGoogleAuth}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Test Google Auth</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.emailButton]} 
        onPress={testEmailAuth}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Test Email Auth</Text>
      </TouchableOpacity>
      
      {loading && <ActivityIndicator size="large" color="#0066cc" />}
      
      {testStatus ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Test Result:</Text>
          <Text style={styles.resultText}>{testStatus}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
    width: '80%',
    alignItems: 'center',
  },
  emailButton: {
    backgroundColor: '#34A853',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    width: '100%',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
  },
});

export default AuthTester; 