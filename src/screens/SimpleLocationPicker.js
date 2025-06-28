// SimpleLocationPicker.fixed.js - Enhanced version with better India-specific location search

// Import the polyfill first
import '../utils/uuid-polyfill';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
  TextInput,
  FlatList,
  Keyboard
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

// Google Maps API Key - using one from .env file
// Your Google Maps API key
const GOOGLE_MAPS_API_KEY = "AIzaSyA_Dun255HHND3b_lX5N05zvGT77NhDeCI";

export default function SimpleLocationPicker({ route, navigation }) {
  const { onSelectLocation = () => {} } = route.params || {};

  // References
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  
  // State
  const [region, setRegion] = useState({
    latitude: 20.5937, // More central to India
    longitude: 78.9629, // More central to India
    latitudeDelta: 5,   // Zoomed out to show more of India
    longitudeDelta: 5
  });
  const [marker, setMarker] = useState({
    latitude: 20.5937,
    longitude: 78.9629
  });
  const [selected, setSelected] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [selectedFromSuggestion, setSelectedFromSuggestion] = useState(false);
  const [locationDetails, setLocationDetails] = useState({
    formattedAddress: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });

  // Get current location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Get user's current location - used both on initial load and when pressing current location button
  const getCurrentLocation = async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to use this feature.');
        setIsLoading(false);
        return;
      }
      
      // Use high accuracy to get exact device location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 0, // Get the most recent position
        timeout: 15000 // Wait up to 15 seconds
      });
      
      const { latitude, longitude } = location.coords;
      console.log(`Got EXACT device location: ${latitude}, ${longitude} with ${location.coords.accuracy}m accuracy`);
      
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01, // Closer zoom
        longitudeDelta: 0.01
      };
      
      setRegion(newRegion);
      setMarker({
        latitude,
        longitude
      });
      
      // Animate to the user's location
      mapRef.current?.animateToRegion(newRegion, 1000);
      
      // Get the address details for the location
      await reverseGeocode(latitude, longitude);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Location Error', 'Could not get your current location. Please search for a location instead.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get and handle current location
  const handleCurrentLocationPress = async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to use this feature.');
        setIsLoading(false);
        return;
      }
      
      // Use high accuracy to get exact device location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 0, // Get the most recent position
        timeout: 15000 // Wait up to 15 seconds
      });
      
      const { latitude, longitude } = location.coords;
      console.log(`Got EXACT device location: ${latitude}, ${longitude} with ${location.coords.accuracy}m accuracy`);
      
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01, // Zoom in closer (0.01 instead of 0.05)
        longitudeDelta: 0.01,
      };
      
      setRegion(newRegion);
      setMarker({
        latitude,
        longitude,
      });
      
      // Animate to the user's location
      mapRef.current?.animateToRegion(newRegion, 1000);
      
      // Get the address details for the location
      await reverseGeocode(latitude, longitude);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Location Error', 'Could not get your current location. Please search for a location instead.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reverse geocoding to get address from coordinates
  const reverseGeocode = async (latitude, longitude) => {
    try {
      console.log(`Reverse geocoding: ${latitude}, ${longitude}`);
      
      // First try using Google Geocoding API for more accurate results in India
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&language=en&region=in&result_type=street_address|route|locality|sublocality|neighborhood`
      );
      
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        
        // Extract address components
        let cityName = '';
        let stateName = '';
        let pincode = '';
        let formattedAddress = result.formatted_address || '';
        
        // Parse address components
        result.address_components.forEach(component => {
          const types = component.types;
          
          if (types.includes('locality') || types.includes('sublocality') || types.includes('administrative_area_level_3')) {
            cityName = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            stateName = component.long_name;
          } else if (types.includes('postal_code')) {
            pincode = component.long_name;
          }
        });
        
        const locationDetails = {
          formattedAddress,
          city: cityName,
          state: stateName,
          pincode,
          country: 'India',
          latitude,
          longitude
        };
        
        setLocationDetails(locationDetails);
        setSelected(locationDetails);
        
        console.log('Reverse geocoded address:', locationDetails);
      } else {
        // Fallback to Expo's Location service if Google API fails
        const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
        
        if (addresses.length > 0) {
          const address = addresses[0];
          
          const locationDetails = {
            formattedAddress: `${address.name || ''} ${address.street || ''}, ${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}`.trim(),
            city: address.city || '',
            state: address.region || '',
            pincode: address.postalCode || '',
            country: address.country || 'India',
            latitude,
            longitude
          };
          
          setLocationDetails(locationDetails);
          setSelected(locationDetails);
          
          console.log('Fallback reverse geocoded address:', locationDetails);
        }
      }
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      
      // Set basic location data even if geocoding fails
      setLocationDetails({
        formattedAddress: `Location at ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        latitude,
        longitude
      });
    }
  };

  // Location search implementation - Using Expo Location API like PropertyListingScreen.js
  const handleSearch = useCallback(async (text) => {
    console.log('Searching for:', text);
    
    // Changed to allow searching with just 3 letters
    if (!text || text.length < 3) {
      setSuggestions([]);
      return;
    }
    
    setIsFetchingSuggestions(true);
    
    try {
      // Show loading indicator
      setSuggestions([{ id: 'loading', mainText: 'Searching...', secondaryText: 'Finding locations in India', isLoading: true }]);
      
      // Use Expo's geocoding like in PropertyListingScreen.js
      const directResults = await Location.geocodeAsync(text);
      
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
                  primaryText = text;
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
                  mainText: primaryText,
                  secondaryText: secondaryText || `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`,
                  description: secondaryText || `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`,
                  latitude: result.latitude,
                  longitude: result.longitude,
                  source: 'geocoding'
                };
              } else {
                // Fallback if reverse geocoding fails
                return {
                  id: `basic-${index}`,
                  mainText: text,
                  secondaryText: `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`,
                  description: `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`,
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
        
        // Filter out null results and add to suggestions
        allSuggestions = enhancedSuggestions.filter(Boolean);
      }
      
      // If we have no results or very few, add some common major cities in India
      if (allSuggestions.length < 5 && text.length >= 3) {
        const lowerText = text.toLowerCase();
        
        // Top Indian cities for fallback
        const majorIndianCities = [
          { name: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090 },
          { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
          { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
          { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
          { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
          { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
          { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
          { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
          { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
          { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 }
        ];
        
        // Find matching cities
        const matchingCities = majorIndianCities.filter(city => 
          city.name.toLowerCase().includes(lowerText) || 
          city.state.toLowerCase().includes(lowerText)
        );
        
        // Format the cities like our other suggestions
        const formattedCities = matchingCities.map((city, index) => ({
          id: `city-${index}`,
          mainText: city.name,
          secondaryText: `${city.state}, India`,
          description: `${city.name}, ${city.state}, India`,
          latitude: city.lat,
          longitude: city.lng,
          source: 'fallback'
        }));
        
        // Add them to our suggestions
        allSuggestions = [...allSuggestions, ...formattedCities];
      }
      
      // Limit to first 5 suggestions
      const finalSuggestions = allSuggestions.slice(0, 5);
      
      console.log(`Returning ${finalSuggestions.length} location suggestions`);
      finalSuggestions.forEach(suggestion => {
        console.log(`- ${suggestion.mainText}, ${suggestion.secondaryText}`);
      });
      
      setSuggestions(finalSuggestions);
    } catch (error) {
      console.error('Error searching for places:', error);
      Alert.alert('Search Error', 'Could not search for locations. Please try again.');
      setSuggestions([]);
    } finally {
      setIsFetchingSuggestions(false);
    }
  }, []);

  // Debounce search to avoid too many API calls
  useEffect(() => {
    // Clear suggestions when query is empty
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return () => {};
    }
    
    // Only search when we have 3+ characters
    if (searchQuery.trim().length >= 3) {
      console.log(`Setting up search for: "${searchQuery}"`);
      const timeoutId = setTimeout(() => {
        handleSearch(searchQuery);
      }, 300); // Reduced to 300ms for faster response
      
      return () => clearTimeout(timeoutId);
    }
    
    return () => {};
  }, [searchQuery, handleSearch]);

  // Function to get place details from our local database of places
  const getPlaceDetails = async (placeId) => {
    try {
      // Our fallback solution for Indian cities and places
      const indianPlaces = [
        // Major cities
        { id: 'delhi_in', mainText: 'Delhi', secondaryText: 'National Capital Territory, India', lat: 28.6139, lng: 77.2090 },
        { id: 'mumbai_in', mainText: 'Mumbai', secondaryText: 'Maharashtra, India', lat: 19.0760, lng: 72.8777 },
        { id: 'kolkata_in', mainText: 'Kolkata', secondaryText: 'West Bengal, India', lat: 22.5726, lng: 88.3639 },
        { id: 'chennai_in', mainText: 'Chennai', secondaryText: 'Tamil Nadu, India', lat: 13.0827, lng: 80.2707 },
        { id: 'bangalore_in', mainText: 'Bangalore', secondaryText: 'Karnataka, India', lat: 12.9716, lng: 77.5946 },
        { id: 'hyderabad_in', mainText: 'Hyderabad', secondaryText: 'Telangana, India', lat: 17.3850, lng: 78.4867 },
        { id: 'ahmedabad_in', mainText: 'Ahmedabad', secondaryText: 'Gujarat, India', lat: 23.0225, lng: 72.5714 },
        { id: 'pune_in', mainText: 'Pune', secondaryText: 'Maharashtra, India', lat: 18.5204, lng: 73.8567 },
        { id: 'jaipur_in', mainText: 'Jaipur', secondaryText: 'Rajasthan, India', lat: 26.9124, lng: 75.7873 },
        { id: 'lucknow_in', mainText: 'Lucknow', secondaryText: 'Uttar Pradesh, India', lat: 26.8467, lng: 80.9462 },
        { id: 'kanpur_in', mainText: 'Kanpur', secondaryText: 'Uttar Pradesh, India', lat: 26.4499, lng: 80.3319 },
        { id: 'nagpur_in', mainText: 'Nagpur', secondaryText: 'Maharashtra, India', lat: 21.1458, lng: 79.0882 },
        { id: 'indore_in', mainText: 'Indore', secondaryText: 'Madhya Pradesh, India', lat: 22.7196, lng: 75.8577 },
        { id: 'bhopal_in', mainText: 'Bhopal', secondaryText: 'Madhya Pradesh, India', lat: 23.2599, lng: 77.4126 },
        { id: 'ludhiana_in', mainText: 'Ludhiana', secondaryText: 'Punjab, India', lat: 30.9010, lng: 75.8573 },
        { id: 'agra_in', mainText: 'Agra', secondaryText: 'Uttar Pradesh, India', lat: 27.1767, lng: 78.0081 },
        { id: 'vadodara_in', mainText: 'Vadodara', secondaryText: 'Gujarat, India', lat: 22.3072, lng: 73.1812 },
        { id: 'patna_in', mainText: 'Patna', secondaryText: 'Bihar, India', lat: 25.5941, lng: 85.1376 },
        { id: 'surat_in', mainText: 'Surat', secondaryText: 'Gujarat, India', lat: 21.1702, lng: 72.8311 },
        { id: 'bhubaneswar_in', mainText: 'Bhubaneswar', secondaryText: 'Odisha, India', lat: 20.2961, lng: 85.8245 },
        { id: 'kochi_in', mainText: 'Kochi', secondaryText: 'Kerala, India', lat: 9.9312, lng: 76.2673 },
        { id: 'coimbatore_in', mainText: 'Coimbatore', secondaryText: 'Tamil Nadu, India', lat: 11.0168, lng: 76.9558 },
        { id: 'vizag_in', mainText: 'Visakhapatnam', secondaryText: 'Andhra Pradesh, India', lat: 17.6868, lng: 83.2185 },
        { id: 'guwahati_in', mainText: 'Guwahati', secondaryText: 'Assam, India', lat: 26.1445, lng: 91.7362 },
        { id: 'chandigarh_in', mainText: 'Chandigarh', secondaryText: 'Punjab & Haryana, India', lat: 30.7333, lng: 76.7794 },
        { id: 'dehradun_in', mainText: 'Dehradun', secondaryText: 'Uttarakhand, India', lat: 30.3165, lng: 78.0322 },
        { id: 'jammu_in', mainText: 'Jammu', secondaryText: 'Jammu and Kashmir, India', lat: 32.7266, lng: 74.8570 },
        { id: 'srinagar_in', mainText: 'Srinagar', secondaryText: 'Jammu and Kashmir, India', lat: 34.0837, lng: 74.7973 },
        { id: 'shimla_in', mainText: 'Shimla', secondaryText: 'Himachal Pradesh, India', lat: 31.1048, lng: 77.1734 },
        { id: 'rishikesh_in', mainText: 'Rishikesh', secondaryText: 'Uttarakhand, India', lat: 30.0869, lng: 78.2676 },
        { id: 'haridwar_in', mainText: 'Haridwar', secondaryText: 'Uttarakhand, India', lat: 29.9457, lng: 78.1642 },
        { id: 'darjeeling_in', mainText: 'Darjeeling', secondaryText: 'West Bengal, India', lat: 27.0410, lng: 88.2663 },
        { id: 'manali_in', mainText: 'Manali', secondaryText: 'Himachal Pradesh, India', lat: 32.2396, lng: 77.1887 },
        { id: 'goa_in', mainText: 'Goa', secondaryText: 'State, India', lat: 15.2993, lng: 74.1240 },
        { id: 'pondicherry_in', mainText: 'Pondicherry', secondaryText: 'Union Territory, India', lat: 11.9416, lng: 79.8083 },
        { id: 'amritsar_in', mainText: 'Amritsar', secondaryText: 'Punjab, India', lat: 31.6340, lng: 74.8723 },
        { id: 'varanasi_in', mainText: 'Varanasi', secondaryText: 'Uttar Pradesh, India', lat: 25.3176, lng: 82.9739 },
        { id: 'mysore_in', mainText: 'Mysore', secondaryText: 'Karnataka, India', lat: 12.2958, lng: 76.6394 },
        { id: 'udaipur_in', mainText: 'Udaipur', secondaryText: 'Rajasthan, India', lat: 24.5854, lng: 73.7125 },
        { id: 'jodhpur_in', mainText: 'Jodhpur', secondaryText: 'Rajasthan, India', lat: 26.2389, lng: 73.0243 },
        { id: 'raipur_in', mainText: 'Raipur', secondaryText: 'Chhattisgarh, India', lat: 21.2514, lng: 81.6296 },
        { id: 'ranchi_in', mainText: 'Ranchi', secondaryText: 'Jharkhand, India', lat: 23.3441, lng: 85.3096 },
        // Add more real Indian places as needed
      ];
      
      // Find the place by ID
      const place = indianPlaces.find(p => p.id === placeId);
      
      if (place) {
        console.log(`Found place details for: ${place.mainText}`);
        
        // Extract state from secondary text
        const stateMatch = place.secondaryText.match(/([^,]+),\s*India/);
        const stateName = stateMatch ? stateMatch[1].trim() : '';
        
        return {
          latitude: place.lat,
          longitude: place.lng,
          formattedAddress: `${place.mainText}, ${place.secondaryText}`,
          city: place.mainText,
          state: stateName,
          pincode: '',  // We don't have pincode data in our simplified approach
          country: 'India'
        };
      }
      
      throw new Error('Place not found in our database');
    } catch (error) {
      console.error('Error getting place details:', error);
      Alert.alert('Error', 'Could not get details for this location. Please try another one.');
      return null;
    }
  };

  // Handle selecting a location from suggestions
  const handleSelectSuggestion = async (suggestion) => {
    // Skip if this is a loading indicator
    if (suggestion.isLoading) return;
    
    setIsFetchingSuggestions(true);
    setSelectedFromSuggestion(true);
    Keyboard.dismiss();
    setSearchQuery(suggestion.description || suggestion.mainText);
    setSuggestions([]);
    
    try {
      console.log(`Selected location: ${suggestion.mainText}, ${suggestion.secondaryText}`);
      
      // With our new implementation, we already have coordinates in the suggestion
      const newMarker = {
        latitude: suggestion.latitude,
        longitude: suggestion.longitude
      };
      
      // Update the region to center on the selected location
      const newRegion = {
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      };
      
      // Update map and marker
      setRegion(newRegion);
      setMarker(newMarker);
      mapRef.current?.animateToRegion(newRegion, 500);
      
      // Create selected location object
      const formattedAddress = suggestion.description || `${suggestion.mainText}, ${suggestion.secondaryText}`;
      
      // Extract city and state from secondary text if available
      let city = suggestion.mainText;
      let state = '';
      
      if (suggestion.secondaryText) {
        const parts = suggestion.secondaryText.split(',');
        if (parts.length > 1) {
          state = parts[0].trim();
        }
      }
      
      setSelected({
        coordinates: { 
          type: 'Point', 
          coordinates: [suggestion.longitude, suggestion.latitude] 
        },
        address: formattedAddress,
        city: city,
        state: state,
        country: 'India'
      });
      
      console.log(`Location selected: ${formattedAddress}`);
    } catch (error) {
      console.error('Error selecting location:', error);
      Alert.alert('Error', 'Could not select this location. Please try another one.');
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  // Handle map press - allow user to drop a pin anywhere
  const handleMapPress = async (event) => {
    const { coordinate } = event.nativeEvent;
    console.log('Map pressed at:', coordinate);
    
    // Update the marker position
    setMarker(coordinate);
    
    // Don't reset search query when manually placing a marker
    setSelectedFromSuggestion(false);
    
    // Clear any existing suggestions
    setSuggestions([]);
    
    // Animate map to center on the pressed location
    mapRef.current?.animateToRegion({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    }, 300);
    
    // Get address details for the pressed location
    await reverseGeocode(coordinate.latitude, coordinate.longitude);
  };

  // Confirm and return the selected location
  const confirmLocation = () => {
    if (!selected) {
      Alert.alert('No Location Selected', 'Please select a location first.');
      return;
    }
    
    console.log('Confirming selected location:', selected);
    
    // Make sure selected location has all required fields
    const locationToReturn = {
      ...selected,
      coordinates: selected.coordinates || { 
        type: 'Point',
        coordinates: [marker.longitude, marker.latitude]
      },
      address: selected.address || 'Selected location',
      city: selected.city || '',
      state: selected.state || '',
      country: selected.country || 'India'
    };
    
    // Return the selected location to the calling screen
    onSelectLocation(locationToReturn);
    navigation.goBack();
  };

  // Clear search query and suggestions
  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    searchInputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        onPress={handleMapPress}
        onRegionChangeComplete={(newRegion) => {
          setRegion(newRegion);
          console.log('Map region changed:', newRegion);
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {marker && (
          <Marker
            coordinate={marker}
            draggable
            onDragEnd={(e) => handleMapPress(e)}
            onPress={() => console.log('Marker pressed')}
          >
            <View style={styles.markerContainer}>
              <View style={styles.marker} />
              <View style={styles.markerDot} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search for any place in India..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        {/* Location suggestions */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {isFetchingSuggestions ? (
              <ActivityIndicator style={styles.suggestionsLoader} color="#0066cc" />
            ) : (
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.id || Math.random().toString()}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  item.isLoading ? (
                    <View style={styles.loadingSuggestion}>
                      <ActivityIndicator size="small" color="#0066cc" />
                      <Text style={styles.loadingText}>{item.mainText}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <Ionicons name="location" size={20} color="#0066cc" style={styles.suggestionIcon} />
                      <View style={styles.suggestionTextContainer}>
                        <Text style={styles.suggestionMainText}>{item.mainText}</Text>
                        <Text style={styles.suggestionSecondaryText}>{item.secondaryText}</Text>
                      </View>
                    </TouchableOpacity>
                  )
                )}
                style={styles.suggestionsList}
              />
            )}
          </View>
        )}
      </View>

      {/* Location details card */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Selected Location</Text>
        
        {isLoading ? (
          <ActivityIndicator size="small" color="#0066cc" />
        ) : selected ? (
          <>
            <Text style={styles.addressText}>{selected.formattedAddress}</Text>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>City:</Text>
              <Text style={styles.detailsValue}>{selected.city || 'N/A'}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>State:</Text>
              <Text style={styles.detailsValue}>{selected.state || 'N/A'}</Text>
            </View>
            {selected.pincode && (
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>PIN Code:</Text>
                <Text style={styles.detailsValue}>{selected.pincode}</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.noSelectionText}>Tap on the map or search for a location</Text>
        )}
        
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !selected && styles.confirmButtonDisabled
          ]}
          onPress={confirmLocation}
          disabled={!selected}
        >
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>

      {/* Current location button */}
      <TouchableOpacity
        style={styles.currentLocationButton}
        onPress={getCurrentLocation}
      >
        <Ionicons name="locate" size={24} color="#0066cc" />
      </TouchableOpacity>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  loadingSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width,
    height: height * 0.65,
  },
  markerContainer: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 102, 204, 0.3)',
    borderWidth: 2,
    borderColor: '#0066cc',
  },
  markerDot: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: '#0066cc',
    position: 'absolute',
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 10,
    right: 10,
    zIndex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 5,
    maxHeight: 250,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  suggestionsLoader: {
    padding: 15,
  },
  suggestionsList: {
    borderRadius: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: '#777',
    marginTop: 3,
  },
  detailsCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  addressText: {
    fontSize: 16,
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailsLabel: {
    fontSize: 15,
    color: '#666',
    width: 80,
  },
  detailsValue: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  noSelectionText: {
    fontSize: 15,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  confirmButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    paddingVertical: 15,
    marginTop: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  currentLocationButton: {
    position: 'absolute',
    right: 15,
    top: height * 0.2,
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});
