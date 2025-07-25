import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Alert, View, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Navigation
import { NavigationContainer } from '@react-navigation/native';

// Context Providers
import { AuthProvider } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { FavoritesProvider } from './src/context/FavoritesContext';

// Expo Notifications
import ExpoNotificationService from './src/services/ExpoNotificationService';
import * as Notifications from 'expo-notifications';

// Navigation Stacks
import AppNavigator from './src/navigation/AppNavigator';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const navigationRef = useRef(null);
  
  // Fast startup - only check token, defer everything else
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // Only get user token - this is fast
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token);
        
        // Defer notification setup to avoid blocking startup
        setTimeout(() => {
          setupNotifications(token);
        }, 100);
        
      } catch (e) {
        console.log('Failed to load token', e);
      } finally {
        // Set loading to false immediately after token check
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);
  
  // Separate function for notification setup (non-blocking)
  const setupNotifications = async (token) => {
    try {
      // Reliably register the push token in the background
      await ExpoNotificationService.registerPushToken();
      
      // Set up notification listeners
      ExpoNotificationService.setupNotificationListeners(
        // Handle notification received while app is in foreground
        notification => {
          console.log('Notification received in foreground:', notification);
        },
        // Handle notification response (when user taps on notification)
        response => {
          const data = response.notification.request.content.data;
          console.log('Notification tapped:', data);
          
          // Handle navigation based on notification type
          if (data.conversationId && navigationRef.current) {
            navigationRef.current.navigate('Chat', {
              conversationId: data.conversationId,
              recipient: {
                _id: data.senderId,
                name: data.senderName
              },
              propertyId: data.propertyId,
              propertyTitle: data.propertyTitle || 'Property'
            });
          }
        }
      );
    } catch (error) {
      console.error('Failed to setup notifications:', error);
    }
  };

  // Show splash screen while loading
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 10, fontSize: 16, color: '#666' }}>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <AuthProvider>
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