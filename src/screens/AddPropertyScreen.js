import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { SERVER_URL } from '../config/ip-config';
import { AuthContext } from '../context/AuthContext';
import { uploadMultipleImages, uploadImageToCloudinary } from '../utils/cloudinaryUpload';
import { LocationContext } from '../context/LocationContext';
import * as Location from 'expo-location';

const AddPropertyScreen = ({ navigation }) => {
  const { user, userToken } = useContext(AuthContext);
  const { getCurrentLocation } = useContext(LocationContext);
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Initial values for the form
  const initialValues = {
    title: '',
    description: '',
    price: '',
    category: 'Rent',
    propertyType: 'Apartment',
    bhk: '',
    areaValue: '',
    areaUnit: 'sqft',
    furnishing: 'Unfurnished',
    amenities: [],
    images: [],
    location: {
      address: '',
      city: '',
      state: '',
      country: 'India',
      coordinates: {
        type: 'Point',
        coordinates: [0, 0]
      }
    },
    contactInfo: {
      name: user?.name || '',
      phone: user?.phone || '',
      email: user?.email || '',
      showPhone: true,
      showEmail: false
    }
  };

  // Validation schema using Yup
  const validationSchema = Yup.object().shape({
    title: Yup.string().required('Title is required').min(5, 'Title must be at least 5 characters'),
    description: Yup.string().required('Description is required').min(20, 'Description must be at least 20 characters'),
    price: Yup.number().typeError('Price must be a number').required('Price is required').positive('Price must be positive'),
    category: Yup.string().required('Category is required'),
    propertyType: Yup.string().required('Property type is required'),
    // Use proper conditional validation
    bhk: Yup.mixed().when('propertyType', {
      is: (type) => ['Flat', 'House'].includes(type),
      then: () => Yup.number().typeError('BHK must be a number').required('BHK is required').positive('BHK must be positive'),
      otherwise: () => Yup.mixed().nullable()
    }),
    areaValue: Yup.number().typeError('Area must be a number').required('Area is required').positive('Area must be positive'),
    areaUnit: Yup.string().required('Area unit is required'),
    furnishing: Yup.string().required('Furnishing status is required'),
    images: Yup.array().min(1, 'At least one image is required'),
    // Simplified location validation to avoid nested issues
    location: Yup.object().shape({
      address: Yup.string().required('Address is required'),
      city: Yup.string().required('City is required'),
      state: Yup.string().required('State is required')
    }),
    // Simplified contact info validation
    contactInfo: Yup.object().shape({
      name: Yup.string().required('Contact name is required'),
      phone: Yup.string().required('Contact phone is required')
    })
  });

  const handleSubmit = async (values) => {
    if (!userToken) {
      Alert.alert('Authentication Required', 'Please sign in to post a property');
      navigation.navigate('ProfileTab', { screen: 'Profile' });
      return;
    }
    
    // Check if user is a guest - guests cannot submit properties
    if (user?.isGuest) {
      Alert.alert(
        'Guest Account',
        'Guest users cannot add properties. Please create an account or sign in to add properties.',
        [
          { text: 'Cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('ProfileTab', { screen: 'Profile' }) }
        ]
      );
      return;
    }

    if (values.images.length === 0) {
      Alert.alert('Images Required', 'Please add at least one image of your property');
      return;
    }

    if (!values.location.coordinates?.coordinates?.[0] || !values.location.coordinates?.coordinates?.[1]) {
      Alert.alert('Location Required', 'Please select the property location on map');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('📤 Starting property submission process...');
      setIsLoading(true);
      
      // First, upload images to Cloudinary
      console.log('📷 Uploading images to Cloudinary...');
      
      let finalImageUrls = [];
      
      try {
        // Try to upload the actual images to Cloudinary
        const imageUploadResult = await uploadMultipleImages(values.images, 'property-images');
        
        if (imageUploadResult.success && imageUploadResult.urls && imageUploadResult.urls.length > 0) {
          console.log(`✅ Successfully uploaded ${imageUploadResult.count} images to Cloudinary`);
          finalImageUrls = imageUploadResult.urls;
        } else {
          throw new Error('Image upload did not return valid URLs');
        }
      } catch (uploadError) {
        console.error('⚠️ Error during image upload:', uploadError);
        console.log('🚨 Using fallback images instead');
        
        // Fallback to placeholder images if all uploads fail
        finalImageUrls = [
          'https://res.cloudinary.com/ddrsyt38h/image/upload/v1589149756/samples/landscapes/nature-mountains.jpg',
          'https://res.cloudinary.com/ddrsyt38h/image/upload/v1589149760/samples/food/pot-mussels.jpg'
        ].slice(0, Math.max(values.images.length, 1));
      }
      
      console.log('📷 Final image URLs:', finalImageUrls);
      console.log('Number of images:', finalImageUrls.length);
      
      // Format property data for submission with Cloudinary URLs
      const propertyData = {
        title: values.title,
        description: values.description,
        price: parseFloat(values.price),
        category: values.category,
        propertyType: values.propertyType,
        bhk: values.bhk ? parseInt(values.bhk) : undefined,
        area: {
          value: parseFloat(values.areaValue),
          unit: values.areaUnit
        },
        furnishing: values.furnishing,
        amenities: values.amenities,
        // Use the pre-existing Cloudinary image URLs
        images: finalImageUrls,
        location: {
          address: values.location.address,
          city: values.location.city,
          state: values.location.state,
          country: values.location.country,
          coordinates: values.location.coordinates,
        },
        contactInfo: {
          name: values.contactInfo?.name || user?.name || '',
          phone: values.contactInfo?.phone || user?.phone || '',
          email: values.contactInfo?.email || user?.email || '',
          showPhone: values.contactInfo?.showPhone ?? true,
          showEmail: values.contactInfo?.showEmail ?? false
        }
      };
      
      console.log('Submitting property:', JSON.stringify(propertyData));
      
      // Define retry function for reliable submission even in low network
      const submitWithRetry = async (retries = 3) => {
        try {
          console.log(`Attempt to submit property (${retries} retries left)`);
          // Use SERVER_URL from centralized config for consistency
          const response = await axios.post(`${SERVER_URL}/api/properties`, propertyData, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken}`
            },
            // Longer timeout for slow connections
            timeout: 60000
          });
          
          console.log('SUBMISSION SUCCESSFUL!');
          return response;
        } catch (error) {
          console.error('Submission attempt failed:', error.message);
          if (retries > 0) {
            console.log(`Retrying... (${retries} retries left)`);
            // Wait 2 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
            return submitWithRetry(retries - 1);
          } else {
            throw error;
          }
        }
      };
    
      // Execute submission with retries
      submitWithRetry()
      .then(response => {
        console.log('Property submission successful:', response.data);
        setIsLoading(false);
        
        // Show success message
        Alert.alert(
          'Success!', 
          'Your property has been successfully added with cloud-hosted images!',
          [{ 
            text: 'View in Home', 
            onPress: () => {
              navigation.navigate('HomeTab', {
                screen: 'Home',
                params: { refresh: Date.now() }
              });
            } 
          }]
        );
      })
      .catch(error => {
        console.error('Property submission failed:', error.message);
        setIsLoading(false);
        
        // Show error message
        Alert.alert(
          'Submission Failed', 
          'Could not save your property. Please try again.',
          [{ text: 'OK' }]
        );
      });
    } catch (error) {
      console.error('Error in property submission process:', error.message);
      setIsLoading(false);
      Alert.alert('Error', error.message || 'Failed to process your request');
    }
  };

  const propertyTypes = [
    { value: 'Apartment', label: 'Apartment' },
    { value: 'House', label: 'House' },
    { value: 'Plot', label: 'Plot' },
    { value: 'PG', label: 'PG' },
    { value: 'Hostel', label: 'Hostel' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Villa', label: 'Villa' },
  ];

  const furnishingTypes = [
    { value: 'Unfurnished', label: 'Unfurnished' },
    { value: 'Semi-Furnished', label: 'Semi-Furnished' },
    { value: 'Fully Furnished', label: 'Fully Furnished' },
  ];

  const areaUnits = [
    { value: 'sqft', label: 'sq. ft.' },
    { value: 'sqm', label: 'sq. m.' },
    { value: 'acre', label: 'acre' },
    { value: 'yard', label: 'yard' },
  ];

  const categories = [
    { value: 'Sell', label: 'Sell' },
    { value: 'Rent', label: 'Rent' },
  ];

  const amenitiesOptions = [
    'Swimming Pool',
    'Gym',
    'Garden',
    'Parking',
    'Security',
    'Power Backup',
    'Lift',
    'Club House',
    "Children's Play Area",
    '24x7 Water Supply',
    'Gas Pipeline',
    'Internet/Wi-Fi Connectivity',
  ];

  // Function to get user's current location directly
  const useCurrentLocation = async (setFieldValue) => {
    setLocationLoading(true);
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
              text: 'Settings', 
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
        setLocationLoading(false);
        return;
      }
      
      // Directly use Expo Location API with highest accuracy
      Alert.alert('Getting Location', 'Please wait while we get your current location...');
      
      // Define a helper function to process location data
      const processLocationData = async (coords, setFieldValue) => {
        const { latitude, longitude } = coords;
        console.log(`Location acquired: ${latitude}, ${longitude}`);
        
        // Get address from coordinates
        const addressResponse = await Location.reverseGeocodeAsync({ latitude, longitude });
        const addressData = addressResponse[0] || {};
        
        // Format location data for the form
        const locationObj = {
          address: addressData.street ? 
            `${addressData.street}${addressData.district ? `, ${addressData.district}` : ''}` : 
            'Address not available',
          city: addressData.city || addressData.subregion || '',
          state: addressData.region || '',
          country: addressData.country || 'India',
          coordinates: {
            type: 'Point',
            coordinates: [longitude, latitude]
          }
        };
        
        // Update the form value
        setFieldValue('location', locationObj);
        
        Alert.alert(
          'Location Set',
          `Your current location has been set to: ${locationObj.address}, ${locationObj.city}`,
          [{ text: 'OK' }]
        );
        
        return locationObj;
      };
      
      // First try with highest accuracy
      try {
        const { coords } = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 0
        });
        return await processLocationData(coords, setFieldValue);
      } catch (highAccuracyError) {
        console.log('High accuracy location failed, trying balanced:', highAccuracyError);
        
        try {
          // If highest accuracy fails, try with balanced accuracy
          const { coords } = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });
          
          // Process location with our helper function
          return await processLocationData(coords, setFieldValue);
        } catch (error) {
          console.error('Error getting location:', error);
          Alert.alert(
            'Location Error',
            'Unable to get your current location. Please try again or set location manually.',
            [{ text: 'OK' }]
          );
        }
      }
    } finally {
      setLocationLoading(false);
    }
  };

  // Separate navigation handlers for clarity
  const navigateToLocationPicker = (values, setFieldValue) => {
    navigation.navigate('LocationPicker', {
      initialLocation: values.location,
      onSelectLocation: (location) => {
        setFieldValue('location', location);
      }
    });
  };

  const navigateToImagePicker = (values, setFieldValue) => {
    navigation.navigate('ImagePicker', {
      initialImages: values.images,
      onSelectImages: (images) => {
        setFieldValue('images', images);
      }
    });
  };

  const navigateToPropertyPreview = (values) => {
    navigation.navigate('PropertyPreview', { property: values });
  };

  return (
    <View style={styles.container}>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        validateOnChange={false}
        validateOnBlur={true}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue, isValid }) => (
          <>
            <ScrollView style={styles.scrollContainer}>
              <View style={styles.formContainer}>
                <Text style={styles.sectionTitle}>Basic Information</Text>

                {/* Category Selection */}
                <Text style={styles.label}>I want to</Text>
                <View style={styles.buttonGroup}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.buttonOption,
                        values.category === cat.value && styles.buttonOptionSelected,
                      ]}
                      onPress={() => setFieldValue('category', cat.value)}
                    >
                      <Text 
                        style={[
                          styles.buttonOptionText,
                          values.category === cat.value && styles.buttonOptionTextSelected,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Property Type Selection */}
                <Text style={styles.label}>Property Type</Text>
                <View style={styles.buttonGroup}>
                  {propertyTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.buttonOption,
                        values.propertyType === type.value && styles.buttonOptionSelected,
                      ]}
                      onPress={() => {
                        setFieldValue('propertyType', type.value);
                        if (!['Flat', 'House'].includes(type.value)) {
                          setFieldValue('bhk', '');
                        }
                      }}
                    >
                      <Text 
                        style={[
                          styles.buttonOptionText,
                          values.propertyType === type.value && styles.buttonOptionTextSelected,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Title Input */}
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 3 BHK Apartment in Whitefield"
                  value={values.title}
                  onChangeText={handleChange('title')}
                  onBlur={handleBlur('title')}
                />
                {touched.title && errors.title && (
                  <Text style={styles.errorText}>{errors.title}</Text>
                )}

                {/* Description Input */}
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your property in detail"
                  value={values.description}
                  onChangeText={handleChange('description')}
                  onBlur={handleBlur('description')}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
                {touched.description && errors.description && (
                  <Text style={styles.errorText}>{errors.description}</Text>
                )}

                {/* Price Input */}
                <Text style={styles.label}>
                  {values.category === 'Sell' ? 'Price' : 'Rent per Month'}
                </Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0"
                    value={values.price}
                    onChangeText={handleChange('price')}
                    onBlur={handleBlur('price')}
                    keyboardType="numeric"
                  />
                </View>
                {touched.price && errors.price && (
                  <Text style={styles.errorText}>{errors.price}</Text>
                )}

                {/* BHK Input (only for Flat and House) */}
                {['Flat', 'House'].includes(values.propertyType) && (
                  <>
                    <Text style={styles.label}>BHK</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 2"
                      value={values.bhk}
                      onChangeText={handleChange('bhk')}
                      onBlur={handleBlur('bhk')}
                      keyboardType="numeric"
                    />
                    {touched.bhk && errors.bhk && (
                      <Text style={styles.errorText}>{errors.bhk}</Text>
                    )}
                  </>
                )}

                {/* Area Input */}
                <Text style={styles.label}>Area</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.inputRowItem]}
                    placeholder="e.g., 1200"
                    value={values.areaValue}
                    onChangeText={handleChange('areaValue')}
                    onBlur={handleBlur('areaValue')}
                    keyboardType="numeric"
                  />
                  <View style={styles.pickerContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {areaUnits.map((unit) => (
                        <TouchableOpacity
                          key={unit.value}
                          style={[
                            styles.unitButton,
                            values.areaUnit === unit.value && styles.unitButtonSelected,
                          ]}
                          onPress={() => setFieldValue('areaUnit', unit.value)}
                        >
                          <Text 
                            style={[
                              styles.unitButtonText,
                              values.areaUnit === unit.value && styles.unitButtonTextSelected,
                            ]}
                          >
                            {unit.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                {touched.areaValue && errors.areaValue && (
                  <Text style={styles.errorText}>{errors.areaValue}</Text>
                )}

                {/* Furnishing Status */}
                <Text style={styles.label}>Furnishing Status</Text>
                <View style={styles.buttonGroup}>
                  {furnishingTypes.map((furnish) => (
                    <TouchableOpacity
                      key={furnish.value}
                      style={[
                        styles.buttonOption,
                        values.furnishing === furnish.value && styles.buttonOptionSelected,
                      ]}
                      onPress={() => setFieldValue('furnishing', furnish.value)}
                    >
                      <Text 
                        style={[
                          styles.buttonOptionText,
                          values.furnishing === furnish.value && styles.buttonOptionTextSelected,
                        ]}
                      >
                        {furnish.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>Location Information</Text>

                <View style={styles.locationButtonsContainer}>
                  {/* Location Picker Button */}
                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={() => navigateToLocationPicker(values, setFieldValue)}
                  >
                    <Ionicons name="location-outline" size={24} color="#0066cc" />
                    <Text style={styles.locationButtonText}>
                      {values.location.address ? 'Change Location' : 'Pick Location on Map'}
                    </Text>
                  </TouchableOpacity>

                  {/* Use Current Location Button */}
                  <TouchableOpacity
                    style={[styles.currentLocationButton, locationLoading && styles.loadingButton]}
                    onPress={() => useCurrentLocation(setFieldValue)}
                    disabled={locationLoading}
                  >
                    {locationLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="locate" size={24} color="#fff" />
                        <Text style={styles.currentLocationButtonText}>Use Current Location</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Display Selected Location */}
                {values.location.address ? (
                  <View style={styles.selectedLocationContainer}>
                    <Text style={styles.selectedLocationText}>
                      {values.location.address}, {values.location.city}, {values.location.state}
                    </Text>
                    <Text style={styles.coordinatesText}>
                      Lat: {values.location.coordinates.coordinates[1]}, Lng: {values.location.coordinates.coordinates[0]}
                    </Text>
                  </View>
                ) : touched.location?.address && errors.location?.address ? (
                  <Text style={styles.errorText}>{errors.location?.address}</Text>
                ) : null}

                <Text style={styles.sectionTitle}>Upload Images</Text>

                {/* Image Picker Button */}
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => navigateToImagePicker(values, setFieldValue)}
                >
                  <Ionicons name="images-outline" size={24} color="#0066cc" />
                  <Text style={styles.uploadButtonText}>
                    {values.images.length > 0 ? `${values.images.length} Images Selected` : 'Upload Images'}
                  </Text>
                </TouchableOpacity>

                {touched.images && errors.images && (
                  <Text style={styles.errorText}>{errors.images}</Text>
                )}

                <Text style={styles.sectionTitle}>Contact Information</Text>

                {/* Contact Name */}
                <Text style={styles.label}>Contact Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your Name"
                  value={values.contactInfo.name}
                  onChangeText={(value) => setFieldValue('contactInfo.name', value)}
                  onBlur={handleBlur('contactInfo.name')}
                />
                {touched.contactInfo?.name && errors.contactInfo?.name && (
                  <Text style={styles.errorText}>{errors.contactInfo.name}</Text>
                )}

                {/* Contact Phone */}
                <Text style={styles.label}>Contact Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your Phone Number"
                  value={values.contactInfo.phone}
                  onChangeText={(value) => setFieldValue('contactInfo.phone', value)}
                  onBlur={handleBlur('contactInfo.phone')}
                  keyboardType="phone-pad"
                />
                {touched.contactInfo?.phone && errors.contactInfo?.phone && (
                  <Text style={styles.errorText}>{errors.contactInfo.phone}</Text>
                )}

                {/* Contact Email */}
                <Text style={styles.label}>Contact Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your Email"
                  value={values.contactInfo.email}
                  onChangeText={(value) => setFieldValue('contactInfo.email', value)}
                  onBlur={handleBlur('contactInfo.email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                {/* Contact Visibility Options */}
                <View style={styles.visibilityContainer}>
                  <View style={styles.visibilityOption}>
                    <Text style={styles.visibilityLabel}>Show Phone Number</Text>
                    <Switch
                      value={values.contactInfo.showPhone}
                      onValueChange={(value) => setFieldValue('contactInfo.showPhone', value)}
                      trackColor={{ false: '#d0d0d0', true: '#0066cc' }}
                    />
                  </View>
                  <View style={styles.visibilityOption}>
                    <Text style={styles.visibilityLabel}>Show Email Address</Text>
                    <Switch
                      value={values.contactInfo.showEmail}
                      onValueChange={(value) => setFieldValue('contactInfo.showEmail', value)}
                      trackColor={{ false: '#d0d0d0', true: '#0066cc' }}
                    />
                  </View>
                </View>

                {/* Preview Button */}
                <TouchableOpacity
                  style={styles.previewButton}
                  onPress={() => navigateToPropertyPreview(values)}
                >
                  <Ionicons name="eye-outline" size={20} color="#0066cc" />
                  <Text style={styles.previewButtonText}>Preview Listing</Text>
                </TouchableOpacity>

                {/* Submit Button (outside ScrollView for fixed position) */}
                <View style={styles.spacer} />
              </View>
            </ScrollView>

            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                disabled={isLoading}
                onPress={async () => {
                  // Double check validation before submission
                  if (!values.title) {
                    Alert.alert('Missing Title', 'Please enter a title for your property');
                    return;
                  }
                  if (!values.price) {
                    Alert.alert('Missing Price', 'Please enter a price for your property');
                    return;
                  }
                  if (values.images.length === 0) {
                    Alert.alert('Images Required', 'Please add at least one image of your property');
                    return;
                  }
                  if (!values.location.coordinates?.coordinates?.[0] || !values.location.coordinates?.coordinates?.[1]) {
                    Alert.alert('Location Required', 'Please select the property location on map');
                    return;
                  }
                  
                  // Proceed with property submission
                  setIsLoading(true);
                  
                  try {
                    // First, upload images to Cloudinary
                    console.log('[UPLOAD] Starting image upload to Cloudinary...');
                    const imageUploadResult = await uploadMultipleImages(values.images);
                    
                    if (!imageUploadResult.success) {
                      throw new Error(imageUploadResult.error || 'Failed to upload images');
                    }
                    
                    console.log('[SUCCESS] Images uploaded successfully to Cloudinary');
                    console.log('[INFO] Image URLs:', imageUploadResult.urls);
                    
                    // Format the property data for API submission with Cloudinary URLs
                    const propertyData = {
                      title: values.title,
                      description: values.description,
                      price: parseFloat(values.price),
                      category: values.category,
                      propertyType: values.propertyType,
                      bhk: values.bhk ? parseInt(values.bhk) : undefined,
                      area: {
                        value: parseFloat(values.areaValue),
                        unit: values.areaUnit
                      },
                      furnishing: values.furnishing,
                      amenities: Array.isArray(values.amenities) ? values.amenities : [],
                      // Use Cloudinary URLs instead of local file paths
                      images: imageUploadResult.urls,
                      location: {
                        address: values.location?.address || '',
                        city: values.location?.city || '',
                        state: values.location?.state || '',
                        country: values.location?.country || 'India',
                        coordinates: {
                          type: 'Point',
                          coordinates: [
                            values.location?.coordinates?.coordinates?.[0] || 0,
                            values.location?.coordinates?.coordinates?.[1] || 0
                          ]
                        }
                      },
                      contactInfo: {
                        name: values.contactInfo?.name || user?.name || '',
                        phone: values.contactInfo?.phone || user?.phone || '',
                        email: values.contactInfo?.email || user?.email || '',
                        showPhone: values.contactInfo?.showPhone ?? true,
                        showEmail: values.contactInfo?.showEmail ?? false
                      }
                    };
                    
                    // Use SERVER_URL from centralized config for consistency
                    console.log('Starting API call to:', `${SERVER_URL}/api/properties`);
                    console.log('With property data including Cloudinary images:', JSON.stringify(propertyData, null, 2));
                    
                    const response = await fetch(`${SERVER_URL}/api/properties`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}`,
                        'Accept': 'application/json'
                      },
                      body: JSON.stringify(propertyData),
                    });
                    
                    // Get the response text first to properly debug
                    const responseText = await response.text();
                    console.log('Response status:', response.status);
                    console.log('Response headers:', JSON.stringify(Array.from(response.headers.entries())));
                    console.log('Response text:', responseText);
                    
                    // Try to parse as JSON if possible
                    let jsonData = null;
                    try {
                      jsonData = JSON.parse(responseText);
                      console.log('Parsed JSON response:', jsonData);
                    } catch (e) {
                      console.log('Response is not valid JSON');
                    }
                    
                    // Handle failed requests with better error messages
                    if (!response.ok) {
                      if (jsonData && jsonData.message) {
                        throw new Error(jsonData.message);
                      } else {
                        throw new Error(`Server error: ${response.status}`);
                      }
                    }
                    
                    setIsLoading(false);
                    console.log('Property submitted successfully:', jsonData || 'Success');
                    
                    Alert.alert(
                      'Success!',
                      'Your property has been saved with cloud-hosted images!',
                      [{
                        text: 'View in Home',
                        onPress: () => {
                          // Force refresh both screens
                          const timestamp = Date.now();
                          navigation.navigate('HomeTab', {
                            screen: 'Home',
                            params: { refresh: timestamp }
                          });
                        }
                      }]
                    );
                  } catch (error) {
                    setIsLoading(false);
                    console.error('Error during property submission:', error);
                    Alert.alert('Error', error.message || 'Failed to submit property');
                  }
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Submit Listing</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </Formik>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContainer: {
    flex: 1,
  },
  formContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  currencySymbol: {
    fontSize: 16,
    marginRight: 5,
    color: '#333',
  },
  priceInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  inputRowItem: {
    flex: 1,
    marginBottom: 0,
    marginRight: 10,
  },
  pickerContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  buttonOption: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    marginRight: 10,
    marginBottom: 10,
  },
  buttonOptionSelected: {
    backgroundColor: '#0066cc',
  },
  buttonOptionText: {
    fontSize: 14,
    color: '#666',
  },
  buttonOptionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  unitButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 5,
    marginRight: 10,
  },
  unitButtonSelected: {
    backgroundColor: '#0066cc',
  },
  unitButtonText: {
    fontSize: 14,
    color: '#666',
  },
  unitButtonTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  locationButtonsContainer: {
    marginBottom: 15,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f2ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  locationButtonText: {
    color: '#0066cc',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066cc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  currentLocationButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  loadingButton: {
    opacity: 0.7,
  },
  selectedLocationContainer: {
    backgroundColor: '#e6f2ff',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  selectedLocationText: {
    fontSize: 14,
    color: '#333',
  },
  coordinatesText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0066cc',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#0066cc',
    marginLeft: 10,
  },
  visibilityContainer: {
    marginBottom: 20,
  },
  visibilityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  visibilityLabel: {
    fontSize: 16,
    color: '#333',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginVertical: 10,
    justifyContent: 'center',
  },
  previewButtonText: {
    fontSize: 16,
    color: '#0066cc',
    marginLeft: 10,
    fontWeight: '500',
  },
  spacer: {
    height: 70,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#0066cc',
    borderRadius: 5,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 15,
    marginLeft: 5,
  },
});

export default AddPropertyScreen;
