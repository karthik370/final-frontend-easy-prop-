// This function focuses on getting the actual device location
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
    
    // First try with exponentially increasing timeouts for better chances on different devices
    let currentLocation = null;
    
    try {
      // Try multiple approaches to get a reliable location
      // Method 1: Get using navigator.geolocation if available (often better on real devices)
      if (navigator && navigator.geolocation && navigator.geolocation.getCurrentPosition) {
        try {
          console.log('Attempting to get location using navigator.geolocation...');
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                currentLocation = {
                  coords: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                  }
                };
                console.log(`Navigator location found: ${position.coords.latitude}, ${position.coords.longitude}`);
                resolve();
              },
              (error) => {
                console.log('Navigator geolocation error:', error);
                reject(error);
              },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
          });
        } catch (error) {
          console.log('Navigator method failed:', error);
        }
      }
      
      // Method 2: If navigator method didn't work, use Expo's Location API with high accuracy
      if (!currentLocation) {
        console.log('Using Expo Location with high accuracy...');
        currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 0,  // Get fresh location
          mayShowUserSettingsDialog: true
        });
      }
      
      // At this point we should have a location from one of the methods
      if (currentLocation) {
        const { latitude, longitude, accuracy } = currentLocation.coords;
        console.log(`Location acquired: ${latitude}, ${longitude} (${accuracy || 'unknown'}m accuracy)`);
        
        // Check if this is a mock location from the emulator (California coordinates)
        if ((Math.abs(latitude - 37.42) < 1 && Math.abs(longitude - (-122.08)) < 1) ||
            (Math.abs(latitude - 37.78) < 1 && Math.abs(longitude - (-122.4)) < 1)) {
          console.log('Detected mock location from emulator');
          
          // If in emulator, give user control to set their own location
          Alert.alert(
            'Emulator Detected',
            'We detected you are using an emulator. Please use the map to manually select your current location.',
            [{ text: 'OK' }]
          );
        } else {
          // Real device location - update the map
          setRegion({
            latitude,
            longitude,
            latitudeDelta: 0.005, // Tight zoom for precision
            longitudeDelta: 0.005
          });
          
          setMarkerPosition({
            latitude,
            longitude
          });
          
          // Get address details using reverse geocoding
          const addressData = await reverseGeocode(latitude, longitude);
          console.log('Address found:', addressData);
        }
        
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('All location methods failed:', error);
      Alert.alert(
        'Location Error',
        'Could not get your current location. Please select your location manually on the map.',
        [{ text: 'OK' }]
      );
      setIsLoading(false);
    }
  } catch (error) {
    console.error('Error in getMyLocation:', error);
    setIsLoading(false);
  }
};
