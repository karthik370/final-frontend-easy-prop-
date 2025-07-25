import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';

// Import centralized server configuration
import { SERVER_URL } from '../config/ip-config';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const ProfileScreen = ({ navigation }) => {
  const { user, userToken, logout, setUser } = useContext(AuthContext);
  const [stats, setStats] = useState({
    properties: 0,
    views: 0,
    favorites: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  // Refresh stats whenever the screen is focused
  useEffect(() => {
    if (userToken) {
      fetchUserStats();
    }
  }, [userToken]);

  // Add focus listener to refresh data whenever screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userToken) {
        console.log('ProfileScreen focused - refreshing user stats and profile');
        fetchUserStats();
        fetchUserProfile();
      }
    });

    return unsubscribe;
  }, [navigation, userToken]);

  // Add a useEffect to log the current user data
  useEffect(() => {
    if (user) {
      console.log('ProfileScreen - Current user data:', user);
    }
  }, [user]);

  // Fetch user stats from server
  const fetchUserStats = async () => {
    if (!userToken) {
      return; // Don't fetch if not logged in
    }

    setIsLoading(true);
    console.log('Fetching user stats...');

    try {
      // Use the correct endpoint for user stats
      const response = await axios.get(`${SERVER_URL}/api/user-settings/stats`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.data) {
        console.log('User stats fetched successfully:', response.data);
        setStats({
          properties: response.data.properties || 0,
          views: response.data.views || 0,
          favorites: response.data.favorites || 0
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);

      // Set empty stats instead of mock data
      setStats({
        properties: 0,
        views: 0,
        favorites: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user profile data
  const fetchUserProfile = async () => {
    if (!userToken) {
      return; // Don't fetch if not logged in
    }

    try {
      const response = await axios.get(`${SERVER_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.data) {
        console.log('User profile fetched successfully:', response.data);
        // Update the user context with fresh data
        if (response.data.email) {
          setUser(prevUser => ({
            ...prevUser,
            ...response.data
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // ✅ FIXED: Removed navigation.reset - just call logout()
  const handleLogout = async () => {
    console.log('Logout button pressed');
    try {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              console.log('Logout confirmed, calling logout function');
              logout(); // ✅ Just call logout - AppNavigator will handle navigation
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error during logout:', error);
      logout(); // ✅ Just call logout
    }
  };

  // If user is not logged in, show login screen
  if (!userToken) {
    return (
      <View style={styles.loginContainer}>
        <Image
          source={{ uri: 'https://via.placeholder.com/200x200?text=Login' }}
          style={styles.loginIllustration}
          resizeMode="contain"
        />
        <Text style={styles.loginTitle}>Welcome to Esay RealEstate</Text>
        <Text style={styles.loginSubtitle}>
          Sign in to manage your properties, save favorites, and more
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('HomeTab')} // ✅ FIXED: Navigate to HomeTab instead of calling logout
        >
          <Text style={styles.loginButtonText}>Sign In / Register</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileContainer}>
          <View style={styles.profileImageContainer}>
            {user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileInitials}>
                  {user?.name?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            {console.log('Rendering email:', user?.email)}
            <Text style={styles.profileDetail}>
              <Ionicons name="mail-outline" size={14} color="#666" />
              {' '}{user?.email || 'No email'}
            </Text>
            <Text style={styles.profileDetail}>
              <Ionicons name="call-outline" size={14} color="#666" />
              {' '}{user?.phone || 'No phone'}
            </Text>
            {user?.bio && (
              <Text style={styles.profileBio} numberOfLines={2}>
                {user.bio}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="create-outline" size={20} color="#0066cc" />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0066cc" />
          </View>
        ) : (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.properties}</Text>
              <Text style={styles.statLabel}>Properties</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.views}</Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.favorites}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
          </View>
        )}
      </View>

      {/* Menu Options */}
      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('MyProperties')}
        >
          <View style={[styles.menuIcon, styles.iconProperties]}>
            <Ionicons name="home" size={22} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>My Properties</Text>
            <Text style={styles.menuSubtitle}>Manage your property listings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('FavoritesTab')}
        >
          <View style={[styles.menuIcon, styles.iconFavorites]}>
            <Ionicons name="heart" size={22} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Favorites</Text>
            <Text style={styles.menuSubtitle}>View your saved properties</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <View style={[styles.menuIcon, styles.iconSettings]}>
            <Ionicons name="settings" size={22} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Settings</Text>
            <Text style={styles.menuSubtitle}>App preferences and account settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('HelpSupport')}
        >
          <View style={[styles.menuIcon, styles.iconHelp]}>
            <Ionicons name="help-circle" size={22} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Help & Support</Text>
            <Text style={styles.menuSubtitle}>FAQs and contact support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AboutApp')}
        >
          <View style={[styles.menuIcon, styles.iconAbout]}>
            <Ionicons name="information-circle" size={22} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>About App</Text>
            <Text style={styles.menuSubtitle}>Version 1.0.0</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.logoutItem]}
          onPress={handleLogout}
        >
          <View style={[styles.menuIcon, styles.iconLogout]}>
            <Ionicons name="log-out" size={22} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.logoutText}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>
      <BannerAd
        size={BannerAdSize.LARGE_BANNER}
        unitId={TestIds.BANNER} // This is Google's test ad unit ID
        requestOptions={{
          requestNonPersonalizedAdsOnly: false
        }}
        onAdLoaded={() => console.log('Ad loaded successfully')}
        onAdFailedToLoad={(error) => console.log('AdMob error:', error)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  loginIllustration: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
  },
  profileContainer: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  profileImageContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  profileImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  profileDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  editProfileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#f0f0f0',
    alignSelf: 'center',
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginTop: 2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconProperties: { backgroundColor: '#0066cc' },
  iconFavorites: { backgroundColor: '#ff6666' },
  iconSettings: { backgroundColor: '#666' },
  iconHelp: { backgroundColor: '#25d366' },
  iconAbout: { backgroundColor: '#8e44ad' },
  iconLogout: { backgroundColor: '#e74c3c' },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 3,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e74c3c',
  },
  profileBio: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
});

export default ProfileScreen;