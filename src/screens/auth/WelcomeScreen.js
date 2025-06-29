import React, { useContext, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '../../context/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { auth } from '../../config/firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import axios from 'axios';
import { SERVER_URL } from '../../config/ip-config';

WebBrowser.maybeCompleteAuthSession();

const WelcomeScreen = ({ navigation }) => {
  const authCtx = useContext(AuthContext);
  if (!authCtx) {
    console.error('AuthContext is not available in WelcomeScreen!');
    return null;
  }
  const { guestLogin, setUser, setUserToken, isLoading, googleLogin } = authCtx;
  const [googleLoading, setGoogleLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '402088305835-p2ganbq17plqr467o261jo6d34srg09n.apps.googleusercontent.com',
    androidClientId: '402088305835-8keap038cuclsbcn6t2actb03uej3r81.apps.googleusercontent.com',
    iosClientId: '<YOUR_IOS_CLIENT_ID>',
    webClientId: '402088305835-p2ganbq17plqr467o261jo6d34srg09n.apps.googleusercontent.com',
    scopes: ['profile', 'email']
  });

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      console.log('Starting Google sign-in...');
      
      // Use proxy for web, direct for native
      const result = await promptAsync({ showInRecents: true });
      console.log('Google sign-in result type:', result.type);
      
      if (result.type === 'success') {
        console.log('Google sign-in params:', Object.keys(result.params));
        
        // Get tokens from the result
        const { id_token, access_token } = result.params;
        
        if (!id_token && !access_token) {
          console.error('No tokens returned from Google');
          Alert.alert('Authentication Error', 'Could not get authentication tokens from Google. Please try again.');
          setGoogleLoading(false);
          return;
        }

        try {
          let credential;
          
          // Try to create credential with the available tokens
          if (id_token) {
            console.log('Using id_token for authentication');
            credential = GoogleAuthProvider.credential(id_token);
          } else if (access_token) {
            console.log('Using access_token for authentication');
            credential = GoogleAuthProvider.credential(null, access_token);
          } else {
            throw new Error('No valid token available for authentication');
          }

          console.log('Signing in to Firebase with credential');
          // Sign in with credential
          const userCredential = await signInWithCredential(auth, credential);
          
          const user = userCredential.user;
          console.log('Firebase auth successful, user ID:', user.uid);
          
          // Ensure we have user email
          let userEmail = user.email;
          if (!userEmail && user.providerData && user.providerData.length > 0) {
            const googleProvider = user.providerData.find(provider => provider.providerId === 'google.com');
            if (googleProvider && googleProvider.email) {
              userEmail = googleProvider.email;
              console.log('Using email from provider data:', userEmail);
            }
          }
          
          const idToken = await user.getIdToken();
          console.log('Got Firebase ID token, length:', idToken.length);

          // Use the googleLogin method from AuthContext
          console.log('Calling backend authentication endpoint');
          const success = await googleLogin(user, idToken);
          
          if (success) {
            console.log('Google login successful, navigation should happen automatically');
          } else {
            console.error('Backend authentication failed');
            Alert.alert('Authentication Error', 'Could not complete the sign-in process. Please try again.');
          }
        } catch (error) {
          console.error('Firebase authentication error:', error.code, error.message);
          
          let title = 'Authentication Error';
          let message = 'An unexpected error occurred. Please try again.';

          if (error.code === 'auth/invalid-credential') {
            message = 'The authentication credential is invalid. Please try again.';
          } else if (error.code === 'auth/operation-not-allowed') {
            message = 'Google sign-in is not enabled for this app. Please contact support.';
          } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            title = 'Connection Error';
            message = 'The server is taking too long to respond. Please check your internet connection and try again.';
          } else if (error.response) {
            message = error.response.data?.message || 'An error occurred on the server.';
          } else {
            message = error.message;
          }
          
          Alert.alert(title, message);
        }
      } else if (result.type === 'cancel') {
        console.log('Google sign-in was canceled by the user');
      } else {
        console.error('Sign-in error result:', result);
        Alert.alert('Sign-In Error', 'Could not sign in with Google. Please try again later.');
      }
    } catch (error) {
      console.error('Google sign-in process error:', error);
      Alert.alert('Google Sign-In Error', error.message || 'Failed to sign in with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      const success = await guestLogin();
      console.log('Guest login completed:', success);
    } catch (error) {
      console.error('Guest login error:', error);
    }
  };

  return (
    <LinearGradient
      colors={['#0066cc', '#4da6ff', '#0066cc']}
      style={styles.background}
    >
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>Home Zest</Text>
          <Text style={styles.tagline}>Find your dream property</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.loginButton]}
            onPress={() => navigation.navigate('LoginScreen')}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.registerButton]}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.buttonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                <ActivityIndicator color="#4285F4" size="small" />
                <Text style={{color: '#4285F4', marginLeft: 10, fontWeight: 'bold'}}>Connecting...</Text>
              </View>
            ) : (
              <Text style={[styles.buttonText, { color: '#4285F4', fontWeight: 'bold' }]}>Login with Google</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.guestButton]}
            onPress={handleGuestLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0066cc" size="small" />
            ) : (
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    color: '#fff',
    marginTop: 10,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 40,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  loginButton: {
    backgroundColor: '#0066cc',
  },
  registerButton: {
    backgroundColor: '#25d366',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4285F4',
    marginBottom: 10,
  },
  guestButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guestButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default WelcomeScreen;

