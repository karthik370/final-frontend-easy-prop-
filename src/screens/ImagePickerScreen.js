import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const ImagePickerScreen = ({ route, navigation }) => {
  const { initialImages, onSelectImages } = route.params;
  const [images, setImages] = useState(initialImages || []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Request permission to access the camera roll
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload images!'
        );
      }
    })();
  }, []);

  // Optimized image picker with improved performance and reliability
  const pickImage = async (useCamera = false) => {
    try {
      setIsLoading(true); // Show loading immediately to signal activity to user
      let result;
      
      if (useCamera) {
        // Request camera permission first
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Sorry, we need camera permissions to take photos!'
          );
          setIsLoading(false); // Reset loading state
          return;
        }
        
        // Use lower quality for better performance with camera
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false, // Disable editing for faster response
          aspect: [4, 3],
          quality: 0.5, // Lower quality for better performance
          exif: false, // Don't include EXIF data, for faster processing
        });
      } else {
        // Optimized image library picker
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false, // Disable editing for faster response with multiple images
          aspect: [4, 3],
          quality: 0.5, // Lower quality for better performance
          allowsMultipleSelection: true,
          selectionLimit: 5, // Reduced limit for better performance
          exif: false, // Don't include EXIF data, for faster processing
        });
      }

      if (!result.canceled) {
        setIsLoading(true);
        
        // Handle multiple selection if available
        const selectedAssets = result.assets || [{ uri: result.uri }];
        
        // Process each selected image
        const processedImages = await Promise.all(
          selectedAssets.map(async (asset) => {
            // Get file info
            const fileInfo = await FileSystem.getInfoAsync(asset.uri);
            
            // Check if file size is too large (> 5MB)
            if (fileInfo.size > 5 * 1024 * 1024) {
              Alert.alert(
                'Image Too Large',
                'Please select an image smaller than 5MB.'
              );
              return null;
            }
            
            // In a real app, this is where you would upload to a server/cloud storage
            // For this demo, we'll just use the local URI
            return asset.uri;
          })
        );
        
        // Filter out null values (failed uploads) and add to existing images
        const validImages = processedImages.filter(img => img !== null);
        setImages(prevImages => [...prevImages, ...validImages]);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Image picking error:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeImage = (index) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedImages = [...images];
            updatedImages.splice(index, 1);
            setImages(updatedImages);
          },
        },
      ]
    );
  };

  const handleConfirm = () => {
    if (images.length === 0) {
      Alert.alert('No Images', 'Please select at least one image for your property');
      return;
    }
    
    onSelectImages(images);
    navigation.goBack();
  };

  const renderImageItem = ({ item, index }) => (
    <View style={styles.imageContainer}>
      <Image source={{ uri: item }} style={styles.image} />
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeImage(index)}
      >
        <Ionicons name="close-circle" size={24} color="#ff6666" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {images.length} / 10 Images Selected
        </Text>
        <Text style={styles.headerSubtitle}>
          First image will be used as the cover photo
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Processing images...</Text>
        </View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderImageItem}
          keyExtractor={(item, index) => `${index}`}
          numColumns={2}
          contentContainerStyle={styles.imageGrid}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={80} color="#ddd" />
              <Text style={styles.emptyText}>No images selected</Text>
              <Text style={styles.emptySubtext}>
                Tap the buttons below to add images
              </Text>
            </View>
          }
        />
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cameraButton]}
          onPress={() => pickImage(true)}
          disabled={images.length >= 10 || isLoading}
        >
          <Ionicons name="camera-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.galleryButton]}
          onPress={() => pickImage(false)}
          disabled={images.length >= 10 || isLoading}
        >
          <Ionicons name="images-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.confirmButton, images.length === 0 && styles.confirmButtonDisabled]}
        onPress={handleConfirm}
        disabled={images.length === 0}
      >
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.confirmButtonText}>Confirm Selection</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 15,
  },
  header: {
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  imageGrid: {
    paddingBottom: 15,
  },
  imageContainer: {
    margin: 5,
    width: '47%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 5,
    flex: 1,
  },
  cameraButton: {
    backgroundColor: '#ff6600',
    marginRight: 7,
  },
  galleryButton: {
    backgroundColor: '#0066cc',
    marginLeft: 7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  confirmButton: {
    backgroundColor: '#25d366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 5,
  },
  confirmButtonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default ImagePickerScreen;
