import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Navigation
import { NavigationContainer } from '@react-navigation/native';

// Context Providers
import { AuthProvider } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { FavoritesProvider } from './src/context/FavoritesContext';

// Expo Notifications
// Import statements removed to fix bundling error

// Navigation Stacks
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  
  // Notification setup commented out to fix bundling errors
  useEffect(() => {
    const setupApp = async () => {
      try {
        console.log('App initialized successfully');
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };
    
    setupApp();
  }, []);

  useEffect(() => {
    // Simulate splash screen / Check if user is logged in
    const bootstrapAsync = async () => {
      try {
        // Get user token from storage
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token);
      } catch (e) {
        console.log('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  return (
    <NavigationContainer>
      <AuthProvider>
        {/* Add FirebaseAuthProvider inside the regular AuthProvider */}
          <LocationProvider>
            <FavoritesProvider>
              <SafeAreaProvider>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <AppNavigator />
              </SafeAreaProvider>
            </FavoritesProvider>
          </LocationProvider>
      </AuthProvider>
    </NavigationContainer>
  );
}
