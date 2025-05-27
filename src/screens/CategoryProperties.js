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
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { SERVER_URL } from '../config/ip-config';

const CategoryProperties = ({ route, navigation }) => {
  const { category, title } = route.params || {};
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch properties based on selected category
  const fetchCategoryProperties = useCallback(async () => {
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
      if (category === 'PG/Hostels' || category === 'PG') {
        try {
          // Use main properties endpoint with propertyType filter
          console.log(`Fetching PG properties from: ${SERVER_URL}/api/properties?propertyType=PG`);
          const response = await axios.get(`${SERVER_URL}/api/properties`, {
            ...requestConfig,
            params: {
              propertyType: 'PG'
            }
          });
          
          console.log('PG API Response status:', response.status);
          
          let pgProperties = [];
          
          if (response.data && Array.isArray(response.data)) {
            pgProperties = response.data;
          } else if (response.data && response.data.properties && Array.isArray(response.data.properties)) {
            pgProperties = response.data.properties;
          } else {
            setError('Failed to load PG/Hostel properties');
            setProperties([]);
            setIsLoading(false);
            return;
          }
          
          // Additional filtering to make sure we only get PG/Hostel properties
          const filteredProperties = pgProperties.filter(prop => 
            prop.propertyType === 'PG' || 
            prop.propertyType === 'Hostel' || 
            (prop.title && prop.title.toLowerCase().includes('pg')) ||
            (prop.title && prop.title.toLowerCase().includes('hostel'))
          );
          
          console.log(`PG properties fetched: ${pgProperties.length}, after filtering: ${filteredProperties.length}`);
          setProperties(filteredProperties);
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
      } else {
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
      }
    } catch (error) {
      console.error('Error in fetchCategoryProperties:', error);
      setProperties([]);
      setError('Error loading properties');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  // Initial data fetch
  useEffect(() => {
    fetchCategoryProperties();
  }, [fetchCategoryProperties]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCategoryProperties();
  }, [fetchCategoryProperties]);

  // Navigate to map view
  const navigateToMapView = () => {
    navigation.navigate('SearchProperties', { 
      category: category,
      viewMode: 'map'
    });
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button and Title */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#0066cc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title || `${category} Properties`}</Text>
        
        {/* Map View Button */}
        <TouchableOpacity 
          style={styles.mapViewButton}
          onPress={navigateToMapView}
        >
          <MaterialIcons name="map" size={22} color="#0066cc" />
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
            There are no {category.toLowerCase()} properties available at the moment.
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
          data={properties}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.propertyCard}
              onPress={() => navigation.navigate('PropertyDetails', { property: item })}
            >
              {/* Property Image */}
              <View style={styles.propertyImageContainer}>
                <Image
                  source={
                    item.images && item.images.length > 0
                      ? { uri: item.images[0] }
                      : require('../assets/placeholder-property.jpg')
                  }
                  style={styles.propertyImage}
                  resizeMode="cover"
                />
                <View style={styles.propertyCategory}>
                  <Text style={styles.propertyCategoryText}>
                    {item.category === 'Sell' ? 'For Sale' : 
                     item.category === 'Rent' ? 'For Rent' : 'PG/Hostel'}
                  </Text>
                </View>
              </View>
              
              {/* Property Details */}
              <View style={styles.propertyDetails}>
                <Text style={styles.propertyPrice}>₹{item.price?.toLocaleString() || 'Price on request'}</Text>
                <Text style={styles.propertyTitle} numberOfLines={1}>{item.title || 'Property Title'}</Text>
                
                {/* Location */}
                <View style={styles.propertyLocationContainer}>
                  <Ionicons name="location" size={16} color="#777" />
                  <Text style={styles.propertyLocation} numberOfLines={1}>
                    {item.location?.address || 'Location not specified'}
                  </Text>
                </View>
                
                {/* Property Features */}
                <View style={styles.propertyFeaturesContainer}>
                  {item.bedrooms && (
                    <View style={styles.propertyFeature}>
                      <Ionicons name="bed-outline" size={16} color="#555" />
                      <Text style={styles.propertyFeatureText}>{item.bedrooms} Beds</Text>
                    </View>
                  )}
                  {item.bathrooms && (
                    <View style={styles.propertyFeature}>
                      <Ionicons name="water-outline" size={16} color="#555" />
                      <Text style={styles.propertyFeatureText}>{item.bathrooms} Baths</Text>
                    </View>
                  )}
                  {item.area && (
                    <View style={styles.propertyFeature}>
                      <MaterialIcons name="square-foot" size={16} color="#555" />
                      <Text style={styles.propertyFeatureText}>{item.area} {item.areaUnit || 'sq.ft'}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  mapViewButton: {
    padding: 5,
  },
  propertiesList: {
    padding: 15,
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
    height: 200,
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
});

export default CategoryProperties;
