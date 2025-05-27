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
// Using centralized SERVER_URL config
import { SERVER_URL } from '../config/ip-config';
import { AuthContext } from '../context/AuthContext';

// Components
import PropertyCard from '../components/PropertyCard';

const FavoritesScreen = ({ navigation }) => {
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const { userToken } = useContext(AuthContext);

  useEffect(() => {
    if (userToken) {
      fetchFavorites();
    } else {
      setIsLoading(false);
    }
  }, [userToken]);

  // Add a focus listener to refresh data when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userToken) {
        fetchFavorites();
      }
    });

    return unsubscribe;
  }, [navigation, userToken]);

  // DIRECT fetch favorites from MongoDB Atlas
  const fetchFavorites = async () => {
    if (!userToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    console.log('DIRECT FETCH: Getting favorites from MongoDB Atlas...');
    
    try {
      // Use SERVER_URL from centralized config for consistency
      const apiUrl = `${SERVER_URL}/api/properties/favorites`;
      console.log('Using centralized SERVER_URL for favorites:', apiUrl);
      
      // Simple fetch request with authentication
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${userToken}` // Add auth token for user-specific favorites
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      // Parse the JSON response directly
      const data = await response.json();
      console.log('RAW FAVORITES FROM MONGODB ATLAS:', data);
      
      setFavorites(data);
      setIsLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching favorites:', error.message);
      setIsLoading(false);
      setRefreshing(false);
      // No mock data - just show empty state
      setFavorites([]);
      Alert.alert('Connection Error', 'Could not retrieve your favorites. Please check your connection and try again.');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const removeFavorite = async (propertyId) => {
    try {
      // Remove from UI immediately for better UX
      setFavorites(favorites.filter(favorite => favorite._id !== propertyId));
      
      // Make API call to remove from server using centralized SERVER_URL
      await axios.delete(`${SERVER_URL}/api/properties/${propertyId}/favorite`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      Alert.alert('Success', 'Property removed from favorites');
    } catch (error) {
      console.error('Remove favorite error:', error);
      
      // Fetch all favorites again in case of error to ensure UI is in sync
      fetchFavorites();
      Alert.alert('Error', 'Failed to remove from favorites');
    }
  };

  const handleRemove = (propertyId) => {
    Alert.alert(
      'Remove Favorite',
      'Are you sure you want to remove this property from your favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFavorite(propertyId),
        },
      ]
    );
  };

  // Favorites will be fetched only from the server, no mock data

  // If not logged in, show login prompt
  if (!userToken) {
    return (
      <View style={styles.loginPromptContainer}>
        <Ionicons name="heart" size={80} color="#ddd" />
        <Text style={styles.loginPromptTitle}>No Favorites Found</Text>
        <Text style={styles.loginPromptText}>
          Sign in to save and view your favorite properties
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('ProfileTab', { screen: 'Profile' })}
        >
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading your favorites...</Text>
      </View>
    );
  }

  // If logged in but no favorites
  if (favorites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="heart-outline" size={80} color="#ddd" />
        <Text style={styles.emptyTitle}>No Favorites Yet</Text>
        <Text style={styles.emptyText}>
          Tap the heart icon on properties you like to add them to your favorites
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('HomeTab')}
        >
          <Text style={styles.browseButtonText}>Browse Properties</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.favoriteItemContainer}>
            <PropertyCard
              property={item}
              onPress={() => navigation.navigate('FavoritePropertyDetails', { propertyId: item._id })}
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemove(item._id)}
            >
              <Ionicons name="trash-outline" size={18} color="#ff6666" />
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Favorite Properties</Text>
            <Text style={styles.headerCount}>{favorites.length} properties</Text>
          </View>
        }
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
    backgroundColor: '#f8f8f8',
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
    marginBottom: 30,
  },
  browseButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 5,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  favoriteItemContainer: {
    marginBottom: 15,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginHorizontal: 15,
    marginTop: 5,
  },
  removeButtonText: {
    color: '#ff6666',
    fontSize: 14,
    marginLeft: 5,
  },
});

export default FavoritesScreen;
