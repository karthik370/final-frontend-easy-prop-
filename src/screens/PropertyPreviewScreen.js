import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const PropertyPreviewScreen = ({ route, navigation }) => {
  const { property } = route.params;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Format price based on property category
  const formatPrice = () => {
    if (property.category === 'Sell') {
      return `₹${parseFloat(property.price).toLocaleString()}`;
    } else {
      return `₹${parseFloat(property.price).toLocaleString()}/month`;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          {property.images && property.images.length > 0 ? (
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
              {property.images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image }}
                  style={styles.propertyImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={80} color="#ccc" />
              <Text style={styles.imagePlaceholderText}>No Images Added</Text>
            </View>
          )}
          
          {/* Image Pagination Dots */}
          {property.images && property.images.length > 0 && (
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
          
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
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
        </View>
        
        {/* Property Details */}
        <View style={styles.detailsContainer}>
          {/* Price & Title Section */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {formatPrice()}
            </Text>
            <Text style={styles.title}>{property.title}</Text>
            <Text style={styles.address}>
              <Ionicons name="location-outline" size={16} color="#666" />
              {' '}{property.location.address}, {property.location.city}
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
                  {property.areaValue} {property.areaUnit}
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
          
          {/* Location */}
          <View style={styles.locationContainer}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationBox}>
              <Ionicons name="location" size={24} color="#0066cc" style={styles.locationIcon} />
              <View style={styles.locationDetails}>
                <Text style={styles.locationText}>
                  {property.location.address}
                </Text>
                <Text style={styles.locationText}>
                  {property.location.city}, {property.location.state}, {property.location.country}
                </Text>
                <Text style={styles.coordinatesText}>
                  Coordinates: {property.location.coordinates?.coordinates[1]?.toFixed(6)}, {property.location.coordinates?.coordinates[0]?.toFixed(6)}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Seller Information */}
          <View style={styles.sellerContainer}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.sellerInfo}>
              <Ionicons name="person-circle-outline" size={50} color="#666" style={styles.sellerAvatar} />
              <View style={styles.sellerDetails}>
                <Text style={styles.sellerName}>{property.contactInfo.name}</Text>
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
          
          <Text style={styles.previewNote}>
            This is a preview of how your property listing will appear to others.
          </Text>
          
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="create-outline" size={20} color="#0066cc" />
            <Text style={styles.editButtonText}>Edit Listing</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  imageContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  propertyImage: {
    width,
    height: 300,
  },
  imagePlaceholder: {
    width,
    height: 300,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
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
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  propertyTagContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 5,
  },
  propertyTagText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    padding: 20,
    paddingBottom: 30,
  },
  priceContainer: {
    marginBottom: 20,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  address: {
    fontSize: 16,
    color: '#666',
  },
  featuresContainer: {
    marginBottom: 20,
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
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
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
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  amenitiesContainer: {
    marginBottom: 20,
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
    marginLeft: 8,
  },
  locationContainer: {
    marginBottom: 20,
  },
  locationBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 15,
  },
  locationIcon: {
    marginRight: 10,
  },
  locationDetails: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  sellerContainer: {
    marginBottom: 20,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
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
  previewNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0066cc',
    borderRadius: 5,
    paddingVertical: 10,
  },
  editButtonText: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '500',
    marginLeft: 5,
  },
});

export default PropertyPreviewScreen;
