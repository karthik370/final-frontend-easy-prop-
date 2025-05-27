import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Share, Alert, FlatList, Linking } from 'react-native';

// Import centralized server configuration
import { SERVER_URL } from '../config/ip-config';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

// Components that would be created in a complete implementation
// import ImageCarousel from '../components/ImageCarousel';
// import AmenitiesList from '../components/AmenitiesList';
// import PropertyMap from '../components/PropertyMap';

const { width } = Dimensions.get('window');

const PropertyDetailsScreen = ({ route, navigation }) => {
  // Accept either a property object directly or just a propertyId
  const { property: propFromRoute, propertyId } = route.params;
  const [property, setProperty] = useState(propFromRoute || null);
  const [isLoading, setIsLoading] = useState(!propFromRoute);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const { user, userToken } = useContext(AuthContext);

  useEffect(() => {
    // If we already have the property from route params, we don't need to fetch it again
    if (!property && propertyId) {
      fetchPropertyDetails();
    }
    
    if (userToken && (propertyId || (property && property._id))) {
      checkIfFavorite();
    }
  }, [propertyId, property]);

  // DIRECT fetch property details from MongoDB Atlas
  const fetchPropertyDetails = async () => {
    // Skip if we already have property data or no propertyId
    if (property || !propertyId) return;
    
    setIsLoading(true);
    console.log('DIRECT FETCH: Getting property details from MongoDB Atlas...');
    
    try {
      // Use SERVER_URL from centralized config for consistency
      const apiUrl = `${SERVER_URL}/api/properties/${propertyId}`;
      console.log('Using centralized SERVER_URL for property details:', apiUrl);
      
      // Simple fetch request
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      // Parse the JSON response directly
      const data = await response.json();
      console.log('PROPERTY DETAILS FROM MONGODB ATLAS:', data);
      
      setProperty(data);
      setIsLoading(false);
    } catch (error) {
      console.error('MONGODB ATLAS ERROR:', error.message);
      setIsLoading(false);
      Alert.alert('Error', 'Could not fetch property details from MongoDB Atlas');
    }
  };

  // DIRECT check if property is favorited in MongoDB Atlas
  const checkIfFavorite = async () => {
    if (!userToken) return;
    
    console.log('DIRECT FETCH: Checking favorites in MongoDB Atlas...');
    
    try {
      // Use SERVER_URL from centralized config for consistency
      const apiUrl = `${SERVER_URL}/api/properties/favorites`;
      console.log('Using centralized SERVER_URL for favorites check:', apiUrl);
      
      // Simple fetch request with authentication
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      // Parse the JSON response directly
      const favorites = await response.json();
      console.log('FAVORITES FROM MONGODB ATLAS:', favorites);
      
      // Check if this property is in favorites
      const isFav = favorites.some(fav => fav._id === (propertyId || (property && property._id)));
      console.log('Is property favorited:', isFav);
      
      setIsFavorite(isFav);
    } catch (error) {
      console.error('MONGODB ATLAS FAVORITES ERROR:', error.message);
    }
  };

  const toggleFavorite = async () => {
    if (!userToken) {
      Alert.alert(
        'Authentication Required',
        'Please sign in to save properties to your favorites.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Auth') }
        ]
      );
      return;
    }

    try {
      if (isFavorite) {
        await axios.delete(`${SERVER_URL}/api/properties/${propertyId}/favorite`, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        });
        setIsFavorite(false);
        Alert.alert('Success', 'Property removed from favorites');
      } else {
        await axios.post(`${SERVER_URL}/api/properties/${propertyId}/favorite`, {}, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        });
        setIsFavorite(true);
        Alert.alert('Success', 'Property added to favorites');
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
      Alert.alert('Error', 'Failed to update favorites. Please try again.');
    }
  };

  const handleCall = () => {
    if (!property?.contactInfo?.phone) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }

    if (!property.contactInfo.showPhone && property.owner?._id !== user?._id) {
      Alert.alert('Restricted', 'This seller has chosen not to display their phone number');
      return;
    }

    Linking.openURL(`tel:${property.contactInfo.phone}`);
  };

  const handleChat = () => {
    if (!userToken) {
      Alert.alert(
        'Authentication Required',
        'Please sign in to chat with the seller.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Auth') }
        ]
      );
      return;
    }

    // Log the full property object to debug issues
    console.log('Full property object:', JSON.stringify(property, null, 2));
    
    // Check if we have full property data
    if (!property || !property._id) {
      Alert.alert('Error', 'Cannot start chat - property information is missing');
      return;
    }

    // Create a valid owner object with default values if missing
    const ownerInfo = {
      _id: property.owner?._id || '000000000000000000000000',
      name: property.owner?.name || 'Property Seller',
      phone: property.owner?.phone || 'Not available',
      email: property.owner?.email || 'contact@example.com'
    };
    
    console.log('Starting chat with property owner:', ownerInfo);

    // Create chat params with complete information
    const chatParams = {
      // Pass complete recipient object
      recipient: ownerInfo,
      propertyId: property._id,
      propertyTitle: property.title || 'Property Listing',
      // Add property image for the chat thumbnail if available
      propertyImage: property.images && property.images.length > 0 ? property.images[0] : null,
      // Add property owner name for the chat title
      userName: ownerInfo.name
    };

    console.log('Chat navigation params:', chatParams);

    // Navigate to Chat with the correct parameters (name must match Stack.Screen name)
    navigation.navigate('Chat', chatParams);
    
    Alert.alert(
      'Starting Chat',
      `Connecting to ${ownerInfo.name}...`,
      [{ text: 'OK' }]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this property: ${property.title} - ₹${property.price.toLocaleString()} - Esay RealEstate App`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleViewMap = () => {
    navigation.navigate('ViewMap', {
      propertyId: property._id,
      location: property.location.coordinates,
      title: property.title
    });
  };

  // Mock data function for demo purposes
  const getMockPropertyDetails = () => ({
    _id: '1',
    title: '3 BHK Apartment in Whitefield',
    description: 'Spacious 3 BHK apartment with modern amenities including swimming pool, gym, and children\'s play area. The apartment is well-ventilated with natural light throughout the day. It features a large balcony with garden view, modular kitchen with granite countertop, and premium vitrified tile flooring. The complex has 24x7 security and power backup.',
    price: 25000,
    propertyType: 'Flat',
    category: 'Rent',
    bhk: 3,
    area: { value: 1450, unit: 'sqft' },
    furnishing: 'Semi-Furnished',
    amenities: ['Swimming Pool', 'Gym', 'Children\'s Play Area', '24x7 Security', 'Power Backup', 'Parking'],
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
      'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
    ],
    location: {
      address: 'Palm Meadows, Whitefield',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      coordinates: {
        type: 'Point',
        coordinates: [77.750923, 12.978134] // [longitude, latitude]
      }
    },
    owner: {
      _id: 'owner1',
      name: 'John Doe',
      phone: '9876543210',
      email: 'john@example.com'
    },
    contactInfo: {
      name: 'John Doe',
      phone: '9876543210',
      email: 'john@example.com',
      showPhone: true,
      showEmail: false
    },
    status: 'active',
    views: 156,
    createdAt: '2025-04-15T10:30:00.000Z'
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading property details...</Text>
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#ff6600" />
        <Text style={styles.errorText}>Property not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / width
              );
              setCurrentImageIndex(index);
            }}
          >
            {/* Add robust image handling with priority for Cloudinary images */}
            {property.images && Array.isArray(property.images) && property.images.length > 0 ? (
              property.images.map((image, index) => {
                // Check if this is a Cloudinary URL
                const isCloudinaryImage = typeof image === 'string' && 
                  (image.includes('cloudinary.com') || image.includes('res.cloudinary.com'));
                
                // Log the image source for debugging
                if (isCloudinaryImage) {
                  console.log(`Image ${index}: Using Cloudinary URL`, image.substring(0, 50) + '...');
                } else if (typeof image === 'string' && image.startsWith('http')) {
                  console.log(`Image ${index}: Using web URL`, image.substring(0, 50) + '...');
                } else if (typeof image === 'string') {
                  console.log(`Image ${index}: Using local path`, image.substring(0, 50) + '...');
                }
                
                // Always use the URI directly, but add better error handling
                return (
                  <View key={index} style={styles.propertyImage}>
                    <Image
                      source={{ uri: image }}
                      style={styles.fullImage}
                      resizeMode="cover"
                      // Add error handling for images that fail to load
                      onError={() => console.log(`Failed to load image ${index}:`, image.substring(0, 50) + '...')}
                    />
                  </View>
                );
              })
            ) : (
              // Default placeholder when no images are available
              <View style={[styles.propertyImage, {backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center'}]}>
                <Ionicons name="image-outline" size={50} color="#ccc" />
                <Text style={{fontSize: 16, color: '#888', marginTop: 10}}>No Images Available</Text>
              </View>
            )}
          </ScrollView>
          
          {/* Image Pagination Dots - only show if we have images */}
          {property.images && Array.isArray(property.images) && property.images.length > 0 && (
            <View style={styles.pagination}>
              {property.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    currentImageIndex === index && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
        
        {/* Top Header Actions */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.rightHeaderActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={toggleFavorite}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? '#ff6666' : '#fff'}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleShare}
            >
              <Ionicons name="share-social-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Property Tag */}
        <View 
          style={[
            styles.propertyTagContainer,
            { backgroundColor: property.category === 'Sell' ? '#25d366' : '#0066cc' }
          ]}
        >
          <Text style={styles.propertyTagText}>
            {property.category === 'Sell' ? 'For Sale' : 'For Rent'}
          </Text>
        </View>
        
        {/* Property Details */}
        <View style={styles.detailsContainer}>
          {/* Price & Title Section */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              ₹{property.price.toLocaleString()}
              {property.category === 'Rent' && <Text style={styles.perMonth}>/month</Text>}
            </Text>
            <Text style={styles.title}>{property.title}</Text>
            <Text style={styles.address}>
              <Ionicons name="location-outline" size={16} color="#666" />
              {' '}{property.location.address}, {property.location.city}
            </Text>
            <Text style={styles.postedDate}>
              Posted on {formatDate(property.createdAt)}
            </Text>
          </View>
          
          {/* Key Features */}
          <View style={styles.featuresContainer}>
            <Text style={styles.sectionTitle}>Key Features</Text>
            <View style={styles.featuresGrid}>
              {property.bhk && (
                <View style={styles.featureItem}>
                  <Ionicons name="bed-outline" size={20} color="#0066cc" />
                  <Text style={styles.featureValue}>{property.bhk} BHK</Text>
                  <Text style={styles.featureLabel}>Bedrooms</Text>
                </View>
              )}
              
              <View style={styles.featureItem}>
                <Ionicons name="square-outline" size={20} color="#0066cc" />
                <Text style={styles.featureValue}>
                  {property.area.value} {property.area.unit}
                </Text>
                <Text style={styles.featureLabel}>Carpet Area</Text>
              </View>
              
              <View style={styles.featureItem}>
                <Ionicons name="home-outline" size={20} color="#0066cc" />
                <Text style={styles.featureValue}>{property.furnishing}</Text>
                <Text style={styles.featureLabel}>Furnishing</Text>
              </View>
              
              <View style={styles.featureItem}>
                <Ionicons name="business-outline" size={20} color="#0066cc" />
                <Text style={styles.featureValue}>{property.propertyType}</Text>
                <Text style={styles.featureLabel}>Property Type</Text>
              </View>
            </View>
          </View>
          
          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{property.description}</Text>
          </View>
          
          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <View style={styles.amenitiesContainer}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesList}>
                {property.amenities.map((amenity, index) => (
                  <View key={index} style={styles.amenityItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#25d366" />
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* Location Map Preview */}
          <View style={styles.mapContainer}>
            <Text style={styles.sectionTitle}>Location</Text>
            <TouchableOpacity 
              style={styles.mapPreview}
              onPress={handleViewMap}
            >
              <Image 
                style={{...styles.mapImage, backgroundColor: '#d1e0ff'}}
                resizeMode="cover"
              />
              <View style={styles.viewMapButton}>
                <Text style={styles.viewMapText}>View on Map</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.locationFullAddress}>
              {property.location.address}, {property.location.city}, {property.location.state}, {property.location.country}
            </Text>
          </View>
          
          {/* Seller Information */}
          <View style={styles.sellerContainer}>
            <Text style={styles.sectionTitle}>Seller Information</Text>
            <View style={styles.sellerInfo}>
              <Ionicons name="person-circle-outline" size={50} color="#666" style={styles.sellerAvatar} />
              <View style={styles.sellerDetails}>
                <Text style={styles.sellerName}>{property.owner.name}</Text>
                {property.contactInfo.showEmail && (
                  <Text style={styles.sellerContact}>
                    <Ionicons name="mail-outline" size={14} color="#666" />
                    {' '}{property.contactInfo.email}
                  </Text>
                )}
                {property.contactInfo.showPhone && (
                  <Text style={styles.sellerContact}>
                    <Ionicons name="call-outline" size={14} color="#666" />
                    {' '}{property.contactInfo.phone}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.callButton} onPress={handleCall}>
          <Ionicons name="call" size={20} color="#fff" />
          <Text style={styles.callButtonText}>Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
          <Ionicons name="chatbubble" size={20} color="#fff" />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginTop: 10,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainer: {
    position: 'relative',
    height: 300,
    width: '100%',
  },
  propertyImage: {
    width,
    height: 300,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  pagination: {
    position: 'absolute',
    bottom: 15,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
  },
  headerActions: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  backIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightHeaderActions: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  propertyTagContainer: {
    position: 'absolute',
    top: 10,
    left: 50,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  propertyTagText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingBottom: 80, // Extra space for bottom bar
  },
  priceContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  perMonth: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#666',
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
    marginTop: 5,
    marginBottom: 10,
  },
  address: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  postedDate: {
    fontSize: 14,
    color: '#999',
  },
  featuresContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  featureValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  featureLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  descriptionContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  amenitiesContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  amenitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 10,
  },
  amenityText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  mapContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mapPreview: {
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  viewMapButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#0066cc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  viewMapText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationFullAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  sellerContainer: {
    padding: 20,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    marginRight: 15,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sellerContact: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#25d366',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginRight: 10,
  },
  callButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginLeft: 10,
  },
  chatButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default PropertyDetailsScreen;
