import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';
import { SERVER_URL } from '../config/ip-config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // Set up axios defaults
  useEffect(() => {
    if (userToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [userToken]);

  // Login with email/password
  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${SERVER_URL}/api/auth/login`, {
        email,
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
      let userToken = await AsyncStorage.getItem('userToken');
      let userData = await AsyncStorage.getItem('userData');
      
      if (userToken && userData) {
        setUserToken(userToken);
        setUser(JSON.parse(userData));
      }
      
      setIsLoading(false);
      return userToken ? true : false;
    } catch (e) {
      console.log('isLoggedIn error', e);
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
    
    setIsLoading(false);
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        userToken,
        user,
        error,
        login,
        register,
        firebaseLogin,
        logout,
        isLoggedIn,
        updateProfile,
        guestLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
