import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { auth } from '../../config/firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const { login, isLoading, googleLogin } = useContext(AuthContext);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '402088305835-p2ganbq17plqr467o261jo6d34srg09n.apps.googleusercontent.com',
    androidClientId: '402088305835-8keap038cuclsbcn6t2actb03uej3r81.apps.googleusercontent.com',
    iosClientId: '<YOUR_IOS_CLIENT_ID>',
    webClientId: '402088305835-p2ganbq17plqr467o261jo6d34srg09n.apps.googleusercontent.com',
    scopes: ['profile', 'email']
  });

  const validateEmail = () => {
    const re = /\S+@\S+\.\S+/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!re.test(email)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = () => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleLogin = async () => {
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();

    if (isEmailValid && isPasswordValid) {
      const success = await login(email, password);
      if (success) {
        // Login successful, navigation will be handled by AppNavigator
      }
    }
  };

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Log in to continue</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onBlur={validateEmail}
            />
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onBlur={validatePassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={24}
                color="#666"
                style={styles.inputIcon}
              />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={() => navigation.navigate('ForgotPasswordScreen')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <View style={styles.loadingButtonContent}>
                <ActivityIndicator color="#4285F4" size="small" />
                <Text style={{color: '#4285F4', marginLeft: 10, fontWeight: 'bold'}}>Connecting...</Text>
              </View>
            ) : (
              <View style={styles.googleButtonContent}>
                <Ionicons name="logo-google" size={20} color="#4285F4" style={styles.buttonIcon} />
                <Text style={styles.googleButtonText}>Login with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 5,
  },
  inputIcon: {
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 10,
    fontSize: 16,
  },
  eyeIcon: {
    paddingHorizontal: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#0066cc',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 10,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4285F4',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
