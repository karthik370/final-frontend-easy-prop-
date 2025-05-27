import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axios from 'axios';
import { SERVER_URL } from '../config/ip-config';
import * as Location from 'expo-location';

const SearchProperties = ({ route, navigation }) => {
  const { category = 'All', viewMode = 'list' } = route.params || {};
  const [searchQuery, setSearchQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const mapRef = useRef(null);
  
  // Get category param for API (Buy -> Sell)
  const getCategoryParam = () => {
    if (category === 'Buy') return 'Sell';
    if (category === 'Rent') return 'Rent';
    if (category === 'PG') return 'PG';
    return '';
  };

  // Fetch properties based on category
  const fetchProperties = async () => {
    try {
      setIsLoading(true);
      
      const categoryParam = getCategoryParam();
      let url = `${SERVER_URL}/api/properties`;
      
      // Special handling for PG/Hostels category
      if (category === 'PG') {
        url = `${SERVER_URL}/api/properties/pg`;
      } else if (categoryParam) {
        url = `${SERVER_URL}/api/properties?category=${categoryParam}`;
      }
      
      console.log(`Fetching properties from: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      let propertiesData = [];
      
      if (response.data && Array.isArray(response.data)) {
        propertiesData = response.data;
      } else if (response.data && response.data.properties && Array.isArray(response.data.properties)) {
        propertiesData = response.data.properties;
      } else {
        console.error('Unexpected response format:', response.data);
        Alert.alert('Data Error', 'Received unexpected data format from server');
      }
      
      // Filter out properties without valid location data
      const validProperties = propertiesData.filter(
        prop => prop.location && prop.location.coordinates && 
        prop.location.coordinates.length === 2 &&
        !isNaN(prop.location.coordinates[0]) && 
        !isNaN(prop.location.coordinates[1])
      );
      
      if (validProperties.length === 0 && propertiesData.length > 0) {
        Alert.alert(
          'Location Data Missing',
          'Some properties do not have valid location data and cannot be shown on the map.'
        );
      }
      
      setProperties(validProperties);
    } catch (error) {
      console.error('Error fetching properties:', error);
      
      Alert.alert(
        'Error loading properties',
        `Error fetching properties: timeout of 30000ms exceeded. Check your network connection and API server.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch location suggestions from Google Places API
  const fetchLocationSuggestions = async (query) => {
    if (!query || query.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    try {
      const response = await Location.geocodeAsync(query);
      if (response && response.length > 0) {
        // Get reverse geocoding results for better display names
        const results = await Promise.all(
          response.slice(0, 5).map(async (location) => {
            try {
              const reverseGeocode = await Location.reverseGeocodeAsync({
                latitude: location.latitude,
                longitude: location.longitude
              });
              
              if (reverseGeocode && reverseGeocode.length > 0) {
                const place = reverseGeocode[0];
                return {
                  id: `${location.latitude}-${location.longitude}`,
                  name: [
                    place.name,
                    place.street,
                    place.district,
                    place.city,
                    place.region,
                    place.country
                  ].filter(Boolean).join(', '),
                  latitude: location.latitude,
                  longitude: location.longitude
                };
              }
              return null;
            } catch (error) {
              console.error('Error in reverse geocoding:', error);
              return null;
            }
          })
        );
        
        const filteredResults = results.filter(Boolean);
        setLocationSuggestions(filteredResults);
        setShowSuggestions(filteredResults.length > 0);
      } else {
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle location selection
  const handleLocationSelect = (location) => {
    setSearchQuery(location.name);
    setShowSuggestions(false);
    
    // Update map region
    const newRegion = {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02
    };
    
    setRegion(newRegion);
    
    // Animate map to new region
    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  };

  // Get user's current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show your current location on the map.');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Update map region
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      };
      
      setRegion(newRegion);
      
      // Animate map to new region
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please check your device settings.');
    }
  };

  // Initialize and fetch properties
  useEffect(() => {
    fetchProperties();
    
    // Get user's location on initial load
    getCurrentLocation();
  }, [category]);

  return (
    <View style={styles.container}>
      {/* Header with back button and title */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#0066cc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Map View</Text>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a location..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              fetchLocationSuggestions(text);
            }}
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setLocationSuggestions([]);
                setShowSuggestions(false);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        {/* Location Suggestions */}
        {showSuggestions && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={locationSuggestions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleLocationSelect(item)}
                >
                  <Ionicons name="location" size={18} color="#0066cc" />
                  <Text style={styles.suggestionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>
      
      {/* Map View */}
      <View style={styles.mapContainer}>
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0066cc" />
            <Text style={styles.loadingText}>Loading properties...</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
          >
            {properties.map((property) => {
              // Check if property has valid location data
              if (
                property.location &&
                property.location.coordinates &&
                property.location.coordinates.length === 2 &&
                !isNaN(property.location.coordinates[0]) &&
                !isNaN(property.location.coordinates[1])
              ) {
                // MongoDB stores coordinates as [longitude, latitude]
                const longitude = property.location.coordinates[0];
                const latitude = property.location.coordinates[1];
                
                return (
                  <Marker
                    key={property._id}
                    coordinate={{ latitude, longitude }}
                    title={property.title}
                    description={`${property.propertyType} - ₹${property.price}`}
                    onCalloutPress={() => navigation.navigate('PropertyDetails', { property })}
                  />
                );
              }
              return null;
            })}
          </MapView>
        )}
        
        {/* Current Location Button */}
        <TouchableOpacity 
          style={styles.currentLocationButton}
          onPress={getCurrentLocation}
        >
          <Ionicons name="locate" size={24} color="#0066cc" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
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
    marginRight: 30,
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    borderRadius: 25,
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    marginTop: 5,
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 20,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: Dimensions.get('window').width,
    height: '100%',
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
  currentLocationButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default SearchProperties;
