import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';
import { SERVER_URL } from '../config/ip-config';
import ExpoNotificationService from '../services/ExpoNotificationService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Set up axios defaults - only when needed
  useEffect(() => {
    if (userToken && userToken !== 'loading') {
      axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [userToken]);

  // Initialize auth state from storage (fast, non-blocking)
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem('userToken'),
          AsyncStorage.getItem('userData')
        ]);
        
        if (storedToken && storedUser) {
          setUserToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    
    initializeAuth();
  }, []);

  // Login with email/password
  const login = async (emailOrPhone, password) => {
    setIsLoading(true);
    setError(null);
    try {
      // Determine if input is phone (10+ digits, e.g., with or without country code), otherwise treat as email
      const isPhone = /^\d{10,15}$/.test(emailOrPhone);
      const payload = isPhone
        ? { phone: emailOrPhone, password }
        : { email: emailOrPhone, password };
      // This allows login with phone numbers like 8286739111 or 918286739111
      const response = await axios.post(`${SERVER_URL}/api/auth/login`, payload);
      
      const { token, ...userData } = response.data;
      
      // Ensure user data has the correct structure
      const normalizedUserData = {
        ...userData,
        _id: userData._id || (userData.user && userData.user._id)
      };
      
      setUserToken(token);
      setUser(normalizedUserData);
      
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(normalizedUserData));
      
      // Register for push notifications
      try {
        await ExpoNotificationService.registerForPushNotifications(token);
      } catch (notificationError) {
        console.error('Failed to register for push notifications:', notificationError);
        // Continue with login even if push registration fails
      }
      
      setIsLoading(false);
      return true;
    } catch (error) {
      setIsLoading(false);
      const message = error.response?.data?.message || 'Login failed';
      setError(message);
      Alert.alert('Login Failed', message);
      return false;
    }
  };

  // Register with email/password
  const register = async (name, email, phone, password) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${SERVER_URL}/api/auth/register`, {
        name,
        email,
        phone,
        password
      });
      
      const { token, ...userData } = response.data;
      
      setUserToken(token);
      setUser(userData);
      
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      setIsLoading(false);
      return true;
    } catch (error) {
      setIsLoading(false);
      const message = error.response?.data?.message || 'Registration failed';
      setError(message);
      Alert.alert('Registration Failed', message);
      return false;
    }
  };

  // Login with Firebase (Phone Auth)
  const firebaseLogin = async (firebaseUID, phone, name = '', email = '') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${SERVER_URL}/api/auth/firebase`, {
        firebaseUID,
        phone,
        name,
        email
      });
      
      const { token, ...userData } = response.data;
      
      setUserToken(token);
      setUser(userData);
      
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      // Register for push notifications
      try {
        await ExpoNotificationService.registerForPushNotifications(token);
      } catch (notificationError) {
        console.error('Failed to register for push notifications:', notificationError);
        // Continue with login even if push registration fails
      }
      
      setIsLoading(false);
      return true;
    } catch (error) {
      setIsLoading(false);
      const message = error.response?.data?.message || 'Firebase login failed';
      setError(message);
      Alert.alert('Login Failed', message);
      return false;
    }
  };

  // Google Sign-In
  const googleLogin = async (user, idToken) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare the request payload with explicit email
      const payload = {
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || '',
        idToken: idToken,
        provider: 'google'
      };
      
      console.log('Google login payload:', payload);
      
      // Make the API call with Firebase ID token in Authorization header
      const response = await axios.post(
        `${SERVER_URL}/api/auth/firebase`,
        payload,
        {
          timeout: 15000, // 15 seconds timeout
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );
      
      if (response.data) {
        const { token, ...userData } = response.data;
        
        // Ensure email is included in user data
        const enhancedUserData = {
          ...userData,
          email: userData.email || user.email || ''
        };
        
        console.log('Google login successful, user data:', enhancedUserData);
        
        // Store the token and user data
        setUserToken(token);
        setUser(enhancedUserData);
        
        // Save to AsyncStorage for persistence
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(enhancedUserData));
        
        // Register for push notifications
        try {
          await ExpoNotificationService.registerForPushNotifications(token);
        } catch (notificationError) {
          console.error('Failed to register for push notifications:', notificationError);
          // Continue with login even if push registration fails
        }
        
        setIsLoading(false);
        return true;
      } else {
        throw new Error('Failed to authenticate with Google');
      }
    } catch (error) {
      console.error('Google login error:', error);
      setIsLoading(false);
      
      const message = error.response?.data?.message || error.message || 'Google login failed';
      setError(message);
      
      // If server error but we have Google user data, try to proceed with local data
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout') || error.message.includes('Network Error')) {
        try {
          // Create minimal user data from Google info
          const localUserData = {
            _id: user.uid,
            name: user.displayName || 'Google User',
            email: user.email || '',
            phone: user.phoneNumber || '',
            provider: 'google'
          };
          
          // Generate a temporary token
          const tempToken = 'google_' + Date.now();
          
          setUserToken(tempToken);
          setUser(localUserData);
          
          await AsyncStorage.setItem('userToken', tempToken);
          await AsyncStorage.setItem('userData', JSON.stringify(localUserData));
          
          Alert.alert(
            'Limited Login',
            'Connected with Google, but our server is busy. Some features may be limited.',
            [{ text: 'OK' }]
          );
          
          // Register for push notifications
          try {
            await ExpoNotificationService.registerForPushNotifications(tempToken);
          } catch (notificationError) {
            console.error('Failed to register for push notifications:', notificationError);
            // Continue with login even if push registration fails
          }
          
          return true;
        } catch (localError) {
          console.error('Local fallback error:', localError);
        }
      }
      
      Alert.alert('Authentication Error', message);
      return false;
    }
  };

  // Logout
  const logout = async () => {
    setIsLoading(true);
    setUserToken(null);
    setUser(null);
    
    // Clear all user data
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    
    // Clear first launch flag to ensure welcome screen shows again
    await AsyncStorage.removeItem('alreadyLaunched');
    
    console.log('Logged out. Welcome screen will show on next start.');
    setIsLoading(false);
  };

  // Check if user is logged in
  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      
      // Retrieve stored data
      const storedToken = await AsyncStorage.getItem('userToken');
      const storedUserData = await AsyncStorage.getItem('userData');
      
      if (storedToken && storedUserData) {
        const userData = JSON.parse(storedUserData);
        
        // Verify token validity with server
        try {
          const response = await axios.get(`${SERVER_URL}/api/users/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          
          // If token is valid, update with fresh user data
          if (response.data && response.data._id) {
            // Set the user data directly from the response
            setUserToken(storedToken);
            setUser(response.data);
            console.log('User authenticated with valid token:', response.data.name);
            setIsLoading(false);
            return true;
          }
        } catch (serverError) {
          console.log('Token verification failed:', serverError.message);
          
          // Ensure userData has the correct structure with _id at the top level
          const normalizedUserData = {
            ...userData,
            _id: userData._id || (userData.user && userData.user._id)
          };
          
          // If server check fails, still use stored data but mark for refresh
          setUserToken(storedToken);
          setUser(normalizedUserData);
          setIsLoading(false);
          return true;
        }
      }
      
      // No stored credentials
      setUserToken(null);
      setUser(null);
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Error checking login status:', error);
      setUserToken(null);
      setUser(null);
      setIsLoading(false);
      return false;
    }
  };

  // Update profile
  const updateProfile = async (userData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.put(`${SERVER_URL}/api/auth/profile`, userData);
      
      const updatedUser = response.data;
      setUser(updatedUser);
      
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      
      setIsLoading(false);
      Alert.alert('Success', 'Profile updated successfully');
      return true;
    } catch (error) {
      setIsLoading(false);
      const message = error.response?.data?.message || 'Profile update failed';
      setError(message);
      Alert.alert('Update Failed', message);
      return false;
    }
  };

  // Guest login - no authentication, just browsing
  const guestLogin = async () => {
    setIsLoading(true);
    // Create a guest user with limited access
    const guestUser = {
      id: 'guest',
      name: 'Guest User',
      email: '',
      phone: '',
      isGuest: true
    };
    
    // For guest users, create a special guest token
    // This ensures the AppNavigator will navigate to Main navigator
    const guestToken = 'guest_token_' + Date.now();
    
    setUser(guestUser);
    setUserToken(guestToken);
    
    // Store guest info in AsyncStorage
    await AsyncStorage.setItem('userData', JSON.stringify(guestUser));
    await AsyncStorage.setItem('isGuest', 'true');
    await AsyncStorage.setItem('userToken', guestToken);
    
    console.log('Guest login successful: token set');
    
    // Register for push notifications
    try {
      await ExpoNotificationService.registerForPushNotifications(guestToken);
    } catch (notificationError) {
      console.error('Failed to register for push notifications:', notificationError);
      // Continue with login even if push registration fails
    }
    
    setIsLoading(false);
    return true;
  };

  // Reset password with verification code
  const resetPassword = async (email, newPassword, verificationCode) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${SERVER_URL}/api/auth/reset-password`, {
        email,
        newPassword,
        verificationCode
      });
      
      if (response.data.success) {
        const { token, user: userData } = response.data;
        
        // If token is provided, automatically log in the user
        if (token) {
          setUserToken(token);
          setUser(userData);
          
          await AsyncStorage.setItem('userToken', token);
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
          
          // Register for push notifications
          try {
            await ExpoNotificationService.registerForPushNotifications(token);
          } catch (notificationError) {
            console.error('Failed to register for push notifications:', notificationError);
            // Continue with login even if push registration fails
          }
        }
        
        setIsLoading(false);
        return { success: true, autoLogin: !!token };
      } else {
        throw new Error(response.data.message || 'Password reset failed');
      }
    } catch (error) {
      setIsLoading(false);
      const message = error.response?.data?.message || error.message || 'Password reset failed';
      setError(message);
      return { success: false, message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        userToken,
        setUserToken,
        user,
        setUser,
        error,
        setError,
        isInitialized,
        login,
        register,
        firebaseLogin,
        googleLogin,
        logout,
        isLoggedIn,
        updateProfile,
        guestLogin,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
