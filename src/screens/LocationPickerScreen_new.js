import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LocationContext } from '../context/LocationContext';

const LocationPickerScreen = ({ route, navigation }) => {
  const { initialLocation, onSelectLocation } = route.params;
  const { location: contextLocation, getCurrentLocation } = useContext(LocationContext);
  
  const [region, setRegion] = useState({
    latitude: initialLocation?.coordinates?.coordinates[1] || 12.9716,
    longitude: initialLocation?.coordinates?.coordinates[0] || 77.5946,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  const [markerPosition, setMarkerPosition] = useState({
    latitude: initialLocation?.coordinates?.coordinates[1] || 12.9716,
    longitude: initialLocation?.coordinates?.coordinates[0] || 77.5946,
  });
  
  const [address, setAddress] = useState({
    address: initialLocation?.address || '',
    city: initialLocation?.city || '',
    state: initialLocation?.state || '',
    country: initialLocation?.country || 'India',
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Attempt to get the user's location when the screen mounts
  useEffect(() => {
    if (!initialLocation?.coordinates?.coordinates[0]) {
      // If we don't have an initial location, try to get the current location
      getMyLocation();
    }
  }, []);

  useEffect(() => {
    // Update from context if available and no initial location was set
    const updateLocationFromContext = () => {
      if (!initialLocation?.coordinates?.coordinates[0] && contextLocation) {
        // If no initial location is provided, use the user's current location from context
        setRegion({
          latitude: contextLocation.latitude,
          longitude: contextLocation.longitude,
          latitudeDelta: 0.0122,
          longitudeDelta: 0.0121,
        });
        setMarkerPosition({
          latitude: contextLocation.latitude,
          longitude: contextLocation.longitude,
        });
        reverseGeocode(contextLocation.latitude, contextLocation.longitude);
      }
    };
    
    // Execute the function
    updateLocationFromContext();
  }, [contextLocation, initialLocation]);

  // Enhanced current location detection with multiple fallbacks
  const getMyLocation = async () => {
    setIsLoading(true);

    try {
      // Check for permissions first
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to use your current location',
          [
            { text: 'Cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              } 
            }
          ]
        );
        setIsLoading(false);
        return;
      }
      
      // First try with highest accuracy
      try {
        console.log('Attempting to get location with highest accuracy...');
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          mayShowUserSettingsDialog: true
        });
        
        const { latitude, longitude } = location.coords;
        console.log(`High accuracy location acquired: ${latitude}, ${longitude}`);
        
        // Update map with a tight zoom for precision
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.002, // Very zoomed in
          longitudeDelta: 0.002
        });
        
        setMarkerPosition({
          latitude,
          longitude
        });
        
        // Get address details using reverse geocoding
        const addressData = await reverseGeocode(latitude, longitude);
        console.log('High accuracy address found:', addressData);
        
        setIsLoading(false);
        return { latitude, longitude, ...addressData };
      } catch (highAccuracyError) {
        console.log('High accuracy location failed, trying balanced:', highAccuracyError);
        
        try {
          // If highest accuracy fails, try with balanced accuracy
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });
          
          const { latitude, longitude } = location.coords;
          console.log(`Balanced accuracy location acquired: ${latitude}, ${longitude}`);
          
          // Update map region and marker
          setRegion({
            latitude,
            longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005
          });
          
          setMarkerPosition({
            latitude,
            longitude
          });
          
          // Get address details
          const addressData = await reverseGeocode(latitude, longitude);
          console.log('Balanced accuracy address found:', addressData);
          
          setIsLoading(false);
          return { latitude, longitude, ...addressData };
        } catch (balancedError) {
          console.log('Balanced accuracy failed too, trying low accuracy:', balancedError);
          
          // Last resort: try with lowest accuracy
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low
          });
          
          const { latitude, longitude } = location.coords;
          console.log(`Low accuracy location acquired: ${latitude}, ${longitude}`);
          
          setRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          });
          
          setMarkerPosition({
            latitude,
            longitude
          });
          
          const addressData = await reverseGeocode(latitude, longitude);
          
          setIsLoading(false);
          return { latitude, longitude, ...addressData };
        }
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      
      // Try one last method: get the last known position
      try {
        console.log('Trying to get last known position...');
        const lastKnownPosition = await Location.getLastKnownPositionAsync();
        
        if (lastKnownPosition) {
          const { latitude, longitude } = lastKnownPosition.coords;
          console.log(`Last known position: ${latitude}, ${longitude}`);
          
          setRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          });
          
          setMarkerPosition({
            latitude,
            longitude
          });
          
          await reverseGeocode(latitude, longitude);
        } else {
          throw new Error('No location available');
        }
      } catch (finalError) {
        console.error('All location methods failed:', finalError);
        Alert.alert(
          'Location Error',
          'Could not get your current location. Please try searching for a location or set it manually by moving the map.',
          [{ text: 'OK' }]
        );
      }
      
      setIsLoading(false);
    }
  };

  // Improved reverse geocoding with better address formatting
  const reverseGeocode = async (latitude, longitude) => {
    try {
      console.log(`Reverse geocoding coordinates: ${latitude}, ${longitude}`);
      const response = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (response && response.length > 0) {
        const location = response[0];
        console.log('Reverse geocode result:', location);
        
        // Extract all possible address components
        const name = location.name || '';
        const streetNumber = location.streetNumber || '';
        const street = location.street || '';
        const district = location.district || '';
        const city = location.city || location.subregion || '';
        const state = location.region || '';
        const postalCode = location.postalCode || '';
        const country = location.country || 'India';
        
        // Build a well-formatted address
        let formattedAddress = '';
        
        // Start with street address
        if (streetNumber && street) {
          formattedAddress = `${streetNumber} ${street}`;
        } else if (street) {
          formattedAddress = street;
        }
        
        // Add name if it's not part of the street
        if (name && name !== street && name !== district) {
          formattedAddress = formattedAddress ? `${formattedAddress}, ${name}` : name;
        }
        
        // Add district if it's not already included
        if (district && !formattedAddress.includes(district)) {
          formattedAddress = formattedAddress ? `${formattedAddress}, ${district}` : district;
        }
        
        // Add city if not already included
        if (city && !formattedAddress.includes(city)) {
          formattedAddress = formattedAddress ? `${formattedAddress}, ${city}` : city;
        }
        
        // Use a fallback if we couldn't construct a proper address
        if (!formattedAddress) {
          formattedAddress = city || state || 'Unknown location';
        }
        
        const addressData = {
          address: formattedAddress,
          city,
          state, 
          country
        };
        
        console.log('Formatted address data:', addressData);
        setAddress(addressData);
        
        return addressData;
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
      const fallbackAddress = {
        address: 'Location found, address unavailable',
        city: '',
        state: '',
        country: 'India'
      };
      setAddress(fallbackAddress);
      return fallbackAddress;
    }
  };

  // Function to handle map drag and update the marker
  const onRegionChangeComplete = (newRegion) => {
    setRegion(newRegion);
    setMarkerPosition({
      latitude: newRegion.latitude,
      longitude: newRegion.longitude
    });
  };

  // Enhanced location search with geocoding
  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      console.log(`Searching for location: ${searchQuery}`);
      const geocodeResult = await Location.geocodeAsync(searchQuery);
      
      if (geocodeResult && geocodeResult.length > 0) {
        const { latitude, longitude } = geocodeResult[0];
        console.log(`Geocode result: ${latitude}, ${longitude}`);
        
        // Update region and marker position
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        });
        
        setMarkerPosition({
          latitude,
          longitude
        });
        
        // Get address details
        await reverseGeocode(latitude, longitude);
      } else {
        Alert.alert('Location Not Found', 'Could not find the location you searched for. Please try a different search term.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Search Error', 'Could not search for location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save selected location data and return to previous screen
  const saveLocation = () => {
    const selectedLocation = {
      address: address.address,
      city: address.city,
      state: address.state,
      country: address.country || 'India',
      coordinates: {
        type: 'Point',
        coordinates: [markerPosition.longitude, markerPosition.latitude]
      }
    };
    
    console.log('Saving location:', selectedLocation);
    onSelectLocation(selectedLocation);
    navigation.goBack();
  };

  // Update address when map marker is dragged
  const onMarkerDragEnd = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    
    console.log(`Marker dragged to: ${latitude}, ${longitude}`);
    setMarkerPosition({
      latitude,
      longitude
    });
    
    // Also update the region to center on the marker
    setRegion({
      ...region,
      latitude,
      longitude
    });
    
    // Update address based on new coordinates
    reverseGeocode(latitude, longitude);
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
      >
        <Marker
          coordinate={markerPosition}
          draggable
          onDragEnd={onMarkerDragEnd}
        />
      </MapView>

      {/* Search and Controls Overlay */}
      <View style={styles.overlay}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={searchLocation}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchButton} onPress={searchLocation}>
            <Ionicons name="search" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.myLocationButton} onPress={getMyLocation}>
          <Ionicons name="locate" size={24} color="#0066cc" />
        </TouchableOpacity>
      </View>

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Getting location...</Text>
        </View>
      )}

      {/* Bottom Card with Address Details */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.bottomCardContainer}
      >
        <View style={styles.bottomCard}>
          <Text style={styles.locationTitle}>Selected Location</Text>
          
          <View style={styles.addressContainer}>
            <Ionicons name="location" size={20} color="#0066cc" style={styles.addressIcon} />
            <View style={styles.addressTextContainer}>
              <Text style={styles.addressText}>{address.address}</Text>
              <Text style={styles.cityStateText}>
                {[address.city, address.state, address.country]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            </View>
          </View>

          <Text style={styles.dragInstructionText}>
            Drag the marker or use search to adjust the location
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={saveLocation}
            >
              <Text style={styles.confirmButtonText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 15,
    right: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#0066cc',
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  myLocationButton: {
    position: 'absolute',
    right: 0,
    top: 60,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  bottomCardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  addressContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  addressIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  cityStateText: {
    fontSize: 14,
    color: '#666',
  },
  dragInstructionText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 2,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LocationPickerScreen;
