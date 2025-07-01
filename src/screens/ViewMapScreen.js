import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
  Keyboard
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { SERVER_URL } from '../config/ip-config';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

const ViewMapScreen = ({ route, navigation }) => {
  const { propertyId, location, title, searchQuery, filters, category, viewMode } = route.params || {};
  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [region, setRegion] = useState({
    latitude: location ? location.coordinates[1] : 12.9716,
    longitude: location ? location.coordinates[0] : 77.5946,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [currentLocation, setCurrentLocation] = useState(null); // user's actual location
  const [searchText, setSearchText] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const mapRef = useRef(null);

  // Get current location function
  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const { latitude, longitude } = location.coords;
      
      setCurrentLocation({ latitude, longitude }); // store actual location
      
      // Optionally move map to current location
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      };
      
      setRegion(newRegion);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }

      console.log(`High accuracy location acquired: ${latitude}, ${longitude} (${location.coords.accuracy}m accuracy)`);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please check your device settings.');
    }
  };

  // Force fetch properties when component mounts
  useEffect(() => {
    console.log('ViewMapScreen init with params:', { propertyId, category, viewMode, filters });
    
    // Always fetch all properties to show on map regardless of mode
    fetchAllProperties();
    
    // Request location permissions
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is needed to show your position on the map.');
        } else {
          // Only get current location if NOT focusing on a specific property
          if (!(propertyId && location)) {
            getCurrentLocation();
          }
        }
      } catch (error) {
        console.error('Error requesting location permissions:', error);
      }
    })();
    
    // If we have a specific property, set the map to that location
    if (propertyId && location) {
      // Single property view mode
      console.log('Focusing on specific property on map');
      const newRegion = {
        latitude: location.coordinates[1], 
        longitude: location.coordinates[0],
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      };
      // Update region state to focus on this property
      setRegion(newRegion);
    }

    // Add a cleanup function
    return () => {
      console.log('ViewMapScreen unmounting');
      // Any cleanup needed
    };
  }, []);

  // Fetch ALL properties for the map view without any filters
  const fetchAllProperties = async () => {
    setIsLoading(true);
    console.log('Fetching ALL properties for map view');
    
    try {
      // Using fetch instead of axios to match PropertyListingScreen approach
      const response = await fetch(`${SERVER_URL}/api/properties`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      // Parse the JSON response directly
      const data = await response.json();
      console.log('Response received:', data ? 'Data exists' : 'No data');
      
      if (data && data.properties && Array.isArray(data.properties)) {
        const propertiesData = data.properties;
        console.log(`Fetched ${propertiesData.length} properties from server`);
        
        // Apply any filters if needed
        let filteredProperties = propertiesData;
        
        if (category === 'Buy') {
          // For Buy category, filter to only show 'Sell' properties
          filteredProperties = propertiesData.filter(prop => prop.category === 'Sell');
          console.log(`Filtered to ${filteredProperties.length} properties for sale`);
        } 
        else if (category === 'Rent') {
          filteredProperties = propertiesData.filter(prop => prop.category === 'Rent');
          console.log(`Filtered to ${filteredProperties.length} properties for rent`);
        }
        else if (category === 'PG/Hostel') {
          // For PG/Hostel category, filter by property type
          filteredProperties = propertiesData.filter(prop => 
            prop.propertyType === 'PG' || prop.propertyType === 'Hostel'
          );
          console.log(`Filtered to ${filteredProperties.length} PG/Hostel properties`);
        }
        
        // Set properties for display
        setProperties(filteredProperties);
        console.log('Properties to display on map:', filteredProperties.length > 0 ? 'Yes' : 'No');
      } else {
        console.warn('Invalid data format or no properties in response');
        setProperties([]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      Alert.alert(
        'Error Loading Properties',
        'Could not load properties from the server.'
      );
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      let endpoint = `${SERVER_URL}/api/properties`;
      let params = {};

      if (category && category !== 'All') {
        let categoryParam = category;
        // Convert UI category to backend category (Buy → Sell)
        if (category === 'Buy') {
          categoryParam = 'Sell';
        } else if (category === 'PG/Hostel') {
          // Don't filter by category for PG/Hostel, only by property type
          delete params.category;
          // Filter by property type PG or Hostel
          params.propertyType = 'PG,Hostel';
        }
        params.category = categoryParam;
      }

      // Apply additional filters if provided
      if (filters) {
        // Apply category filter
        if (filters.category) {
          let categoryParam = filters.category;
          
          if (filters.category === 'Buy') {
            categoryParam = 'Sell';
          } else if (filters.category === 'PG/Hostel') {
            // Filter specifically for PG or Hostel property types
            params.propertyType = 'PG,Hostel';
            // Clear category since we're filtering by property type
            categoryParam = undefined;
          }
          
          if (categoryParam) {
            params.category = categoryParam;
          }
        }
        
        // Apply property type filter
        if (filters.propertyType && filters.propertyType !== 'All') {
          params.propertyType = filters.propertyType;
        }
        
        // Apply price range filters
        if (filters.priceMin) {
          params.minPrice = filters.priceMin;
        }
        if (filters.priceMax) {
          params.maxPrice = filters.priceMax;
        }
        
        // Apply other filters
        if (filters.bhk && filters.bhk !== 'Any') {
          params.bhk = filters.bhk;
        }
        
        if (filters.furnishing && filters.furnishing !== 'Any') {
          params.furnishing = filters.furnishing;
        }
        
        if (filters.city) {
          params['location.city'] = filters.city;
        }
      }

      console.log('Fetching properties with params:', params);
      const response = await axios.get(endpoint, { params });
      const responseData = response.data;
      
      // Check if the response has a properties array (the correct format from backend)
      if (responseData && responseData.properties && Array.isArray(responseData.properties)) {
        const propertiesData = responseData.properties;
        console.log(`Fetched ${propertiesData.length} properties with filters`);
        
        if (propertiesData.length === 0) {
          setProperties([]);
          Alert.alert('No Properties Found', 'No properties match your current criteria.');
          return;
        }

        // Filter out properties without valid location data
        const validProperties = propertiesData.filter(
          prop => prop.location && prop.location.coordinates && 
          Array.isArray(prop.location.coordinates) && 
          prop.location.coordinates.length === 2 &&
          !isNaN(prop.location.coordinates[0]) && 
          !isNaN(prop.location.coordinates[1])
        );

        if (validProperties.length === 0) {
          console.warn('No properties have valid location data');
          Alert.alert(
            'No Properties on Map',
            'No properties with valid location data were found.'
          );
          setProperties([]);
        } else {
          console.log(`Found ${validProperties.length} properties with valid location data`);
          setProperties(validProperties);
        }
      } else {
        console.error('Invalid response format:', responseData);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Fetch properties error:', error);
      Alert.alert(
        'Error Loading Properties',
        'Could not load properties from the server. Using sample data instead.',
        [{ text: 'OK' }]
      );
      // Use mock data as fallback
      setProperties(getMockProperties());
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch location suggestions with improved error handling and logging
  const fetchLocationSuggestions = async (query) => {
    if (!query || query.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    console.log('Fetching location suggestions for:', query);
    try {
      // Use geocoding to get locations matching the search query
      const response = await Location.geocodeAsync(query);
      console.log('Geocode results:', response?.length || 0, 'locations found');
      
      if (response && response.length > 0) {
        // Get reverse geocoding results for better display names (limit to 5 results)
        const results = await Promise.all(
          response.slice(0, 5).map(async (location) => {
            try {
              // Get detailed address information for each location
              const reverseGeocode = await Location.reverseGeocodeAsync({
                latitude: location.latitude,
                longitude: location.longitude
              });
              
              if (reverseGeocode && reverseGeocode.length > 0) {
                const place = reverseGeocode[0];
                
                // Build a readable place name from available address components
                const placeName = [
                  place.name,
                  place.street,
                  place.district,
                  place.city,
                  place.region,
                  place.country
                ].filter(Boolean).join(', ');
                
                console.log('Found place:', placeName);
                
                return {
                  id: `${location.latitude}-${location.longitude}`,
                  name: placeName,
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
        
        // Filter out any null results
        const filteredResults = results.filter(Boolean);
        console.log('Final location suggestions:', filteredResults.length);
        
        setLocationSuggestions(filteredResults);
        setShowSuggestions(filteredResults.length > 0);
      } else {
        console.log('No location suggestions found');
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      Alert.alert(
        'Location Search Error',
        'Unable to search for locations. Please check your network connection.'
      );
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle location selection from suggestions with improved animation and feedback
  const handleLocationSelect = (location) => {
    console.log('Location selected:', location.name, `(${location.latitude}, ${location.longitude})`);
    
    // Update search text with selected location name
    setSearchText(location.name);
    setShowSuggestions(false);
    Keyboard.dismiss();
    
    // Create a new region focused on the selected location
    const newRegion = {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.02,  // Zoom level - smaller values = more zoomed in
      longitudeDelta: 0.02
    };
    
    // Update the region state without triggering additional redraws
    setTimeout(() => {
      // Delay the region update to avoid flickering
      setRegion(newRegion);
    }, 10);
    
    // Animate the map to the new region with smooth transition
    if (mapRef.current) {
      // Use a delay to ensure smooth animation
      setTimeout(() => {
        mapRef.current.animateToRegion(newRegion, 800);
      }, 100);
    }
  };

  const getMockProperties = () => {
    return [
      {
        _id: '1',
        title: '3 BHK Luxury Apartment',
        price: 45000,
        propertyType: 'Apartment',
        category: 'Rent',
        location: {
          address: 'Palm Meadows, Whitefield',
          city: 'Bangalore',
          coordinates: [77.750923, 12.978134] // [longitude, latitude]
        }
      },
      {
        _id: '2',
        title: '2 BHK Independent House',
        price: 35000,
        propertyType: 'House',
        category: 'Rent',
        location: {
          address: 'Indiranagar, Near Metro',
          city: 'Bangalore',
          coordinates: [77.640320, 12.978590]
        }
      },
      {
        _id: '3',
        title: 'PG for Women',
        price: 12000,
        propertyType: 'PG',
        category: 'Rent',
        location: {
          address: 'HSR Layout, Sector 2',
          city: 'Bangalore',
          coordinates: [77.637800, 12.914590]
        }
      },
      {
        _id: '4',
        title: '4 BHK Luxury Villa',
        price: 12000000,
        propertyType: 'House',
        category: 'Sell',
        location: {
          address: 'Prestige Golfshire, Nandi Hills',
          city: 'Bangalore',
          coordinates: [77.583080, 13.366670]
        }
      },
      {
        _id: '5',
        title: '1200 sq.ft Commercial Space',
        price: 75000,
        propertyType: 'Commercial',
        category: 'Rent',
        location: {
          address: 'MG Road, Central Business District',
          city: 'Bangalore',
          coordinates: [77.603380, 12.975020]
        }
      }
    ];
  };

  const handleMarkerPress = (property) => {
    // Navigate to property details
    const screenMapping = {
      'HomeTab': 'PropertyDetails',
      'SearchTab': 'PropertyDetails',
      'FavoritesTab': 'PropertyDetails',
      'ProfileTab': 'PropertyDetails',
      'CategoryTab': 'PropertyDetails'
    };

    // Check the navigation state to determine where to navigate back to
    const navigationState = navigation.getState();
    const routes = navigationState.routes;
    const currentRoute = routes[0]?.name || '';
    
    // Get the appropriate screen to navigate to
    const screenName = screenMapping[currentRoute] || 'PropertyDetails';
    
    console.log(`Navigating to ${screenName} with property:`, property._id);
    navigation.navigate(screenName, { property });
  };

  const getMarkerColor = (property) => {
    if (!property.category) return '#0066cc'; // Default color

    switch (property.category) {
      case 'Sell':
        return '#25d366'; // Green for sale
      case 'Rent':
        if (property.propertyType === 'PG') {
          return '#ff6600'; // Orange for PG
        }
        return '#0066cc'; // Blue for rent
      default:
        return '#0066cc';
    }
  };

  return (
    <View style={styles.container}>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search location..."
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              fetchLocationSuggestions(text);
            }}
          />
          {searchText ? (
            <TouchableOpacity
              onPress={() => {
                setSearchText('');
                setLocationSuggestions([]);
                setShowSuggestions(false);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
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

      {/* Map with Properties */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={region}
            maxZoomLevel={19}
            minZoomLevel={10}
            rotateEnabled={false}
            pitchEnabled={false}
            loadingEnabled={true}
            loadingIndicatorColor="#0066cc"
            loadingBackgroundColor="#f8f8f8"
            onRegionChangeComplete={(newRegion) => {
              // Only update region if it's significantly different to avoid small jumps
              if (Math.abs(newRegion.latitude - region.latitude) > 0.0001 || 
                  Math.abs(newRegion.longitude - region.longitude) > 0.0001) {
                setRegion(newRegion);
              }
            }}
          >
            {/* Render markers exactly as in PropertyListingScreen */}
            {properties.map((property) => {
              // Only include properties with valid coordinates structure
              if (!property.location || !property.location.coordinates || !property.location.coordinates.coordinates) {
                console.log('Property missing proper coordinate structure:', property._id);
                return null;
              }
              
              // Extract coordinates from the nested structure - EXACTLY like PropertyListingScreen
              const coordinates = property.location.coordinates.coordinates;
              
              // Make sure we have a valid coordinate array
              if (!Array.isArray(coordinates) || coordinates.length !== 2) {
                console.log('Invalid coordinates array:', property._id);
                return null;
              }
              
              // GeoJSON stores coordinates as [longitude, latitude] - SAME as PropertyListingScreen
              const longitude = parseFloat(coordinates[0]);
              const latitude = parseFloat(coordinates[1]);
              
              console.log(`Rendering marker for ${property._id} at ${latitude}, ${longitude}`);
              
              // Skip invalid coordinates
              if (isNaN(latitude) || isNaN(longitude)) {
                console.log('Invalid coordinate values:', property._id);
                return null;
              }
              
              console.log(`Creating marker for ${property._id} at ${latitude}, ${longitude}`);
              
              // Skip properties with NaN coordinates
              if (isNaN(longitude) || isNaN(latitude)) {
                console.log('Invalid coordinates:', property._id);
                return null;
              }

              // Create marker for this property
              console.log(`Creating marker for ${property._id} at ${latitude}, ${longitude}`);
              return (
                <Marker
                  key={property._id}
                  coordinate={{
                    latitude: latitude,
                    longitude: longitude
                  }}
                  pinColor={getMarkerColor(property)}
                  onPress={() => handleMarkerPress(property)}
                  title={property.title}
                  description={`${property.propertyType || ''} - ₹${property.price?.toLocaleString() || ''}`}
                >
                  <Callout tooltip>
                    <View style={styles.calloutContainer}>
                      <Text style={styles.calloutTitle}>{property.title}</Text>
                      <Text style={styles.calloutPrice}>
                        ₹{property.price?.toLocaleString() || 'Contact for price'}
                      </Text>
                      <Text style={styles.calloutAddress}>
                        {property.location?.address || 'Location not specified'}
                      </Text>
                      <Text style={styles.calloutDetails}>
                        {property.category === 'Sell' ? 'For Sale' : 
                        property.category === 'Rent' ? 'For Rent' : 'PG/Hostel'}
                        {property.propertyType ? ` • ${property.propertyType}` : ''}
                        {property.bedrooms ? ` • ${property.bedrooms} BHK` : ''}
                      </Text>
                      <View style={styles.calloutButton}>
                        <Text style={styles.calloutButtonText}>View Details</Text>
                      </View>
                    </View>
                  </Callout>
                </Marker>
              );
            })}

            {/* Current location marker */}
            {currentLocation && (
              <Marker
                coordinate={currentLocation}
                pinColor="blue"
                title="Current Location"
              />
            )}
          </MapView>

          {/* Current Location Button */}
          <TouchableOpacity style={styles.currentLocationButton} onPress={getCurrentLocation}>
            <Ionicons name="locate" size={24} color="#0066cc" />
          </TouchableOpacity>

          {/* Properties Count Indicator */}
          <View style={styles.propertiesCountContainer}>
            <Text style={styles.propertiesCountText}>
              {properties.length} {properties.length === 1 ? 'Property' : 'Properties'} Found
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 40, // For status bar
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 10,
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
    marginRight: 30, // To balance the back button width
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    borderRadius: 25,
    height: 45,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
    color: '#0066cc',
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#333',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 125, // Positioned lower below search bar
    left: 15,
    right: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    maxHeight: 250,
    zIndex: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  calloutContainer: {
    width: 250,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  calloutPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 5,
  },
  calloutAddress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  calloutDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  calloutButton: {
    backgroundColor: '#0066cc',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  calloutButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: 80,
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
  propertiesCountContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  propertiesCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  }
});

export default ViewMapScreen;
