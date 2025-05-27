import React, { createContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setLocationPermission(true);
        getCurrentLocation();
      } else {
        setLocationPermission(false);
        setError('Location permission denied');
      }
    } catch (error) {
      setError('Failed to request location permission');
      console.log('Location permission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    setIsLoading(true);
    setError(null);
    
    // Check if location permission is granted first
    if (!locationPermission) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission is required to use this feature');
          setIsLoading(false);
          return null;
        }
        setLocationPermission(true);
      } catch (permissionError) {
        console.error('Permission request error:', permissionError);
        setError('Failed to request location permission');
        setIsLoading(false);
        return null;
      }
    }
    
    try {
      // First try to get high accuracy location
      try {
        console.log('Attempting high accuracy location...');
        const { coords } = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          mayShowUserSettingsDialog: true,
          timeInterval: 0,
          distanceInterval: 0
        });
        
        const { latitude, longitude, accuracy } = coords;
        console.log(`High accuracy location acquired: ${latitude}, ${longitude} (${accuracy}m accuracy)`);
        
        setLocation({
          latitude,
          longitude,
          latitudeDelta: 0.0022, // For closer zoom on the map
          longitudeDelta: 0.0021,
          accuracy
        });
        
        // Get address from coordinates (reverse geocoding)
        const addressResponse = await Location.reverseGeocodeAsync({
          latitude,
          longitude
        });
        
        if (addressResponse && addressResponse.length > 0) {
          const addressData = addressResponse[0];
          const formattedAddress = {
            street: addressData.street || '',
            district: addressData.district || '',
            city: addressData.city || addressData.subregion || '',
            state: addressData.region || '',
            country: addressData.country || '',
            postalCode: addressData.postalCode || ''
          };
          
          setAddress(formattedAddress);
          return {
            coords: { latitude, longitude, accuracy },
            address: formattedAddress
          };
        }
        return { coords: { latitude, longitude, accuracy }, address: null };
      } catch (highAccuracyError) {
        // If high accuracy fails, try with balanced accuracy
        console.log('High accuracy location failed, trying balanced accuracy:', highAccuracyError);
        
        const { coords } = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });

        const { latitude, longitude, accuracy } = coords;
        console.log(`Balanced accuracy location acquired: ${latitude}, ${longitude} (${accuracy}m accuracy)`);
        
        setLocation({
          latitude,
          longitude,
          latitudeDelta: 0.0022,
          longitudeDelta: 0.0021,
          accuracy
        });

        // Get address from coordinates
        const addressResponse = await Location.reverseGeocodeAsync({
          latitude,
          longitude
        });
        
        if (addressResponse && addressResponse.length > 0) {
          const addressData = addressResponse[0];
          const formattedAddress = {
            street: addressData.street || '',
            district: addressData.district || '',
            city: addressData.city || addressData.subregion || '',
            state: addressData.region || '',
            country: addressData.country || '',
            postalCode: addressData.postalCode || ''
          };
          
          setAddress(formattedAddress);
          return {
            coords: { latitude, longitude, accuracy },
            address: formattedAddress
          };
        }
        return { coords: { latitude, longitude, accuracy }, address: null };
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setError('Could not get your current location');
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please make sure location services are enabled.',
        [{ text: 'OK' }]
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const geocodeAddress = async (addressText) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const geocodedLocations = await Location.geocodeAsync(addressText);
      
      if (geocodedLocations && geocodedLocations.length > 0) {
        const { latitude, longitude } = geocodedLocations[0];
        
        setLocation({
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421
        });
        
        return { latitude, longitude };
      } else {
        setError('Address not found');
        return null;
      }
    } catch (error) {
      setError('Failed to geocode address');
      console.log('Geocode error:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        address,
        locationPermission,
        isLoading,
        error,
        requestLocationPermission,
        getCurrentLocation,
        geocodeAddress,
        setLocation
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
