import React, { useState, useEffect, useRef, useContext } from 'react';
import { AntDesign } from '@expo/vector-icons';
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
  ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { SERVER_URL } from '../config/ip-config';
import PropertyCard from '../components/PropertyCard';
import * as Location from 'expo-location';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
const { width, height } = Dimensions.get('window');

const PropertyListingScreen = ({ route, navigation }) => {
  // Get category from navigation params
  const { category } = route.params || { category: 'All' };
  console.log('PropertyListingScreen initialized with category:', category);
  
  // FORCE PG/HOSTEL FILTER FLAG - Will override API results if true
  const [forcePGHostelFilter, setForcePGHostelFilter] = useState(false);
  
  // Main state variables
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 12.9716,  // Default to Bangalore
    longitude: 77.5946,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  
  // For location search and suggestions
  const [searchQuery, setSearchQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  // Check for force refresh from route params (used when new property is added)
  useEffect(() => {
    if (route.params?.refresh) {
      console.log('PropertyListingScreen: Forced refresh triggered by route params');
      fetchPropertiesByCategory();
    }
  }, [route.params?.refresh]);

  // Load initial data when component mounts
  useEffect(() => {
    // Get user's current location
    getUserLocation();
    
    // Set force filter flag if PG or PG/Hostel category is selected
    if (category === 'PG/Hostel' || category === 'PG') {
      console.log('PG/HOSTEL CATEGORY DETECTED - Forcing PG/Hostel filter');
      setForcePGHostelFilter(true);
    } else {
      setForcePGHostelFilter(false);
    }
    
    // Fetch properties for the selected category
    fetchPropertiesByCategory();
    
    console.log('Initial load, fetching properties for:', category);
  }, []);  
  
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
      
      // Update the map to show user's location
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      
    } catch (error) {
      console.log('Error getting location:', error);
    }
  };

  // Toggle between map and list view
  const toggleViewMode = () => {
    setViewMode(viewMode === 'map' ? 'list' : 'map');
  };

  // DIRECT fetch properties from MongoDB Atlas via backend
  const fetchPropertiesByCategory = async (searchLocation = null) => {
    setIsLoading(true);
    console.log(`DIRECT FETCH: Getting properties for category ${category} from MongoDB Atlas...`);
    
    try {
      // Use SERVER_URL from centralized config for consistency
      const apiUrl = `${SERVER_URL}/api/properties`;
      console.log('Using centralized SERVER_URL for property listings:', apiUrl);
      
      // Use basic fetch with appropriate parameters based on category
      let fetchUrl = apiUrl;
      
      if (category && category !== 'All') {
        // Special handling for PG or PG/Hostel category
        if (category === 'PG/Hostel' || category === 'PG') {
          // The backend is configured to handle `category=PG/Hostel` by returning both PG and Hostel types.
          // We will send the category parameter instead of propertyType.
          fetchUrl += `?category=PG/Hostel`;
          console.log('Requesting all properties in PG/Hostel category');
        } 
        // Handle Buy category - maps to Sell in the database
        else if (category === 'Buy') {
          fetchUrl += `?category=Sell`;
        }
        // All other categories (like Rent) use direct mapping
        else {
          fetchUrl += `?category=${category}`;
        }
      }
      
      // Add location parameters if available
      if (searchLocation) {
        const separator = fetchUrl.includes('?') ? '&' : '?';
        fetchUrl += `${separator}lat=${searchLocation.latitude}&lng=${searchLocation.longitude}`;
      }
      
      console.log('Final fetch URL:', fetchUrl);
      
      // Simple fetch request - most compatible approach
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      // Parse the JSON response directly
      const data = await response.json();
      console.log('RAW DATA RECEIVED FROM MONGODB ATLAS:', data);
      
      if (data && Array.isArray(data.properties)) {
        const allProperties = data.properties;
        console.log(`Found ${allProperties.length} properties in database`);
        
        // Apply category filtering client-side
        let filteredProperties = allProperties;
        
        if (category === 'Buy') {
          // For Buy category, filter to only show 'Sell' properties
          // This mapping is critical - in UI it's 'Buy' but in DB it's stored as 'Sell'
          filteredProperties = allProperties.filter(prop => prop.category === 'Sell');
          console.log(`Filtered to ${filteredProperties.length} properties for sale`);
        } 
        else if (category === 'Rent') {
          // For Rent category, filter to only show 'Rent' properties and EXCLUDE PG/Hostel
          filteredProperties = allProperties.filter(
            prop => 
              prop.category === 'Rent' &&
              prop.propertyType !== 'PG' &&
              prop.propertyType !== 'Hostel' &&
              prop.propertyType !== 'pg' &&
              prop.propertyType !== 'hostel'
          );
          console.log(`Filtered to ${filteredProperties.length} properties for rent (excluding PG/Hostel)`);
        }
        else if (category === 'PG/Hostel' || category === 'PG') {
          // STRICT FILTERING: For PG/Hostel category, ONLY show properties with PG or Hostel property type
          console.log('APPLYING STRICT PG/HOSTEL FILTERING...');
          console.log('Before filtering: ' + allProperties.length + ' properties');
          
          // Force filtering to only show PG or Hostel property types
          filteredProperties = allProperties.filter(prop => {
            const isPGorHostel = 
              (prop.propertyType === 'PG' || 
               prop.propertyType === 'Hostel' || 
               prop.propertyType === 'pg' || 
               prop.propertyType === 'hostel');
            
            if (!isPGorHostel) {
              console.log('Excluding property: ' + prop._id + ' with type: ' + prop.propertyType);
            }
            
            return isPGorHostel;
          });
          
          console.log(`STRICTLY filtered to ${filteredProperties.length} PG/Hostel properties ONLY`);
        }
        
        // CRITICAL STEP: If PG/Hostel is selected, force filter again before setting properties
        if (forcePGHostelFilter) {
          console.log('FORCE FILTER ACTIVE: Ensuring ONLY PG/Hostel properties are shown');
          console.log('Before forced filtering: ' + filteredProperties.length + ' properties');
          
          // No matter what previous filters did, FORCE filtering to only PG properties
          const strictlyFilteredProperties = filteredProperties.filter(prop => 
            prop.propertyType === 'PG' || prop.propertyType === 'Hostel'
          );
          
          console.log('After FORCED filtering: ' + strictlyFilteredProperties.length + ' properties');
          console.log('These are the ONLY properties that will be displayed!');
          
          // Replace the filtered properties with our strictly filtered ones
          filteredProperties = strictlyFilteredProperties;
        }
        
        // Set properties and update map
        setProperties(filteredProperties);
        
        if (filteredProperties.length > 0) {
          if (!searchLocation) {
            fitMapToProperties(filteredProperties);
          }
        } else {
          console.log('No properties found for category:', category);
        }
      } else {
        console.warn('No properties in database or invalid response format');
        setProperties([]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error.message);
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fit the map to show all properties
  const fitMapToProperties = (propertiesToFit) => {
    if (!propertiesToFit || propertiesToFit.length === 0) return;
    
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

  // Get location suggestions based on user input - Google Maps style
  const getLocationSuggestions = async (query) => {
    console.log('LOCATION SEARCH:', query, 'Length:', query?.length || 0);
    
    // Skip processing for very short queries
    if (!query || query.length < 2) {
      console.log('Search query too short, clearing suggestions');
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    
    // Show suggestions immediately
    console.log('Search length good, showing suggestions box');
    setShowLocationSuggestions(true);
    
    // Show loading state first
    setLocationSuggestions([
      { id: 'loading', name: 'Searching locations...', address: '', isLoading: true }
    ]);
    
    try {
      // Try to get better Google Maps-like suggestions through geocoding
      
      // First, try with the exact query to get precise matches
      const directResults = await Location.geocodeAsync(query);
      
      // We'll collect all valid suggestions here
      let allSuggestions = [];
      
      if (directResults && directResults.length > 0) {
        console.log(`Found ${directResults.length} direct matches`);
        
        // For each result, get detailed address information with reverse geocoding
        const enhancedSuggestions = await Promise.all(
          directResults.slice(0, 5).map(async (result, index) => {
            try {
              // Get detailed place information
              const reverseGeoResults = await Location.reverseGeocodeAsync({
                latitude: result.latitude,
                longitude: result.longitude
              });
              
              if (reverseGeoResults && reverseGeoResults.length > 0) {
                const place = reverseGeoResults[0];
                
                // Build a Google Maps-like display
                let primaryText = '';
                let secondaryText = '';
                
                // Primary text is usually a name, street, or POI
                if (place.name) {
                  primaryText = place.name;
                } else if (place.street) {
                  primaryText = place.street;
                } else {
                  primaryText = query;
                }
                
                // Secondary text has the area, city, region, country
                const addressParts = [];
                
                if (place.district && place.district !== primaryText) 
                  addressParts.push(place.district);
                
                if (place.city && !addressParts.includes(place.city)) 
                  addressParts.push(place.city);
                
                if (place.region && !addressParts.includes(place.region)) 
                  addressParts.push(place.region);
                
                if (place.country) 
                  addressParts.push(place.country);
                
                secondaryText = addressParts.join(', ');
                
                return {
                  id: `place-${index}`,
                  name: primaryText,
                  address: secondaryText || `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`,
                  formattedAddress: secondaryText,
                  latitude: result.latitude,
                  longitude: result.longitude,
                  source: 'geocoding'
                };
              } else {
                // Fallback if reverse geocoding fails
                return {
                  id: `basic-${index}`,
                  name: query,
                  address: `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`,
                  latitude: result.latitude,
                  longitude: result.longitude,
                  source: 'geocoding'
                };
              }
            } catch (error) {
              console.log('Error enhancing suggestion:', error);
              return null;
            }
          })
        );
        
        // Filter out any failed results
        allSuggestions = enhancedSuggestions.filter(s => s !== null);
      }
      
      // If we don't have enough suggestions, try with region qualifiers
      if (allSuggestions.length < 3) {
        // Try different regions to get more complete suggestions
        const regions = ['India', 'USA'];
        
        for (const region of regions) {
          // Skip if we already have enough suggestions
          if (allSuggestions.length >= 5) break;
          
          const regionQuery = `${query}, ${region}`;
          console.log(`Trying with region: ${regionQuery}`);
          
          try {
            const regionResults = await Location.geocodeAsync(regionQuery);
            
            if (regionResults && regionResults.length > 0) {
              // For each result, get detailed address information with reverse geocoding
              const regionSuggestions = await Promise.all(
                regionResults.slice(0, 2).map(async (result, index) => {
                  try {
                    // Get detailed place information
                    const reverseGeoResults = await Location.reverseGeocodeAsync({
                      latitude: result.latitude,
                      longitude: result.longitude
                    });
                    
                    if (reverseGeoResults && reverseGeoResults.length > 0) {
                      const place = reverseGeoResults[0];
                      
                      // Build a Google Maps-like display with region context
                      let primaryText = '';
                      let secondaryText = '';
                      
                      // Primary text is usually a name, street, or POI
                      if (place.name) {
                        primaryText = place.name;
                      } else if (place.street) {
                        primaryText = place.street;
                      } else {
                        primaryText = query;
                      }
                      
                      // Secondary text has the area, city, region, country
                      const addressParts = [];
                      
                      if (place.district && place.district !== primaryText) 
                        addressParts.push(place.district);
                      
                      if (place.city && !addressParts.includes(place.city)) 
                        addressParts.push(place.city);
                      
                      if (place.region && !addressParts.includes(place.region)) 
                        addressParts.push(place.region);
                      
                      // Always include region context
                      if (place.country) 
                        addressParts.push(place.country);
                      else
                        addressParts.push(region);
                      
                      secondaryText = addressParts.join(', ');
                      
                      // For region searches, include region in ID to avoid duplicates
                      return {
                        id: `place-${region}-${index}`,
                        name: primaryText,
                        address: secondaryText || `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`,
                        formattedAddress: secondaryText,
                        latitude: result.latitude,
                        longitude: result.longitude,
                        source: 'geocoding',
                        region: region
                      };
                    }
                  } catch (error) {
                    console.log(`Error enhancing suggestion for ${region}:`, error);
                    return null;
                  }
                })
              );
              
              // Add these to our main suggestions
              allSuggestions.push(...regionSuggestions.filter(s => s !== null));
            }
          } catch (error) {
            console.log(`Error searching in region ${region}:`, error);
          }
        }
      }
      
      // Remove any duplicates by coordinates
      const uniqueSuggestions = [];
      const coordKeys = new Set();
      
      allSuggestions.forEach(suggestion => {
        if (!suggestion) return;
        
        const coordKey = `${parseFloat(suggestion.latitude).toFixed(4)},${parseFloat(suggestion.longitude).toFixed(4)}`;
        
        // If we haven't seen this coordinate yet
        if (!coordKeys.has(coordKey)) {
          coordKeys.add(coordKey);
          uniqueSuggestions.push(suggestion);
        }
      });
      
      console.log(`Final suggestion count: ${uniqueSuggestions.length}`);
      
      // Return results, or a message if none found
      if (uniqueSuggestions.length > 0) {
        setLocationSuggestions(uniqueSuggestions.slice(0, 7)); // Limit to 7 suggestions
      } else {
        setLocationSuggestions([{
          id: 'no-results',
          name: 'No locations found',
          address: 'Try a different search term',
          isError: true
        }]);
      }
    } catch (error) {
      console.error('Location search error:', error);
      setLocationSuggestions([{ 
        id: 'error', 
        name: 'Error searching for locations', 
        address: 'Please try again later',
        isError: true
      }]);
    }
  };

  // Handle when a user selects a location suggestion
  const handleSuggestionSelect = (suggestion) => {
    console.log('Selected suggestion:', JSON.stringify(suggestion));
    
    // Skip if this is a loading or error state
    if (suggestion.isLoading) return;
    
    // Hide suggestions immediately
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
    
    // Set the search query to the selected suggestion name
    setSearchQuery(suggestion.name);
    
    try {
      // Ensure we have valid coordinates
      if (suggestion.latitude && suggestion.longitude && 
          !isNaN(parseFloat(suggestion.latitude)) && !isNaN(parseFloat(suggestion.longitude))) {
        
        // Create clean coordinates object
        const coords = {
          latitude: parseFloat(suggestion.latitude),
          longitude: parseFloat(suggestion.longitude)
        };
        
        console.log('Moving map to coordinates:', coords);
        
        // Update map region
        setMapRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
        
        // Fetch properties near this location
        fetchPropertiesByCategory(coords);
        
        // Clear any selected property
        if (selectedProperty) {
          setSelectedProperty(null);
        }
      } else {
        console.warn('Missing coordinates in suggestion:', suggestion);
        Alert.alert('Location Error', 'Please try another location');
      }
    } catch (error) {
      console.error('Error handling location selection:', error);
      Alert.alert('Error', 'An error occurred selecting this location');
    }
  };
  
  // Enhanced search function to prevent jumping to user location
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    console.log('Searching for:', searchQuery);
    setIsLoading(true);
    
    try {
      // Attempt to geocode the search query
      const geocodeResult = await Location.geocodeAsync(searchQuery);
      
      if (geocodeResult && geocodeResult.length > 0) {
        console.log('Found location for search query');
        const { latitude, longitude } = geocodeResult[0];
        
        // Update the map region to center on the search location
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
        
        // Pass this location to the fetchProperties function
        fetchPropertiesByCategory({ latitude, longitude });
      } else {
        console.log('No location found for search query, just searching by text');
        // If no location was found, just search by text
        fetchPropertiesByCategory();
      }
    } catch (error) {
      console.error('Error geocoding search query:', error);
      // Just search by text if geocoding fails
      fetchPropertiesByCategory();
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {/* Using the full React Native import path for ActivityIndicator */}
          <React.Fragment>
            <ActivityIndicator size="large" color="#0066cc" />
            <Text style={styles.loadingText}>Finding properties...</Text>
          </React.Fragment>
        </View>
      ) : null}
      
      {/* Header with search */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for location..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              // Instant suggestions after 3 characters
              if (text.length >= 3) {
                getLocationSuggestions(text);
              } else {
                setLocationSuggestions([]);
                setShowLocationSuggestions(false);
              }
            }}
            onSubmitEditing={() => handleSearch()}
          />
          {searchQuery ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery('');
                setLocationSuggestions([]);
                setShowLocationSuggestions(false);
              }}
            >
              <Ionicons name="close-circle" size={22} color="#999" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => handleSearch()}
          >
            <Ionicons name="search" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Location Suggestions Panel */}
        {showLocationSuggestions && locationSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {locationSuggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionSelect(suggestion)}
                >
                  <View style={styles.locationDetails}>
                    <View style={styles.locationIcon}>
                      <Ionicons name="location" size={24} color="#0066cc" />
                    </View>
                    <View style={styles.locationTextContainer}>
                      <Text style={styles.locationName}>{suggestion.name}</Text>
                      <Text style={styles.locationAddress}>{suggestion.address}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      
      {/* Content - Map and List Views */}
      <View style={styles.content}>
        {viewMode === 'map' ? (
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
            
            {/* Toggle view mode button */}
            <TouchableOpacity style={styles.viewModeButton} onPress={toggleViewMode}>
              <Ionicons name="list" size={24} color="#0066cc" />
              <Text style={styles.viewModeText}>List View</Text>
            </TouchableOpacity>
            
            {/* Current position button */}
            <TouchableOpacity
              style={styles.myLocationButton}
              onPress={getUserLocation}
            >
              <Ionicons name="locate" size={24} color="#0066cc" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listSection}>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>Properties in {category}</Text>
              <Text style={styles.listCount}>{properties.length} found</Text>
              
              {/* Toggle view mode button in list view */}
              <TouchableOpacity style={styles.viewModeButtonInList} onPress={toggleViewMode}>
                <Ionicons name="map" size={20} color="#0066cc" />
                <Text style={styles.viewModeTextInList}>Map</Text>
              </TouchableOpacity>
            </View>
            
            {properties.length > 0 ? (
              <FlatList
              data={properties.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))}
                keyExtractor={item => item._id || Math.random().toString()}
                renderItem={({ item }) => (
                  <PropertyCard 
                    property={item} 
                    onPress={() => {
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
        )}
      </View>
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
  header: {
    backgroundColor: '#fff',
    padding: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 10,
    elevation: 10, // For Android shadow
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 8,
  },
  searchButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 65, // Position right below search bar
    left: 10,
    right: 10,
    maxHeight: 270,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 20, // High elevation to appear above map
    zIndex: 20, // High z-index to appear above map
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationDetails: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  mapSection: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  propertyInfoBox: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  viewModeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  viewModeText: {
    marginLeft: 5,
    color: '#0066cc',
    fontWeight: '600',
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 80,
    right: 10,
    backgroundColor: 'white',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  listSection: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f0f0f0',
  },
  listHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  listCount: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  viewModeButtonInList: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066cc20',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  viewModeTextInList: {
    marginLeft: 5,
    color: '#0066cc',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 20,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 999,
    elevation: 999,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#0066cc',
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    backgroundColor: '#0066cc',
    padding: 5,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  selectedMarker: {
    backgroundColor: '#ff6600',
    padding: 7,
    paddingHorizontal: 10,
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
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0066cc',
    transform: [{ rotate: '180deg' }],
  },
});

export default PropertyListingScreen;
