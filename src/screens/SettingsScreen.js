import React, { useState, useContext, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { SERVER_URL } from '../config/ip-config';
import { CommonActions } from '@react-navigation/native';

const SettingsScreen = ({ navigation }) => {
  const { userToken, user, logout } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  
  // App Settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [locationTrackingEnabled, setLocationTrackingEnabled] = useState(true);
  const [saveSearchHistory, setSaveSearchHistory] = useState(true);
  
  // Account Settings
  const [showPhoneNumber, setShowPhoneNumber] = useState(true);
  const [showEmailAddress, setShowEmailAddress] = useState(false);
  const [allowMessages, setAllowMessages] = useState(true);
  
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Load settings from AsyncStorage
      const storedSettings = await AsyncStorage.getItem('userSettings');
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        setNotificationsEnabled(settings.notificationsEnabled !== undefined ? settings.notificationsEnabled : true);
        setEmailAlertsEnabled(settings.emailAlertsEnabled !== undefined ? settings.emailAlertsEnabled : true);
        setLocationTrackingEnabled(settings.locationTrackingEnabled !== undefined ? settings.locationTrackingEnabled : true);
        setSaveSearchHistory(settings.saveSearchHistory !== undefined ? settings.saveSearchHistory : true);
        
        // Account privacy settings
        setShowPhoneNumber(settings.showPhoneNumber !== undefined ? settings.showPhoneNumber : true);
        setShowEmailAddress(settings.showEmailAddress !== undefined ? settings.showEmailAddress : false);
        setAllowMessages(settings.allowMessages !== undefined ? settings.allowMessages : true);
      }
      
      // If user is logged in, try to fetch settings from API too
      if (userToken) {
        try {
          const response = await axios.get(`${SERVER_URL}/api/users/settings`);
          const userSettings = response.data;
          
          // Update state with user settings from API if available
          if (userSettings) {
            setShowPhoneNumber(userSettings.showPhoneNumber !== undefined ? userSettings.showPhoneNumber : showPhoneNumber);
            setShowEmailAddress(userSettings.showEmailAddress !== undefined ? userSettings.showEmailAddress : showEmailAddress);
            setAllowMessages(userSettings.allowMessages !== undefined ? userSettings.allowMessages : allowMessages);
            setEmailAlertsEnabled(userSettings.emailAlertsEnabled !== undefined ? userSettings.emailAlertsEnabled : emailAlertsEnabled);
          }
        } catch (error) {
          console.log('Error fetching user settings from API:', error);
          // Continue with local settings if API fails
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.log('Error loading settings:', error);
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // Save to AsyncStorage
      const settings = {
        notificationsEnabled,
        emailAlertsEnabled,
        locationTrackingEnabled,
        saveSearchHistory,
        showPhoneNumber,
        showEmailAddress,
        allowMessages,
      };
      
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
      
      // If logged in, save account settings to API
      if (userToken) {
        try {
          await axios.put(`${SERVER_URL}/api/users/settings`, {
            showPhoneNumber,
            showEmailAddress,
            allowMessages,
            emailAlertsEnabled,
          });
        } catch (error) {
          console.log('Error saving settings to API:', error);
          // Continue saving locally even if API fails
        }
      }
      
      setIsLoading(false);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.log('Error saving settings:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const clearSearchHistory = () => {
    Alert.alert(
      'Clear Search History',
      'Are you sure you want to clear your search history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              // Clear search history from AsyncStorage
              await AsyncStorage.removeItem('searchHistory');
              
              // If logged in, clear from API too
              if (userToken) {
                try {
                  await axios.delete(`${SERVER_URL}/api/users/search-history`, {
                    headers: {
                      Authorization: `Bearer ${userToken}`,
                    },
                  });
                } catch (error) {
                  console.log('Error clearing search history from API:', error);
                }
              }
              
              setIsLoading(false);
              Alert.alert('Success', 'Search history cleared');
            } catch (error) {
              console.log('Error clearing search history:', error);
              setIsLoading(false);
              Alert.alert('Error', 'Failed to clear search history');
            }
          },
        },
      ]
    );
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              if (userToken) {
                await axios.delete(`${SERVER_URL}/api/users`, {
                  headers: {
                    Authorization: `Bearer ${userToken}`,
                  },
                });
                
                // Clear local storage
                await AsyncStorage.clear();
                
                // Navigate to welcome screen first, then logout
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Welcome' }],
                  })
                );
                
                // Logout after navigation
                logout();
                
                Alert.alert('Account Deleted', 'Your account has been successfully deleted');
              }
              setIsLoading(false);
            } catch (error) {
              console.log('Error deleting account:', error);
              setIsLoading(false);
              Alert.alert('Error', 'Failed to delete account. Please try again later.');
            }
          },
        },
      ]
    );
  };
  
  // Setting toggle component to reduce repetition
  const SettingToggle = ({ title, subtitle, value, onValueChange }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e0e0e0', true: '#a3d3ff' }}
        thumbColor={value ? '#0066cc' : '#f4f3f4'}
        ios_backgroundColor="#e0e0e0"
      />
    </View>
  );

  // Setting action component for items that navigate or perform actions
  const SettingAction = ({ title, subtitle, iconName, iconColor, onPress }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {iconName ? (
        <Ionicons name={iconName} size={22} color={iconColor || '#666'} />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#999" />
      )}
    </TouchableOpacity>
  );

  // Section header component
  const SectionHeader = ({ title }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* App Preferences */}
      <SectionHeader title="App Preferences" />
      <View style={styles.settingsGroup}>
        <SettingToggle
          title="Push Notifications"
          subtitle="Receive notifications about property updates"
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
        />
        
        <SettingToggle
          title="Email Alerts"
          subtitle="Get relevant property updates via email"
          value={emailAlertsEnabled}
          onValueChange={setEmailAlertsEnabled}
        />
      </View>

      {/* Privacy Settings */}
      <SectionHeader title="Privacy Settings" />
      <View style={styles.settingsGroup}>
        <SettingToggle
          title="Location Services"
          subtitle="Enable location-based property search"
          value={locationTrackingEnabled}
          onValueChange={setLocationTrackingEnabled}
        />
        
        <SettingToggle
          title="Save Search History"
          subtitle="Remember your recent searches"
          value={saveSearchHistory}
          onValueChange={setSaveSearchHistory}
        />
        
        <SettingAction
          title="Clear Search History"
          subtitle="Remove all your saved searches"
          iconName="trash-outline"
          iconColor="#e74c3c"
          onPress={clearSearchHistory}
        />
      </View>

      {/* Account Settings (only if logged in) */}
      {userToken && (
        <>
          <SectionHeader title="Account Settings" />
          <View style={styles.settingsGroup}>
            <SettingToggle
              title="Show Phone Number"
              subtitle="Display your phone number on property listings"
              value={showPhoneNumber}
              onValueChange={setShowPhoneNumber}
            />
            
            <SettingToggle
              title="Show Email Address"
              subtitle="Display your email on property listings"
              value={showEmailAddress}
              onValueChange={setShowEmailAddress}
            />
            
            <SettingToggle
              title="Allow Messages"
              subtitle="Let users contact you via in-app messaging"
              value={allowMessages}
              onValueChange={setAllowMessages}
            />
            
            <SettingAction
              title="Delete Account"
              subtitle="Permanently remove your account and all data"
              iconName="warning-outline"
              iconColor="#e74c3c"
              onPress={deleteAccount}
            />
          </View>
        </>
      )}

      {/* About and Support */}
      <SectionHeader title="About & Support" />
      <View style={styles.settingsGroup}>
        <SettingAction
          title="Help Center"
          subtitle="FAQs and troubleshooting guides"
          onPress={() => navigation.navigate('HelpSupport')}
        />
        
        <SettingAction
          title="Contact Support"
          subtitle="Get help from our support team"
          onPress={() => navigation.navigate('HelpSupport')}
        />
        
        <SettingAction
          title="Terms of Service"
          subtitle="Read our terms and conditions"
          onPress={() => navigation.navigate('TermsOfService')}
        />
        
        <SettingAction
          title="Privacy Policy"
          subtitle="Learn how we handle your data"
          onPress={() => navigation.navigate('PrivacyPolicy')}
        />
        
        <SettingAction
          title="About App"
          subtitle="Learn more about our application"
          onPress={() => navigation.navigate('AboutApp')}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
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
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  settingsGroup: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 3,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  saveButton: {
    backgroundColor: '#0066cc',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  versionContainer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#999',
  },
});

export default SettingsScreen;
