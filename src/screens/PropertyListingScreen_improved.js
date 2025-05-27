import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL, ENDPOINTS } from '../config/api';
import PropertyCard from '../components/PropertyCard';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

const PropertyListingScreen = ({ route, navigation }) => {
  // Get category from navigation params
  const { category, viewMode: initialViewMode } = route.params || { category: 'All' };
  
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 12.9716,  // Default to Bangalore
    longitude: 77.5946,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [viewMode, setViewMode] = useState(initialViewMode || 'map'); // 'map' or 'list'

  useEffect(() => {
    // Get user's current location
    getUserLocation();
    
    // Fetch properties for the selected category
    fetchPropertiesByCategory();
  }, [category]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }
      
      // Try to get high accuracy location
      try {
        console.log('Getting high accuracy location...');
        const location = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000 
        });
        
        const { latitude, longitude } = location.coords;
        
        setUserLocation({
          latitude,
          longitude,
        });
        
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.0322,
          longitudeDelta: 0.0221,
        });
        
        console.log('Got user location (high accuracy):', latitude, longitude);
      } catch (error) {
        // Fall back to balanced accuracy
        console.log('High accuracy failed, trying balanced accuracy:', error);
        const location = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.Balanced 
        });
        
        const { latitude, longitude } = location.coords;
        
        setUserLocation({
          latitude,
          longitude,
        });
        
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.0422,
          longitudeDelta: 0.0221,
        });
        
        console.log('Got user location (balanced accuracy):', latitude, longitude);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const fetchPropertiesByCategory = async () => {
    setIsLoading(true);
    
    try {
      // Convert category names between UI and backend
      let queryCategory = category;
      if (category === 'Sell') {
        // Backend uses 'Sell', UI shows 'Buy'
        queryCategory = 'Sell';
      } else if (category === 'PG' || category === 'Hostel') {
        // For PG and Hostels
        queryCategory = 'PG';
      }
      
      // Create query parameter based on category
      let queryParams = '';
      
      if (queryCategory === 'Sell') {
        queryParams = '?category=Sell';
      } else if (queryCategory === 'Rent') {
        queryParams = '?category=Rent';
      } else if (queryCategory === 'PG') {
        queryParams = '?propertyType=PG,Hostel';
      }
      
      // Add location search if provided
      if (searchQuery) {
        const separator = queryParams ? '&' : '?';
        queryParams += `${separator}keyword=${encodeURIComponent(searchQuery)}`;
      }
      
      console.log(`Fetching ${queryCategory} properties with query: ${queryParams}`);
      
      const response = await axios.get(`${API_URL}/api/properties${queryParams}`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.properties) {
        console.log(`Found ${response.data.properties.length} ${queryCategory} properties`);
        setProperties(response.data.properties);
      } else {
        console.log(`No ${queryCategory} properties found`);
        setProperties([]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      try {
        // First try geocoding the search query to get coordinates
        const geocodeResult = await Location.geocodeAsync(searchQuery);
        
        if (geocodeResult && geocodeResult.length > 0) {
          const { latitude, longitude } = geocodeResult[0];
          console.log(`Search location geocoded: ${latitude}, ${longitude}`);
          
          // Update map region to center on search location
          setMapRegion({
            latitude,
            longitude,
            latitudeDelta: 0.0422,
            longitudeDelta: 0.0221,
          });
        }
      } catch (error) {
        console.log('Geocode error, proceeding with text search only:', error);
      }
    }
    
    // Fetch properties with the search query
    fetchPropertiesByCategory();
  };

  const handlePropertyPress = (property) => {
    // Set the selected property and center map on it
    setSelectedProperty(property);
    
    if (property.location && property.location.coordinates && 
        property.location.coordinates.coordinates) {
      const [longitude, latitude] = property.location.coordinates.coordinates;
      
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0122,
        longitudeDelta: 0.0121,
      });
    }
    
    // Navigate to property details
    navigation.navigate('PropertyDetails', { propertyId: property._id });
  };

  // Get the category title for the header
  const getCategoryTitle = () => {
    if (category === 'Sell') return 'Buy Properties';
    if (category === 'Rent') return 'Rental Properties';
    if (category === 'PG') return 'PGs/Hostels';
    return 'Properties';
  };

  const renderMarkers = () => {
    return properties.map((property) => {
      // Check if the property has valid coordinates
      if (property.location && 
          property.location.coordinates && 
          property.location.coordinates.coordinates && 
          property.location.coordinates.coordinates.length === 2) {
        
        const [longitude, latitude] = property.location.coordinates.coordinates;
        
        return (
          <Marker
            key={property._id}
            coordinate={{
              latitude,
              longitude,
            }}
            title={property.title}
            description={`₹${property.price}${property.category === 'Rent' ? '/mo' : ''}`}
            onPress={() => handlePropertyPress(property)}
          >
            <View style={styles.markerContainer}>
              <View style={[styles.marker, { backgroundColor: property.category === 'Sell' ? '#4CAF50' : '#2196F3' }]}>
                <Text style={styles.markerText}>₹{property.price}</Text>
              </View>
              <View style={styles.markerTriangle} />
            </View>
          </Marker>
        );
      }
      return null;
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loaderText}>Loading properties...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getCategoryTitle()}</Text>
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
        >
          <Ionicons 
            name={viewMode === 'map' ? 'list' : 'map'} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by location, area..."
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.trim() !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Map View */}
      {viewMode === 'map' && (
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={mapRegion}
            showsUserLocation
            showsMyLocationButton
          >
            {renderMarkers()}
          </MapView>
        </View>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <FlatList
          data={properties}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={() => handlePropertyPress(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="home-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No properties found</Text>
              <Text style={styles.emptySubText}>Try changing your search criteria</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Bottom Property List (when in map view) */}
      {viewMode === 'map' && (
        <View style={styles.bottomListContainer}>
          <Text style={styles.nearbyTitle}>Nearby Properties</Text>
          {properties.length > 0 ? (
            <FlatList
              horizontal
              data={properties}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.propertyCard}
                  onPress={() => handlePropertyPress(item)}
                >
                  <Image 
                    source={{ uri: item.images[0] || 'https://via.placeholder.com/100x100.png?text=Property' }}
                    style={styles.propertyImage}
                  />
                  <View style={styles.propertyInfo}>
                    <Text style={styles.propertyPrice}>₹{item.price}{item.category === 'Rent' ? '/mo' : ''}</Text>
                    <Text style={styles.propertyTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.propertyLocation} numberOfLines={1}>
                      {item.location?.city || ''}, {item.location?.state || ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.horizontalList}
              showsHorizontalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyHorizontalList}>
                  <Text style={styles.emptyText}>No nearby properties</Text>
                </View>
              }
            />
          ) : (
            <View style={styles.emptyHorizontalList}>
              <Text style={styles.emptyText}>No properties found</Text>
            </View>
          )}
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
    backgroundColor: '#0066cc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 45 : 15, 
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  toggleButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  searchButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#0066cc',
  },
  markerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0066cc',
    transform: [{ translateY: -1 }],
  },
  bottomListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    padding: 15,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    maxHeight: height * 0.25,
  },
  nearbyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  horizontalList: {
    paddingBottom: 15,
  },
  propertyCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: 220,
    marginRight: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  propertyImage: {
    width: '100%',
    height: 120,
  },
  propertyInfo: {
    padding: 10,
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  propertyTitle: {
    fontSize: 14,
    color: '#333',
    marginTop: 3,
  },
  propertyLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyHorizontalList: {
    width: width - 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
});

export default PropertyListingScreen;
