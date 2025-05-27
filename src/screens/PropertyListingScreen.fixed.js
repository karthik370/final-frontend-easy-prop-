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
  Alert,
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
  const { category } = route.params || { category: 'All' };
  
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
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [selectedPropertyType, setSelectedPropertyType] = useState(null); // For property type filter
  const [showPropertyTypeFilter, setShowPropertyTypeFilter] = useState(false); // To toggle property type filter
  
  // Define property type options
  const propertyTypes = [
    { label: 'All Types', value: null },
    { label: 'Apartment', value: 'Apartment' },
    { label: 'House', value: 'House' },
    { label: 'PG', value: 'PG' },
    { label: 'Hostel', value: 'Hostel' },
    { label: 'Villa', value: 'Villa' },
    { label: 'Plot', value: 'Plot' },
    { label: 'Commercial', value: 'Commercial' },
  ];

  useEffect(() => {
    // Get user's current location
    getUserLocation();
    
    // Fetch properties for the selected category
    fetchPropertiesByCategory();
  }, [category]);

  // Simple location detection to avoid errors
  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      console.log(`User location: ${latitude}, ${longitude}`);
      setUserLocation({ latitude, longitude });
      
    } catch (error) {
      console.log('Error getting location:', error);
    }
  };

  // Toggle between map and list view
  const toggleViewMode = () => {
    setViewMode(viewMode === 'map' ? 'list' : 'map');
  };

  const fetchPropertiesByCategory = async (searchLocation = null) => {
    setIsLoading(true);
    
    try {
      // We'll use the endpoints from your API config file
      let url = `${API_URL}${ENDPOINTS.PROPERTIES}`;
      
      console.log('Base API URL:', url);
      
      // Create a params object to build the query
      const params = new URLSearchParams();
      
      // Add category parameter if needed
      if (category && category !== 'All') {
        // Special handling for PG/Hostel category - we'll use property type filtering
        if (category === 'PG' || category === 'Hostel' || category === 'PG/Hostel') {
          // For PG/Hostel category, don't filter by category at all
          // Instead, directly filter by property type
          console.log('Fetching PG and Hostel properties with any category');
          // We won't add category filter, just property type filters
        } else if (category === 'Buy') {
          // Buy properties should use the Sell category in database
          params.append('category', 'Sell');
        } else {
          // For other categories (Rent), use the category directly
          params.append('category', category);
        }
      }
      
      // Add property type filter if selected
      if (selectedPropertyType) {
        params.append('propertyType', selectedPropertyType);
      }
      
      // Add search query if available
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      // Append the query params to the URL
      const queryString = params.toString();
      if (queryString) {
        url = `${url}?${queryString}`;
      }
      
      console.log('Fetching properties from:', url);
      
      const response = await axios.get(url);
      console.log('API response received');
      
      if (response.data && response.data.properties && Array.isArray(response.data.properties)) {
        // The properties are in the 'properties' key of the response
        let properties = response.data.properties;
        console.log(`Found ${properties.length} total properties from database`);
        
        // Client-side filtering for PG/Hostel properties
        if (category === 'PG' || category === 'Hostel' || category === 'PG/Hostel') {
          // Filter to only show properties with PG or Hostel property type
          const filteredProperties = properties.filter(property => 
            property.propertyType === 'PG' || property.propertyType === 'Hostel'
          );
          properties = filteredProperties;
          console.log(`Filtered to ${properties.length} PG/Hostel properties`);
        }
        
        if (properties.length > 0) {
          // Log first property to see its structure
          console.log('Sample property data:', JSON.stringify(properties[0]));
          console.log('Property type:', properties[0].propertyType);
          
          // Set the properties from the nested array
          setProperties(properties);
          
          // Update the map to show these properties, but only if no specific search location
          // If searchLocation is provided, we'll keep the map centered there
          if (!searchLocation) {
            fitMapToProperties(properties);
          }
        } else {
          // No properties for this category
          console.log('No properties found for this category/type in database');
          setProperties([]);
        }
      } else {
        console.log('Unexpected API response format:', response.data);
        setProperties([]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      // If there's an API error, we could show mock data for testing
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fit the map to show all properties
  const fitMapToProperties = (propertiesToFit) => {
    if (!propertiesToFit || propertiesToFit.length === a0) return;
    
    try {
      // Extract coordinates from properties
      let validLocations = propertiesToFit
        .filter(prop => prop.location && prop.location.coordinates && prop.location.coordinates.coordinates)
        .map(prop => {
          const coords = prop.location.coordinates.coordinates;
          console.log(`Property ${prop.title} has coordinates: ${coords}`);
          return {
            latitude: coords[1],
            longitude: coords[0],
          };
        });
      
      console.log(`Found ${validLocations.length} properties with valid coordinates`);
      
      if (validLocations.length === 0) return;
      
      if (validLocations.length === 1) {
        // If there's only one location, center on it
        setMapRegion({
          latitude: validLocations[0].latitude,
          longitude: validLocations[0].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
        return;
      }
      
      // Calculate the bounding box for all locations
      let minLat = Math.min(...validLocations.map(loc => loc.latitude));
      let maxLat = Math.max(...validLocations.map(loc => loc.latitude));
      let minLng = Math.min(...validLocations.map(loc => loc.longitude));
      let maxLng = Math.max(...validLocations.map(loc => loc.longitude));
      
      // Add a small padding
      const latPadding = (maxLat - minLat) * 0.2;
      const lngPadding = (maxLng - minLng) * 0.2;
      
      minLat -= latPadding;
      maxLat += latPadding;
      minLng -= lngPadding;
      maxLng += lngPadding;
      
      // Calculate center and deltas
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      const latDelta = maxLat - minLat;
      const lngDelta = maxLng - minLng;
      
      setMapRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      });
      
      console.log(`Map region updated to center: ${centerLat}, ${centerLng}`);
    } catch (error) {
      console.error('Error fitting map to properties:', error);
    }
  };
  
  // For map markers
  const renderPropertyMarkers = () => {
    if (!properties || properties.length === 0) return null;
    
    // Filter properties to only include those with valid coordinates
    const propertiesWithCoords = properties.filter(property => 
      property.location && 
      property.location.coordinates && 
      property.location.coordinates.coordinates
    );
    
    console.log(`Rendering ${propertiesWithCoords.length} markers on map`);
    
    return propertiesWithCoords.map(property => {
      // Extract coordinates from the nested structure
      const coordinates = property.location.coordinates.coordinates;
      
      // GeoJSON stores coordinates as [longitude, latitude]
      const latitude = coordinates[1];
      const longitude = coordinates[0];
      
      return (
        <Marker
          key={property._id}
          coordinate={{ latitude, longitude }}
          title={property.title}
          description={`${property.price} - ${property.propertyType}`}
          onPress={() => handlePropertyPress(property)}
        >
          <View style={styles.markerContainer}>
            <View style={[
              styles.marker, 
              selectedProperty && selectedProperty._id === property._id 
                ? styles.selectedMarker 
                : null
            ]}>
              <Text style={styles.markerPrice}>
                ₹{property.price >= 100000 ? 
                  `${Math.round(property.price / 100000)}L` : 
                  property.price.toLocaleString()}
              </Text>
            </View>
            <View style={styles.markerArrow} />
          </View>
        </Marker>
      );
    });
  };
  
  // Simple property marker handler with error prevention
  const handlePropertyPress = (property) => {
    if (!property) return;
    console.log('Property selected:', property.title);
    setSelectedProperty(property);
  };

  // Enhanced search function to prevent jumping to user location
  const handleSearch = async () => {
    if (!searchQuery) {
      return;
    }
    
    // Disable automatic user location detection temporarily
    let searchLocation = null;
    
    // Check if there's a location component to the search
    if (searchQuery.trim()) {
      try {
        // First try geocoding the search query to get coordinates
        const geocodeResult = await Location.geocodeAsync(searchQuery);
        
        if (geocodeResult && geocodeResult.length > 0) {
          const { latitude, longitude } = geocodeResult[0];
          console.log(`Search location geocoded: ${latitude}, ${longitude}`);
          
          // Save the search location for map update
          searchLocation = { latitude, longitude };
          
          // Update map region to center on search location
          setMapRegion({
            latitude,
            longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });
        }
      } catch (error) {
        console.log('Geocode error, proceeding with text search only:', error);
      }
    }
    
    // Fetch properties with the search query
    fetchPropertiesByCategory(searchLocation);
  };
  
  // Function to go to the location picker screen
  const goToLocationPicker = () => {
    navigation.navigate('LocationPicker', {
      onSelectLocation: (location) => {
        // When a location is selected, update the map region
        if (location && location.coordinates) {
          const coordinates = location.coordinates.coordinates;
          const latitude = coordinates[1];
          const longitude = coordinates[0];
          
          setMapRegion({
            latitude,
            longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });
          
          setSearchQuery(location.address || ''); // Update search query with location name
          fetchPropertiesByCategory({ latitude, longitude }); // Refresh properties
        }
      }
    });
  };
  
  // Filter by property type
  const handlePropertyTypeFilter = (type) => {
    console.log(`Filtering by property type: ${type || 'All'}`);
    setSelectedPropertyType(type);
    setShowPropertyTypeFilter(false);
    fetchPropertiesByCategory();
  };
  
  // Render the main content with both map and list views
  const renderContent = () => {
    // Show split view with map on top and list below
    return (
      <View style={styles.splitContainer}>
        {/* Map Section - Takes up top half of the screen */}
        <View style={styles.mapSection}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={mapRegion}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {renderPropertyMarkers()}
          </MapView>
          
          {selectedProperty && (
            <View style={styles.propertyInfoBox}>
              <PropertyCard 
                property={selectedProperty} 
                onPress={() => navigation.navigate('PropertyDetails', { property: selectedProperty })} 
              />
            </View>
          )}
        </View>
        
        {/* List Section - Takes up bottom half of the screen */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>Properties in {category}</Text>
            <Text style={styles.listCount}>{properties.length} found</Text>
          </View>
          
          {isLoading ? (
            <ActivityIndicator size="large" color="#4a90e2" style={styles.loader} />
          ) : properties.length > 0 ? (
            <FlatList
              data={properties}
              keyExtractor={item => item._id || Math.random().toString()}
              renderItem={({ item }) => (
                <PropertyCard 
                  property={item} 
                  onPress={() => {
                    // When clicking a property in the list, highlight it on the map too
                    handlePropertyPress(item);
                    navigation.navigate('PropertyDetails', { property: item });
                  }}
                />
              )}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No properties found</Text>
              <Text style={styles.noResultsSubtext}>Try changing your search criteria</Text>
            </View>
          )}
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Ionicons name="search" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Property Type Filter Button */}
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={styles.filterButton} 
            onPress={() => setShowPropertyTypeFilter(!showPropertyTypeFilter)}
          >
            <Ionicons name="filter" size={18} color="#0066cc" />
            <Text style={styles.filterButtonText}>
              {selectedPropertyType ? `Type: ${selectedPropertyType}` : 'Filter by Type'}
            </Text>
            <Ionicons name={showPropertyTypeFilter ? 'chevron-up' : 'chevron-down'} size={18} color="#0066cc" />
          </TouchableOpacity>
        </View>
        
        {/* Property Type Filter Dropdown */}
        {showPropertyTypeFilter && (
          <View style={styles.filterDropdown}>
            {propertyTypes.map((type, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.filterOption,
                  selectedPropertyType === type.value ? styles.selectedFilterOption : null
                ]}
                onPress={() => handlePropertyTypeFilter(type.value)}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedPropertyType === type.value ? styles.selectedFilterOptionText : null
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 40 : 10,
    paddingBottom: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    padding: 10,
    marginLeft: 10,
  },
  filterContainer: {
    marginTop: 5,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  filterButtonText: {
    fontSize: 14,
    marginHorizontal: 8,
    color: '#0066cc',
  },
  filterDropdown: {
    position: 'absolute',
    top: 85,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    marginHorizontal: 15,
    padding: 10,
    zIndex: 1000,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedFilterOption: {
    backgroundColor: '#f5f9ff',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedFilterOptionText: {
    color: '#0066cc',
    fontWeight: 'bold',
  },
  splitContainer: {
    flex: 1,
  },
  mapSection: {
    flex: 1.2,
    position: 'relative',
  },
  listSection: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 10,
    paddingHorizontal: 15,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    marginBottom: 5,
  },
  listHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listCount: {
    fontSize: 16,
    color: '#666',
  },
  loader: {
    marginTop: 20,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  propertyInfoBox: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  listContent: {
    paddingBottom: 20,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    padding: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedMarker: {
    backgroundColor: '#ff6600',
  },
  markerPrice: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0066cc',
    borderTopWidth: 6,
    transform: [{ rotate: '180deg' }],
  },
});

export default PropertyListingScreen;
