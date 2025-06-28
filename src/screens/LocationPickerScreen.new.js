// LocationPickerScreen.js - Reimplemented with real-world location suggestions

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = "AIzaSyA_Dun255HHND3b_lX5N05zvGT77NhDeCI";

export default function LocationPickerScreen({ route, navigation }) {
  const { onSelectLocation = () => {} } = route.params || {};

  // References
  const mapRef = useRef(null);
  const googlePlacesRef = useRef(null);
  
  // State
  const [region, setRegion] = useState({
    latitude: 17.385,
    longitude: 78.4867,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  });
  const [marker, setMarker] = useState({
    latitude: 17.385,
    longitude: 78.4867
  });
  const [selected, setSelected] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Request location permissions on component mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required for this feature.');
      }
    })();
  }, []);

  // Handle selection from Google Places Autocomplete
  const handlePlaceSelect = (data, details = null) => {
    if (details && details.geometry) {
      const { lat, lng } = details.geometry.location;
      const coordinates = {
        latitude: lat,
        longitude: lng
      };
      
      // Update marker position
      setMarker(coordinates);
      
      // Update region with animation
      const newRegion = {
        ...coordinates,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      };
      
      // Animate map
      mapRef.current?.animateToRegion(newRegion, 1000);
      setRegion(newRegion);
      
      // Save selected location
      setSelected({
        coordinates: { 
          type: 'Point', 
          coordinates: [lng, lat] 
        },
        address: details.formatted_address || data.description
      });
    }
  };
  
  // Handle dragging the marker
  const handleMarkerDragEnd = async (e) => {
    try {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      setMarker({ latitude, longitude });
      setRegion({ ...region, latitude, longitude });
      
      // Get address from coordinates
      const address = await reverseGeocode(latitude, longitude);
      
      // Update the selected payload
      setSelected({
        coordinates: { type: 'Point', coordinates: [longitude, latitude] },
        address: address,
      });
      
      // Clear the search input
      if (googlePlacesRef.current) {
        googlePlacesRef.current.clear();
      }
    } catch (error) {
      console.error('Error handling marker drag:', error);
    }
  };
  
  // Get user's current location
  const getUserLocation = async () => {
    try {
      setIsLoading(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest
      });
      const { latitude, longitude } = location.coords;
      
      // Update marker and map
      setMarker({ latitude, longitude });
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      };
      
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      
      // Get address
      const address = await reverseGeocode(latitude, longitude);
      
      // Save selected location
      setSelected({
        coordinates: { type: 'Point', coordinates: [longitude, latitude] },
        address: address
      });
      
      // Clear the search input
      if (googlePlacesRef.current) {
        googlePlacesRef.current.clear();
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Could not get your location. Please check your device settings.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (latitude, longitude) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result.length > 0) {
        const r = result[0];
        return [
          r.name,
          r.street,
          r.district,
          r.city,
          r.region,
          r.country
        ].filter(Boolean).join(', ');
      }
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  // Confirm location and return to parent
  const confirm = () => {
    if (!selected) {
      return Alert.alert('No Location', 'Please pick a place first.');
    }
    onSelectLocation(selected);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
      >
        <Marker
          coordinate={marker}
          draggable
          onDragEnd={handleMarkerDragEnd}
        />
      </MapView>

      {/* Search Bar with Google Places */}
      <View style={styles.searchContainer}>
        <GooglePlacesAutocomplete
          ref={googlePlacesRef}
          placeholder="Search for a location worldwide"
          fetchDetails={true}
          onPress={handlePlaceSelect}
          query={{
            key: GOOGLE_MAPS_API_KEY,
            language: 'en',
          }}
          enablePoweredByContainer={false}
          minLength={2}
          debounce={300}
          returnKeyType={'search'}
          listViewDisplayed="auto"
          styles={{
            container: styles.autocompleteContainer,
            textInputContainer: styles.textInputContainer,
            textInput: styles.textInput,
            listView: styles.listView,
            row: styles.row,
            separator: styles.separator,
            description: styles.description,
            poweredContainer: { height: 0 },
          }}
          renderLeftButton={() => (
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color="#777" />
            </View>
          )}
          renderRightButton={() => (
            googlePlacesRef.current?.getAddressText() ? (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => {
                  googlePlacesRef.current?.clear();
                }}
              >
                <Ionicons name="close-circle" size={20} color="#777" />
              </TouchableOpacity>
            ) : null
          )}
        />
      </View>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      )}

      {/* Current Location Button */}
      <TouchableOpacity style={styles.currentLocationButton} onPress={getUserLocation}>
        <Ionicons name="locate" size={24} color="#0066cc" />
      </TouchableOpacity>
      
      {/* Confirm Button */}
      <TouchableOpacity style={styles.confirmButton} onPress={confirm}>
        <Ionicons name="checkmark-circle" size={24} color="white" />
        <Text style={styles.confirmButtonText}>Confirm Location</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    width: '94%',
    alignSelf: 'center',
    zIndex: 5,
  },
  autocompleteContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 10,
  },
  textInputContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    marginHorizontal: 0,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  textInput: {
    height: 48,
    borderRadius: 8,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 5,
    flex: 1,
  },
  listView: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  row: {
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  description: {
    fontSize: 15,
  },
  searchIconContainer: {
    marginRight: 10,
  },
  clearButton: {
    padding: 8,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: 100,
    right: 15,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#0066cc',
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
