import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Alert, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';

// Context Providers
import { AuthProvider } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { ConfirmationResultProvider } from './src/context/ConfirmationResultContext';
import { FirebaseAuthProvider } from './src/context/FirebaseAuthContext';

// Expo Notifications
import ExpoNotificationService from './src/services/ExpoNotificationService';
import * as Notifications from 'expo-notifications';

// Navigation Stacks
import AppNavigator from './src/navigation/AppNavigator';
import AuthTester from './src/utils/AuthTester';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0066CC',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#333333',
    border: '#E0E0E0',
    notification: '#FF3B30',
  },
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const navigationRef = useRef(null);
  const [showAuthTester, setShowAuthTester] = useState(false);
  
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

  if (showAuthTester) {
    return (
      <SafeAreaProvider>
        <AuthProvider>
          <View style={{ flex: 1 }}>
            <AuthTester />
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setShowAuthTester(false)}
            >
              <Text style={styles.backButtonText}>Back to App</Text>
            </TouchableOpacity>
          </View>
        </AuthProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FirebaseAuthProvider>
          <ConfirmationResultProvider>
            <FavoritesProvider>
              <LocationProvider>
                <NavigationContainer theme={MyTheme}>
                  <StatusBar style="auto" />
                  <AppNavigator />
                </NavigationContainer>
                <View style={styles.testerContainer}>
                  <TouchableOpacity
                    style={styles.testerButton}
                    onPress={() => setShowAuthTester(true)}
                  >
                    <Text style={styles.testerButtonText}>Auth Tester</Text>
                  </TouchableOpacity>
                </View>
              </LocationProvider>
            </FavoritesProvider>
          </ConfirmationResultProvider>
        </FirebaseAuthProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  testerContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  testerButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  testerButtonText: {
    color: 'white',
    fontSize: 12,
  },
  backButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: '#0066CC',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
