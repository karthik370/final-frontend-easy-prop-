import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Platform
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const { width } = Dimensions.get('window');

const SimpleLocationPicker = ({ 
  initialLocation, 
  onLocationSelected,
  onClose,
  placeholder = "Search for a location..."
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);
  const [region, setRegion] = useState({
    latitude: initialLocation?.latitude || 37.78825,
    longitude: initialLocation?.longitude || -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [userLocation, setUserLocation] = useState(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const mapRef = useRef(null);
  
  // Get user's current location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Handle map region changes only when caused by user interaction
  const onRegionChangeComplete = (newRegion) => {
    if (isUserInteracting) {
      setRegion(newRegion);
      setSelectedLocation({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
        name: 'Custom Location'
      });
    }
  };

  // Fetch current location with high accuracy first, then fall back to balanced
  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }
      
      // First try with high accuracy
      try {
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        
        const { latitude, longitude } = location.coords;
        setUserLocation({ latitude, longitude });
        
        if (!initialLocation) {
          setSelectedLocation({ latitude, longitude, name: 'Current Location' });
          setRegion({
            latitude,
            longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
        }
      } catch (error) {
        console.log('High accuracy failed, trying balanced accuracy');
        // Fallback to balanced accuracy
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        const { latitude, longitude } = location.coords;
        setUserLocation({ latitude, longitude });
        
        if (!initialLocation) {
          setSelectedLocation({ latitude, longitude, name: 'Current Location' });
          setRegion({
            latitude,
            longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Search for locations with the given query
  const searchLocations = async (query) => {
    setIsLoading(true);
    setNoResults(false);
    
    if (query.length < 3) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }
    
    try {
      // Primary search using Nominatim (OpenStreetMap)
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10`
      );
      
      const locations = response.data.map(item => ({
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        name: item.display_name,
        id: item.place_id.toString()
      }));
      
      // If we get fewer than 5 results, add fallback suggestions
      if (locations.length < 5) {
        const fallbackSuggestions = getFallbackSuggestions(query);
        const combinedResults = [...locations, ...fallbackSuggestions].slice(0, 10);
        setSuggestions(combinedResults);
        setNoResults(combinedResults.length === 0);
      } else {
        setSuggestions(locations);
        setNoResults(locations.length === 0);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      const fallbackSuggestions = getFallbackSuggestions(query);
      setSuggestions(fallbackSuggestions);
      setNoResults(fallbackSuggestions.length === 0);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate fallback suggestions to ensure we always have results
  const getFallbackSuggestions = (query) => {
    // Create common city variations based on the query
    const queryLower = query.toLowerCase();
    
    const commonCities = [
      { name: 'New York, USA', latitude: 40.7128, longitude: -74.0060 },
      { name: 'London, UK', latitude: 51.5074, longitude: -0.1278 },
      { name: 'Paris, France', latitude: 48.8566, longitude: 2.3522 },
      { name: 'Tokyo, Japan', latitude: 35.6762, longitude: 139.6503 },
      { name: 'Sydney, Australia', latitude: -33.8688, longitude: 151.2093 },
      { name: 'Delhi, India', latitude: 28.7041, longitude: 77.1025 },
      { name: 'Mumbai, India', latitude: 19.0760, longitude: 72.8777 },
      { name: 'Bangalore, India', latitude: 12.9716, longitude: 77.5946 },
      { name: 'Chennai, India', latitude: 13.0827, longitude: 80.2707 },
      { name: 'Hyderabad, India', latitude: 17.3850, longitude: 78.4867 }
    ];
    
    // Filter cities that include the query string
    return commonCities
      .filter(city => city.name.toLowerCase().includes(queryLower))
      .map((city, index) => ({
        ...city,
        id: `fallback-${index}`
      }));
  };

  // Handle location selection from suggestions
  const handleSelectLocation = (location) => {
    setSelectedLocation(location);
    setRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    });
    setSuggestions([]);
    setSearchQuery(location.name);
    Keyboard.dismiss();
  };

  // Confirm the selected location
  const confirmLocation = () => {
    if (selectedLocation) {
      onLocationSelected(selectedLocation);
    }
  };

  // Clear search query and suggestions
  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setNoResults(false);
  };

  // Return to current user location
  const goToUserLocation = () => {
    if (userLocation) {
      setIsUserInteracting(false);
      setRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      setSelectedLocation({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        name: 'Current Location'
      });
      mapRef.current?.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 500);
    }
  };

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.length >= 3) {
        searchLocations(searchQuery);
      } else if (searchQuery.length === 0) {
        setSuggestions([]);
        setNoResults(false);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Location suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelectLocation(item)}
              >
                <Ionicons name="location" size={20} color="#0066cc" style={styles.locationIcon} />
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0066cc" />
          <Text style={styles.loadingText}>Searching locations...</Text>
        </View>
      )}

      {/* No results message */}
      {noResults && !isLoading && (
        <View style={styles.noResultsContainer}>
          <Ionicons name="alert-circle-outline" size={24} color="#666" />
          <Text style={styles.noResultsText}>No locations found</Text>
        </View>
      )}

      {/* Map view */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          onRegionChangeComplete={onRegionChangeComplete}
          onPanDrag={() => setIsUserInteracting(true)}
        >
          {selectedLocation && (
            <Marker
              coordinate={{
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude
              }}
              title={selectedLocation.name}
            />
          )}
        </MapView>

        {/* Current location button */}
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={goToUserLocation}
        >
          <Ionicons name="locate" size={24} color="#0066cc" />
        </TouchableOpacity>
      </View>

      {/* Confirm button */}
      <TouchableOpacity
        style={[
          styles.confirmButton,
          !selectedLocation && styles.confirmButtonDisabled
        ]}
        onPress={confirmLocation}
        disabled={!selectedLocation}
      >
        <Text style={styles.confirmButtonText}>Confirm Location</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    zIndex: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  cancelButton: {
    marginLeft: 10,
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  cancelText: {
    color: '#0066cc',
    fontSize: 16,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    maxHeight: 300,
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
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationIcon: {
    marginRight: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  loadingContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 5,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#666',
  },
  noResultsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 5,
  },
  noResultsText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#666',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  confirmButton: {
    backgroundColor: '#0066cc',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SimpleLocationPicker;
