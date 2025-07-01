import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import { SERVER_URL } from '../config/ip-config';

// Components
import PropertyCard from '../components/PropertyCard';

const HomeScreen = ({ navigation }) => {
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('All'); // 'All', 'Buy', 'Rent', 'PG'
  const [error, setError] = useState(null);

  // Fetch properties from the backend
  const fetchProperties = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log(`Fetching properties from: ${SERVER_URL}/api/properties`);

      const response = await axios.get(`${SERVER_URL}/api/properties`, {
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('API Response status:', response.status);

      if (response.data && Array.isArray(response.data)) {
        console.log('Properties fetched successfully:', response.data.length);
        setProperties(response.data);
      } else if (response.data && response.data.properties && Array.isArray(response.data.properties)) {
        // Alternative response format: { properties: [...] }
        console.log('Properties fetched successfully:', response.data.properties.length);
        setProperties(response.data.properties);
      } else {
        console.error('Unexpected response format:', response.data);
        setError('Received unexpected data format from server');
        setProperties([]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');

      let errorMessage = 'Could not fetch properties from the server.';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Error loading properties: timeout of 30000ms exceeded. Check your network connection and API server.';
      }

      setError(errorMessage);
      setProperties([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load properties based on selected category
  const loadFilteredProperties = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Convert UI category to backend category (Buy → Sell)
      let categoryParam = '';
      if (category === 'Buy') {
        categoryParam = 'Sell';
      } else if (category === 'Rent') {
        categoryParam = 'Rent';
      }

      const requestConfig = {
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      // Special handling for PG/Hostels category
      if (category === 'PG') {
        try {
          console.log(`Fetching PG properties from: ${SERVER_URL}/api/properties/pg`);
          const response = await axios.get(`${SERVER_URL}/api/properties/pg`, requestConfig);

          console.log('PG API Response status:', response.status);

          if (response.data && Array.isArray(response.data)) {
            console.log('PG properties fetched successfully:', response.data.length);
            setProperties(response.data);
          } else if (response.data && response.data.properties && Array.isArray(response.data.properties)) {
            setProperties(response.data.properties);
          } else {
            // Special handling for PG response format error
            console.error('Unexpected PG response format:', response.data);

            // If the response is an object but not an array, try to extract properties from it
            if (response.data && typeof response.data === 'object') {
              try {
                // Convert object to array if it follows a certain pattern
                if (response.data._id === 'pg') {
                  // Create an array with a single object for PG listing
                  const pgArray = [{
                    _id: response.data._id || 'pg-listing',
                    title: response.data.title || 'PG/Hostel Listing',
                    description: response.data.description || 'PG accommodation available',
                    price: response.data.price || 0,
                    category: 'PG',
                    propertyType: response.data.propertyType || 'PG/Hostel',
                    images: response.data.images || [],
                    location: response.data.location || {},
                    owner: response.data.owner || {},
                    createdAt: response.data.createdAt || new Date().toISOString()
                  }];

                  setProperties(pgArray);
                  console.log('Converted PG object to array format');
                } else {
                  setProperties([]);
                }
              } catch (conversionError) {
                console.error('Error converting PG data:', conversionError);
                setProperties([]);
              }
            } else {
              setProperties([]);
              setError('Failed to load PG/Hostel properties');
            }
          }
        } catch (error) {
          console.error('Error fetching PG properties:', error);
          console.error('Error details:', error.response ? error.response.data : 'No response data');
          setProperties([]);

          let errorMessage = 'Failed to load PG/Hostel properties';
          if (error.code === 'ECONNABORTED') {
            errorMessage = 'Error loading properties: timeout of 30000ms exceeded. Check your network connection and API server.';
          }

          setError(errorMessage);
        }
      } else if (category !== 'All') {
        // Fetch properties with category filter
        try {
          console.log(`Fetching ${category} properties from: ${SERVER_URL}/api/properties?category=${categoryParam}`);
          const response = await axios.get(`${SERVER_URL}/api/properties?category=${categoryParam}`, requestConfig);

          console.log(`${category} API Response status:`, response.status);

          if (response.data && Array.isArray(response.data)) {
            console.log(`${category} properties fetched successfully:`, response.data.length);
            setProperties(response.data);
          } else if (response.data && response.data.properties && Array.isArray(response.data.properties)) {
            setProperties(response.data.properties);
          } else {
            console.error(`Unexpected ${category} response format:`, response.data);
            setProperties([]);
            setError(`Failed to load ${category} properties`);
          }
        } catch (error) {
          console.error(`Error fetching ${category} properties:`, error);
          console.error('Error details:', error.response ? error.response.data : 'No response data');
          setProperties([]);

          let errorMessage = `Failed to load ${category} properties`;
          if (error.code === 'ECONNABORTED') {
            errorMessage = 'Error loading properties: timeout of 30000ms exceeded. Check your network connection and API server.';
          }

          setError(errorMessage);
        }
      } else {
        // Fetch all properties
        fetchProperties();
      }
    } catch (error) {
      console.error('Error in loadFilteredProperties:', error);
      setProperties([]);
      setError('Error loading properties');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [category, fetchProperties]);

  // Initial data fetch
  useEffect(() => {
    loadFilteredProperties();

    // Add event listener for when the app comes back to foreground
    const unsubscribe = navigation.addListener('focus', () => {
      loadFilteredProperties();
    });

    return unsubscribe;
  }, [loadFilteredProperties, navigation]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFilteredProperties();
  }, [loadFilteredProperties]);

  // Navigate to category-specific properties
  const navigateToCategoryProperties = (selectedCategory) => {
    navigation.navigate('PropertyListing', {
      category: selectedCategory,
      title: selectedCategory === 'Buy'
        ? 'Properties for Sale'
        : selectedCategory === 'Rent'
          ? 'Properties for Rent'
          : 'PG/Hostels'
    });
  };

  // Navigate to map view
  const navigateToMapView = () => {
    navigation.navigate('ViewMap', {
      category: category,
      viewMode: 'map'
    });
  };

  // Navigate to add property screen
  const navigateToAddProperty = () => {
    navigation.navigate('AddPropertyTab');
  };

  return (
    <View style={styles.container}>
      {/* Category Buttons at the Top */}
      <View style={styles.categoryContainer}>
        <View style={styles.categoryRow}>

        <TouchableOpacity
            style={styles.serviceButton}
            onPress={navigateToMapView}
          >
            <View style={styles.serviceIcon}>
              <Ionicons name="location" size={40} color="#0066cc" />
            </View>
            <Text style={styles.serviceText}>Nearby Properties</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryButton}
            onPress={() => navigateToCategoryProperties('Buy')}
          >
            <View style={[styles.categoryIcon, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="home" size={28} color="#fff" />
            </View>
            <Text style={styles.categoryTitle}>Buy Properties</Text>
            <Text style={styles.categorySubtitle}>Find properties</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryButton}
            onPress={() => navigateToCategoryProperties('Rent')}
          >
            <View style={[styles.categoryIcon, { backgroundColor: '#2196F3' }]}>
              <Ionicons name="key" size={28} color="#fff" />
            </View>
            <Text style={styles.categoryTitle}>Search for Rent</Text>
            <Text style={styles.categorySubtitle}>Explore rentals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryButton}
            onPress={() => navigateToCategoryProperties('PG')}
          >
            <View style={[styles.categoryIcon, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="bed" size={28} color="#fff" />
            </View>
            <Text style={styles.categoryTitle}>PGs/Hostels</Text>
            <Text style={styles.categorySubtitle}>Find accommodation</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Properties Section */}
      <View style={[styles.featuredPropertiesContainer, { flex: 2, minHeight: 350 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Properties</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PropertyListing')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Properties List */}
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0066cc" />
            <Text style={styles.loadingText}>Loading properties...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#ff6b6b" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRefresh}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : properties.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="home-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No properties found</Text>
            <Text style={styles.emptySubtext}>
              There are no properties available at the moment.
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={properties
              .slice()
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 5)} // Show 5 most recently added properties
            renderItem={({ item }) => (
              <PropertyCard
                property={item}
                onPress={() => navigation.navigate('PropertyDetails', { property: item })}
              />
            )}
            keyExtractor={item => item._id || Math.random().toString()}
            contentContainerStyle={styles.propertiesList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListFooterComponent={
              <View style={{ height: 20 }} /> // Add some space at the bottom
            }
          />
        )}
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#fff" />
          <Text style={styles.errorBannerText}>
            Error fetching properties: timeout of 30000ms exceeded
          </Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Ionicons name="close-circle" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const { width } = Dimensions.get('window');
const cardWidth = width - 30;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#0e2445',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  titleContainer: {
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f3b141',
  },
  tagline: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
  },
  categoryContainer: {
    paddingVertical: 20,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap:10
  },
  categoryButton: {
    alignItems: 'center',
    width: width / 3 - 20,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  categorySubtitle: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
  },
  featuredPropertiesContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 15,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#0066cc',
  },
  propertiesList: {
    paddingBottom: 20,
  },
  propertyCard: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  propertyImageContainer: {
    position: 'relative',
    height: 230,
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  propertyCategory: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 102, 204, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  propertyCategoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  propertyDetails: {
    padding: 15,
  },
  propertyPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 5,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  propertyLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  propertyLocation: {
    fontSize: 14,
    color: '#777',
    marginLeft: 5,
    flex: 1,
  },
  propertyFeaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 5,
  },
  propertyFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  propertyFeatureText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 5,
  },
  serviceButton: {
    alignItems: 'center',
    width: width / 4 - 15,
  },
  serviceIcon: {
    width: 50,
    height: 50,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',

  
  },
  serviceText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 15,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 15,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  // Removed addPropertyButton styles
  errorBanner: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: '#ff6b6b',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBannerText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    marginHorizontal: 10,
  },
});

export default HomeScreen;
