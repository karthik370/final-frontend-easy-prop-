import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../config/ip-config';
import axios from 'axios';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Initialize notifications with proper permissions
export const initNotifications = async () => {
  try {
    // Check if device is physical (not an emulator/simulator)
    if (Constants.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // If we don't have permission yet, ask for it
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      // Return false if permissions weren't granted
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for notifications!');
        return false;
      }
      
      // Return true if all permissions are granted
      return true;
    } else {
      console.log('Must use physical device for notifications');
      return false;
    }
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return false;
  }
};

// Get Expo push token for this device
export const getExpoToken = async () => {
  try {
    // Check if we've already stored a token
    const existingToken = await AsyncStorage.getItem('expoPushToken');
    if (existingToken) return existingToken;
    
    // Only proceed if we're on a physical device
    if (!Constants.isDevice) {
      console.log('Must use physical device for notifications');
      return null;
    }
    
    // Get a new token
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId
    })).data;
    
    // Store the token for future use
    await AsyncStorage.setItem('expoPushToken', token);
    
    // Set up specific handling for Android
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    // Register token with backend
    try {
      await axios.post(`${SERVER_URL}/api/notifications/register-device`, {
        token,
        platform: Platform.OS
      });
    } catch (error) {
      console.log('Error registering token with backend:', error);
    }
    
    return token;
  } catch (error) {
    console.error('Error getting expo push token:', error);
    return null;
  }
};

// Set up handler for notifications received while app is in foreground
export const setupForegroundNotificationHandler = () => {
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    const { title, body, data } = notification.request.content;
    console.log(`Notification received in foreground: ${title}, ${body}`, data);
    // You can implement custom UI for foreground notifications here
  });
  
  return subscription;
};

// Set up handler for user interaction with notifications
export const setupNotificationResponseHandler = () => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const { title, body, data } = response.notification.request.content;
    console.log(`User interacted with notification: ${title}, ${body}`, data);
    
    // You can implement navigation or other actions based on the notification data
    // Example: if (data.type === 'chat') { navigate to chat screen }
  });
  
  return subscription;
};

// Schedule a local notification
export const scheduleLocalNotification = async (title, body, data = {}, seconds = 1) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: { seconds },
  });
};

// Send a notification to another user via the backend
export const sendNotificationToUser = async (userId, title, body, data = {}) => {
  try {
    await axios.post(`${SERVER_URL}/api/notifications/send`, {
      userId,
      notification: {
        title,
        body,
        data
      }
    });
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};
