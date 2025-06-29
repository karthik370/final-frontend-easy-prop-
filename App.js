import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Alert } from 'react-native';
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
  
  // Check for stored user token and set up notifications
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // Get user token from storage
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token);
        
        // Register for push notifications if user is logged in
        if (token) {
          try {
            await ExpoNotificationService.registerForPushNotifications(token);
          } catch (error) {
            console.error('Failed to register for push notifications:', error);
          }
        }
      } catch (e) {
        console.log('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
    
    // Set up notification listeners
    const cleanup = ExpoNotificationService.setupNotificationListeners(
      // Handle notification received while app is in foreground
      notification => {
        console.log('Notification received in foreground:', notification);
        // You can show an alert or custom UI for foreground notifications
      },
      // Handle notification response (when user taps on notification)
      response => {
        const data = response.notification.request.content.data;
        console.log('Notification tapped:', data);
        
        // Handle navigation based on notification type
        if (data.conversationId && navigationRef.current) {
          // Navigate to chat screen with this conversation
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
    
    return cleanup;
  }, []);

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