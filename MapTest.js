import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Button, Alert } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import Constants from 'expo-constants';

export default function MapTest() {
  const [mapError, setMapError] = useState(null);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    // Get the API key from app.json
    const key = Constants.manifest?.android?.config?.googleMaps?.apiKey || 
                Constants.manifest?.extra?.googleMapsApiKey || 
                'Not found';
    setApiKey(key);
  }, []);

  const handleMapError = (error) => {
    console.error('Map error:', error);
    setMapError(error.message || 'Unknown map error');
    Alert.alert('Map Error', error.message || 'Unknown map error');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map Test Screen</Text>
      <Text style={styles.apiKey}>API Key: {apiKey}</Text>
      
      {mapError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {mapError}</Text>
        </View>
      ) : null}
      
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: 37.78825,
            longitude: -122.4324,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          onError={handleMapError}
        />
      </View>
      
      <Button 
        title="Check Map Status" 
        onPress={() => {
          Alert.alert(
            'Map Status', 
            mapError ? 
              `Error: ${mapError}` : 
              'Map appears to be working correctly'
          );
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  apiKey: {
    fontSize: 12,
    marginBottom: 20,
    color: 'gray',
  },
  mapContainer: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  errorContainer: {
    padding: 10,
    backgroundColor: '#ffeeee',
    borderRadius: 5,
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
  },
});
