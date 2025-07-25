import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../config/api';
import axios from 'axios';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class ExpoNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  // Initialize notification services
  async init(onNotificationReceived, onNotificationResponse) {
    // Check if device can receive notifications
    if (!Device.isDevice) {
      console.log('Notifications not available on simulator/emulator');
      return false;
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for notifications!');
      return false;
    }

    // Get push token
    try {
      const token = await this.registerForPushNotificationsAsync();
      this.expoPushToken = token;
      console.log('Expo push token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
      return false;
    }

    // Set up notification listeners
    this.notificationListener = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Notification received:', notification);
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );

    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      response => {
        console.log('Notification response:', response);
        if (onNotificationResponse) {
          onNotificationResponse(response);
        }
      }
    );

    return true;
  }

  // Clean up notification listeners
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Register device for push notifications
  async registerForPushNotificationsAsync() {
    let token;
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for notifications!');
        return null;
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

  // Register token with server
  async registerWithServer(userToken) {
    if (!this.expoPushToken || !userToken) return;

    try {
      await axios.post(
        `${SERVER_URL}/api/notifications/register-device`,
        { pushToken: this.expoPushToken },
        {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Device registered for notifications with server');
    } catch (error) {
      console.error('Error registering device with server:', error);
    }
  }

  // Send local notification
  async sendLocalNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Show immediately
    });
  }

  // Handle new message notification
  async handleNewMessageNotification(message, sender, propertyTitle) {
    const title = `New message from ${sender.name}`;
    const body = message.length > 50 ? message.substring(0, 47) + '...' : message;
    
    await this.sendLocalNotification(title, body, {
      type: 'new_message',
      senderId: sender._id,
      senderName: sender.name,
      propertyTitle,
      message
    });
  }

  // Handle property inquiry notification
  async handlePropertyInquiryNotification(inquirer, propertyTitle) {
    const title = 'New Property Inquiry';
    const body = `${inquirer.name} is interested in your property: ${propertyTitle}`;
    
    await this.sendLocalNotification(title, body, {
      type: 'property_inquiry',
      inquirerId: inquirer._id,
      inquirerName: inquirer.name,
      propertyTitle
    });
  }

  // New reliable registration function
  async registerPushToken() {
    const userToken = await AsyncStorage.getItem('userToken');
    if (!userToken) {
      console.log('No user token found, skipping push token registration');
      return;
    }
    await this.registerForPushNotifications(userToken);
  }

  // Register for push notifications and return the token
  async registerForPushNotifications(userToken) {
    if (!Device.isDevice) {
      console.log('Push notifications are not available on emulators/simulators');
      return null;
    }

    try {
      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token: permission not granted');
        return null;
      }

      // Get push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      this.expoPushToken = token.data;
      console.log('Push token:', token.data);

      // Register with platform
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // Register with our backend if user is logged in
      if (userToken) {
        await this.registerWithBackend(userToken);
      }

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  // Register the device token with our backend
  async registerWithBackend(userToken) {
    if (!this.expoPushToken || !userToken) {
      console.log('Cannot register with backend: missing token or user authentication');
      return;
    }

    try {
      const response = await axios.post(
        `${SERVER_URL}/api/notifications/register-device`,
        { pushToken: this.expoPushToken },
        {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Device registered with backend:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error registering device with backend:', error);
      return null;
    }
  }

  // Set up notification listeners
  setupNotificationListeners(onNotification, onNotificationResponse) {
    // This listener is fired whenever a notification is received while the app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Notification received in foreground:', notification);
        if (onNotification) {
          onNotification(notification);
        }
      }
    );

    // This listener is fired whenever a user taps on or interacts with a notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      response => {
        console.log('Notification response received:', response);
        if (onNotificationResponse) {
          onNotificationResponse(response);
        }
      }
    );

    return () => {
      this.removeNotificationListeners();
    };
  }

  // Remove notification listeners
  removeNotificationListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  // Schedule a local notification
  async scheduleLocalNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // null means show immediately
    });
  }

  // Clean up all resources
  cleanup() {
    this.removeNotificationListeners();
    this.expoPushToken = null;
  }
}

export default new ExpoNotificationService();
