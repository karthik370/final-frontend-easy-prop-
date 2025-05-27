import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { SERVER_URL } from '../config/ip-config';
import { AuthContext } from '../context/AuthContext';

const NotificationsScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allRead, setAllRead] = useState(true);

  useEffect(() => {
    if (userToken) {
      fetchNotifications();
    } else {
      setIsLoading(false);
    }
  }, [userToken]);

  // Add a focus listener to refresh data when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userToken) {
        fetchNotifications();
      }
    });

    return unsubscribe;
  }, [navigation, userToken]);

  const fetchNotifications = async () => {
    if (!userToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`${SERVER_URL}/api/notifications`);
      setNotifications(response.data);
      
      // Check if there are any unread notifications
      const hasUnread = response.data.some(notification => !notification.read);
      setAllRead(!hasUnread);
      
      setIsLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Fetch notifications error:', error);
      setIsLoading(false);
      setRefreshing(false);
      
      // Use mock data for demo
      const mockData = getMockNotifications();
      setNotifications(mockData);
      
      // Check if there are any unread notifications in mock data
      const hasUnread = mockData.some(notification => !notification.read);
      setAllRead(!hasUnread);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (notificationId) => {
    try {
      // Update locally first for better UX
      const updatedNotifications = notifications.map(notification => {
        if (notification._id === notificationId) {
          return { ...notification, read: true };
        }
        return notification;
      });
      
      setNotifications(updatedNotifications);
      
      // Check if all notifications are now read
      const hasUnread = updatedNotifications.some(notification => !notification.read);
      setAllRead(!hasUnread);
      
      // Make API call to update on server
      await axios.put(`${SERVER_URL}/api/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Mark notification as read error:', error);
      // Revert changes if server update fails
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      // Update locally first for better UX
      const updatedNotifications = notifications.map(notification => ({
        ...notification,
        read: true,
      }));
      
      setNotifications(updatedNotifications);
      setAllRead(true);
      
      // Make API call to update on server
      await axios.put(`${SERVER_URL}/api/notifications/read-all`);
      
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      // Revert changes if server update fails
      fetchNotifications();
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const handleNotificationPress = (notification) => {
    // Mark as read when a notification is pressed
    if (!notification.read) {
      markAsRead(notification._id);
    }
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'property_view':
      case 'property_favorite':
      case 'property_inquiry':
      case 'property_update':
        navigation.navigate('MyPropertyDetails', { propertyId: notification.propertyId });
        break;
      case 'user_message':
        navigation.navigate('Messages', { contactId: notification.senderId });
        break;
      case 'system':
      default:
        // For system notifications, just mark as read
        break;
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      // Remove from UI immediately for better UX
      setNotifications(notifications.filter(item => item._id !== notificationId));
      
      // Make API call to delete on server
      await axios.delete(`${SERVER_URL}/api/notifications/${notificationId}`);
    } catch (error) {
      console.error('Delete notification error:', error);
      // Revert changes if server update fails
      fetchNotifications();
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const handleLongPress = (notification) => {
    Alert.alert(
      'Notification Options',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: notification.read ? 'Mark as Unread' : 'Mark as Read',
          onPress: () => {
            if (notification.read) {
              // This functionality isn't typically included, but could be implemented
              Alert.alert('Feature not available', 'Marking as unread is not supported');
            } else {
              markAsRead(notification._id);
            }
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteNotification(notification._id),
        },
      ]
    );
  };

  // Mock data function for demo purposes
  const getMockNotifications = () => {
    const now = new Date();
    return [
      {
        _id: '1',
        type: 'property_view',
        title: 'Property Viewed',
        message: 'Your property "3 BHK Apartment in Whitefield" has been viewed 5 times in the last 24 hours.',
        propertyId: '1',
        read: false,
        createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      },
      {
        _id: '2',
        type: 'property_favorite',
        title: 'New Favorite',
        message: 'Someone added your property "2 BHK Independent House" to their favorites.',
        propertyId: '2',
        read: true,
        createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      },
      {
        _id: '3',
        type: 'user_message',
        title: 'New Message',
        message: 'You have a new message from John regarding your property.',
        senderId: 'user123',
        read: false,
        createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      },
      {
        _id: '4',
        type: 'system',
        title: 'Welcome to Esay RealEstate',
        message: 'Thank you for joining Esay RealEstate. Start exploring properties or list your own!',
        read: true,
        createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      },
      {
        _id: '5',
        type: 'property_inquiry',
        title: 'Property Inquiry',
        message: 'Someone is interested in your property "1200 sq.ft Commercial Space" and has sent an inquiry.',
        propertyId: '3',
        read: true,
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      },
    ];
  };

  // Render notification item
  const renderNotificationItem = ({ item }) => {
    const getNotificationIcon = () => {
      switch (item.type) {
        case 'property_view':
          return 'eye';
        case 'property_favorite':
          return 'heart';
        case 'property_inquiry':
        case 'user_message':
          return 'chatbubble';
        case 'property_update':
          return 'home';
        case 'system':
        default:
          return 'notifications';
      }
    };

    const getIconBackground = () => {
      switch (item.type) {
        case 'property_view':
          return '#0066cc'; // Blue
        case 'property_favorite':
          return '#ff6666'; // Red
        case 'property_inquiry':
        case 'user_message':
          return '#25d366'; // Green
        case 'property_update':
          return '#f39c12'; // Amber
        case 'system':
        default:
          return '#8e44ad'; // Purple
      }
    };

    const formatTime = (dateString) => {
      const now = new Date();
      const date = new Date(dateString);
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) {
        return 'Just now';
      }
      
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) {
        return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
      }
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
      }
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
      }
      
      return date.toLocaleDateString();
    };

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: getIconBackground() }]}>
          <Ionicons name={getNotificationIcon()} size={22} color="#fff" />
        </View>
        
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, !item.read && styles.unreadText]}>
            {item.title}
          </Text>
          
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          
          <Text style={styles.notificationTime}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
        
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  // If not logged in, show login prompt
  if (!userToken) {
    return (
      <View style={styles.loginPromptContainer}>
        <Ionicons name="notifications" size={80} color="#ddd" />
        <Text style={styles.loginPromptTitle}>No Notifications</Text>
        <Text style={styles.loginPromptText}>
          Sign in to receive notifications about your properties and activities
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('ProfileTab')}
        >
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state
  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="notifications-outline" size={80} color="#ddd" />
        <Text style={styles.emptyTitle}>No Notifications Yet</Text>
        <Text style={styles.emptyText}>
          You'll see notifications about your properties and activities here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {!allRead && (
          <TouchableOpacity 
            style={styles.markAllReadButton}
            onPress={markAllAsRead}
          >
            <Text style={styles.markAllReadText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderNotificationItem}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loginPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  loginPromptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  loginPromptText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  markAllReadButton: {
    padding: 5,
  },
  markAllReadText: {
    color: '#0066cc',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadItem: {
    backgroundColor: '#f0f8ff',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0066cc',
    alignSelf: 'center',
  },
});

export default NotificationsScreen;
