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
import { FavoritesContext } from '../context/FavoritesContext';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
// Components
import PropertyCard from '../components/PropertyCard';

const FavoritesScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const { favoriteProperties, loading, reloadFavorites } = useContext(FavoritesContext);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh favorites on screen focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userToken) reloadFavorites();
    });
    return unsubscribe;
  }, [navigation, userToken]);

  // Initial fetch on mount
  useEffect(() => {
    if (userToken) reloadFavorites();
  }, [userToken]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await reloadFavorites();
    setRefreshing(false);
  };

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

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading your favorites...</Text>
      </View>
    );
  }

  // If logged in but no favorites
  if (!favoriteProperties || favoriteProperties.length === 0) {
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
        data={favoriteProperties.filter(Boolean)}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.favoriteItemContainer}>
            <PropertyCard
              property={item}
              onPress={() => navigation.navigate('FavoritePropertyDetails', { propertyId: item._id })}
            />
            {/* Optionally, add a remove button here if you want manual removal */}
          </View>
        )}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Favorite Properties</Text>
            <Text style={styles.headerCount}>{favoriteProperties.length} properties</Text>
          </View>
        }
      />
      <BannerAd
        size={BannerAdSize.BANNER}
        unitId={TestIds.BANNER} // This is Google's test ad unit ID
        requestOptions={{
          requestNonPersonalizedAdsOnly: false
        }}
        onAdLoaded={() => console.log('Ad loaded successfully')}
        onAdFailedToLoad={(error) => console.log('AdMob error:', error)}
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
