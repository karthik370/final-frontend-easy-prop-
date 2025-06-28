import React, { useState, useEffect, useContext } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { FavoritesContext } from '../context/FavoritesContext';
import { AuthContext } from '../context/AuthContext';
// Make sure getRandomFallbackImage and styles are defined/imported in this file or above

const PropertyImage = ({ imageUri }) => {
  const [loading, setLoading] = useState(true);
  const [imageSource, setImageSource] = useState(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        if (imageUri && typeof imageUri === 'string' && imageUri.startsWith('http')) {
          setImageSource({ uri: imageUri });
        } else {
          setImageSource({ uri: getRandomFallbackImage() });
        }
      } catch (error) {
        setImageSource({ uri: getRandomFallbackImage() });
      }
      setLoading(false);
    };
    loadImage();
  }, [imageUri]);

  return (
    <View style={{ height: 200, backgroundColor: '#f8f8f8', position: 'relative' }}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      ) : (
        <Image
          source={imageSource || { uri: getRandomFallbackImage() }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onError={() => setImageSource({ uri: getRandomFallbackImage() })}
        />
      )}
    </View>
  );
};


const PropertyCard = ({ property, onPress, navigation }) => {
  if (!property || typeof property !== 'object' || !property._id) return null; // Defensive: don't render if property is missing or malformed
  // Access favorites context for real-time updates
  const { isFavorite, toggleFavorite } = useContext(FavoritesContext);
  const { userToken } = useContext(AuthContext);
  
  // Local state for loading status during favorite toggle
  const [isToggling, setIsToggling] = useState(false);
  
  // Check if this property is favorited
  const favorited = isFavorite(property._id);

  // Handle favorite button press
  const handleFavoritePress = async (e) => {
    e.stopPropagation(); // Prevent card touch
    
    if (!userToken) {
      Alert.alert(
        'Authentication Required',
        'Please sign in to save properties to your favorites.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation?.navigate('ProfileTab', { screen: 'Profile' }) }
        ]
      );
      return;
    }
    
    setIsToggling(true);
    try {
      const newStatus = await toggleFavorite(property._id, property);
      
      // Show a short confirmation
      if (newStatus) {
        Alert.alert('Added to Favorites', 'Property added to your favorites');
      } else {
        Alert.alert('Removed from Favorites', 'Property removed from your favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsToggling(false);
    }
  };
  
  // Format price based on property category
  const formatPrice = () => {
    if (property.category === 'Sell') {
      return `₹${property.price.toLocaleString()}`;
    } else {
      return `₹${property.price.toLocaleString()}/month`;
    }
  };

  // Get appropriate property tag based on type and category
  const getPropertyTag = () => {
    if (property.propertyType === 'Hostel') {
      return 'Hostel';
    }
    if (property.propertyType === 'PG') {
      return 'PG';
    }
    if (property.category === 'Sell') {
      return 'For Sale';
    }
    return 'For Rent';
  };

  // Get tag color based on property category
  const getTagColor = () => {
    if (property.propertyType === 'Hostel') {
      return '#8e44ad'; // A distinct purple for Hostels
    }
    if (property.propertyType === 'PG') {
      return '#ff6600';
    }
    if (property.category === 'Sell') {
      return '#25d366';
    }
    return '#0066cc';
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.imageContainer}>
        {property.images && property.images.length > 0 ? (
          <PropertyImage imageUri={property.images[0]} />
        ) : (
          <Image
            source={{ uri: 'https://dummyimage.com/300x200/e0e0e0/666666.jpg&text=No+Image' }}
            style={styles.image}
            resizeMode="cover"
          />
        )}
        <View style={[styles.tag, { backgroundColor: getTagColor() }]}>
          <Text style={styles.tagText}>{getPropertyTag()}</Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.price}>{formatPrice()}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {property.title}
        </Text>

        <View style={styles.infoRow}>
          {property.bhk && (
            <View style={styles.infoItem}>
              <Ionicons name="bed-outline" size={16} color="#666" />
              <Text style={styles.infoText}>{property.bhk} BHK</Text>
            </View>
          )}
          {property.propertyType === 'PG' || property.propertyType === 'Hostel' ? (
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="bed" size={18} color="#555" style={{ marginRight: 4 }} />
              <Text style={styles.infoText}>{property.pgRoomType || 'Room'}</Text>
            </View>
          ) : (
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="ruler-square" size={18} color="#555" style={{ marginRight: 4 }} />
              <Text style={styles.infoText}>{property.area?.value ? `${property.area.value} ${property.area.unit}` : ''}</Text>
            </View>
          )}
          {property.propertyType === 'PG' || property.propertyType === 'Hostel' ? (
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="shower" size={18} color="#555" style={{ marginRight: 4 }} />
              <Text style={styles.infoText}>{property.pgBathroomType || 'Bathroom'}</Text>
              <MaterialCommunityIcons name="wifi" size={18} color={property.pgWifi ? '#2ecc71' : '#ccc'} style={{ marginLeft: 10, marginRight: 2 }} />
              <Text style={styles.infoText}>{property.pgWifi ? 'Wi-Fi' : 'No Wi-Fi'}</Text>
              <MaterialCommunityIcons name="washing-machine" size={18} color={property.pgLaundry ? '#2ecc71' : '#ccc'} style={{ marginLeft: 10, marginRight: 2 }} />
              <Text style={styles.infoText}>{property.pgLaundry ? 'Laundry' : 'No Laundry'}</Text>
            </View>
          ) : null}
          {property.furnishing && (
            <View style={styles.infoItem}>
              <Ionicons name="home-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                {property.furnishing === 'Fully Furnished'
                  ? 'Furnished'
                  : property.furnishing === 'Semi-Furnished'
                  ? 'Semi-Furn'
                  : 'Unfurnished'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.locationText} numberOfLines={1}>
            {property.location.address}
          </Text>
        </View>

        {/* Favorite button */}
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          disabled={isToggling}
        >
          {isToggling ? (
            <ActivityIndicator size="small" color="#ff3b30" />
          ) : (
            <Ionicons 
              name={favorited ? "heart" : "heart-outline"} 
              size={22} 
              color={favorited ? "#ff3b30" : "#777"} 
            />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  noImageContainer: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#999',
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,                      // Increased border radius for more modern look
    marginHorizontal: 16,                  // Slightly increased horizontal margin
    marginVertical: 10,                    // Increased vertical margin for better spacing
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },  // Increased shadow offset
    shadowOpacity: 0.15,                   // Increased shadow opacity
    shadowRadius: 4,                       // Increased shadow radius
    elevation: 3,                         // Increased elevation for Android
    overflow: 'hidden',
    borderWidth: 1,                       // Added subtle border
    borderColor: '#f0f0f0',               // Light border color
  },
  imageContainer: {
    position: 'relative',
    height: 180,
    backgroundColor: '#f9f9f9',           // Added background color for image container
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tag: {
    position: 'absolute',
    top: 12,                              // Adjusted position
    right: 12,                            // Adjusted position
    paddingHorizontal: 12,                // Increased padding
    paddingVertical: 6,                   // Increased padding
    borderRadius: 6,                      // Increased border radius
    shadowColor: '#000',                  // Added shadow to tag
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tagText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,                  // Added letter spacing
  },
  detailsContainer: {
    marginTop:10,
    padding: 16,                          // Increased padding
    paddingBottom: 18,                    // Extra padding at bottom
  },
  price: {
    fontSize: 20,                       // Increased font size
    fontWeight: 'bold',
    color: '#111',                       // Darker color for better contrast
    marginBottom: 6,                     // Slightly increased margin
    letterSpacing: 0.3,                 // Added letter spacing
  },
  title: {
    fontSize: 16,
    fontWeight: '600',                   // Increased font weight
    color: '#333',
    marginBottom: 12,                    // Increased margin
    lineHeight: 22,                     // Added line height
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,                    // Increased margin
    flexWrap: 'wrap',                   // Allow wrapping for small screens
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,                     // Increased margin
    marginBottom: 4,                    // Added bottom margin for wrapped items
    backgroundColor: '#f8f8f8',         // Added subtle background
    paddingHorizontal: 8,               // Added padding
    paddingVertical: 4,                 // Added padding
    borderRadius: 4,                    // Added border radius
  },
  infoText: {
    fontSize: 14,
    color: '#444',                       // Darkened color for better readability
    marginLeft: 5,                       // Increased margin
    fontWeight: '500',                  // Added font weight
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,                       // Added top margin
    backgroundColor: '#f0f7ff',         // Light blue background
    paddingHorizontal: 8,               // Added padding
    paddingVertical: 6,                 // Added padding
    borderRadius: 6,                    // Added border radius
  },
  locationText: {
    fontSize: 14,
    color: '#0066cc',                    // Changed to blue to indicate location
    marginLeft: 5,                       // Increased margin
    flex: 1,
    fontWeight: '500',                  // Added font weight
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,                          // Increased size
    height: 40,                          // Increased size
    borderRadius: 20,                    // Increased border radius
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },// Increased shadow offset
    shadowOpacity: 0.25,                 // Increased shadow opacity
    shadowRadius: 3,                     // Increased shadow radius
    elevation: 4,                        // Increased elevation
    borderWidth: 1,                      // Added border
    borderColor: '#f0f0f0',              // Light border color
  },
});

export default PropertyCard;
