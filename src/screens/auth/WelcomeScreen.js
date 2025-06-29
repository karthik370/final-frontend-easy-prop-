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
  });

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      console.log('Starting Google sign-in...');
      
      const result = await promptAsync();
      
      if (result.type === 'success') {
        const { access_token } = result.params;
        
        if (!access_token) {
          Alert.alert('Google Sign-In Error', 'No access token returned from Google.');
          setGoogleLoading(false);
          return;
        }

        try {
          // Get user info with the access token
          const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
            headers: { Authorization: `Bearer ${access_token}` },
          });
          
          const userInfo = await response.json();
          console.log('Google user info from API:', userInfo);
          
          // Create a custom Firebase credential
          const credential = GoogleAuthProvider.credential(null, access_token);

          // Sign in with credential
          const userCredential = await signInWithCredential(auth, credential);
          
          const user = userCredential.user;
          console.log('Firebase user object:', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            phoneNumber: user.phoneNumber,
            photoURL: user.photoURL,
            providerData: user.providerData
          });
          
          // Make sure we have the email from Google
          if (!user.email && user.providerData && user.providerData.length > 0) {
            const googleProvider = user.providerData.find(provider => provider.providerId === 'google.com');
            if (googleProvider && googleProvider.email) {
              console.log('Found email from provider data:', googleProvider.email);
              user.email = googleProvider.email;
            }
          }
          
          const idToken = await user.getIdToken();

          // Use the googleLogin method from AuthContext
          const success = await googleLogin(user, idToken);
          
          if (success) {
            console.log('Google login successful, user should be redirected to home screen');
            // The AppNavigator will handle the navigation based on userToken
          }
        } catch (error) {
          let title = 'Authentication Error';
          let message = 'An unexpected error occurred. Please try again.';

          if (error.code === 'ECONNABORTED') {
            title = 'Server Not Responding';
            message = 'Our server is taking too long to respond. Please try again later.';
          } else if (error.response) {
            message = error.response.data.message || 'An error occurred on the server.';
          } else {
            message = error.message;
          }
          
          console.error('Google sign-in error:', error);
          Alert.alert(title, message);
        }
      } else if (result.type === 'cancel') {
        console.log('Google sign-in was canceled by the user');
      } else {
        Alert.alert('Sign-In Error', 'Could not sign in with Google. Please try again.');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
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
