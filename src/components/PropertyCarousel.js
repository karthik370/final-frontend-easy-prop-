import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const PropertyCarousel = ({ images, height = 250, onImagePress }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState({}); // Track loading state for each image
  const flatListRef = useRef(null);

  // Handle errors gracefully with a fallback image
  const fallbackImage = 'https://via.placeholder.com/400x300/eeeeee/999999?text=No+Image';

  const renderItem = ({ item, index }) => {
    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => onImagePress && onImagePress(index)}
        style={{ width }}
      >
        <View style={[styles.imageContainer, { height }]}>
          {loading[index] && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066cc" />
            </View>
          )}
          <Image
            source={{ uri: item || fallbackImage }}
            style={styles.image}
            resizeMode="cover"
            onLoadStart={() => {
              setLoading(prev => ({ ...prev, [index]: true }));
            }}
            onLoadEnd={() => {
              setLoading(prev => ({ ...prev, [index]: false }));
            }}
            onError={() => {
              setLoading(prev => ({ ...prev, [index]: false }));
            }}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setActiveIndex(index);
  };

  const goToPrevious = () => {
    if (activeIndex > 0) {
      flatListRef.current?.scrollToIndex({
        animated: true,
        index: activeIndex - 1,
        viewPosition: 0.5,
      });
    }
  };

  const goToNext = () => {
    if (activeIndex < images.length - 1) {
      flatListRef.current?.scrollToIndex({
        animated: true,
        index: activeIndex + 1,
        viewPosition: 0.5,
      });
    }
  };

  // Don't render if no images
  if (!images || images.length === 0) {
    return (
      <View style={[styles.imageContainer, { height }]}>
        <Image
          source={{ uri: fallbackImage }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={images}
        renderItem={renderItem}
        keyExtractor={(_, index) => `image-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
      
      {/* Navigation arrows (only shown if multiple images) */}
      {images.length > 1 && (
        <>
          <TouchableOpacity 
            style={[styles.navButton, styles.navButtonLeft]}
            onPress={goToPrevious}
            disabled={activeIndex === 0}
          >
            <Ionicons 
              name="chevron-back" 
              size={24} 
              color={activeIndex === 0 ? "#cccccc" : "#ffffff"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, styles.navButtonRight]}
            onPress={goToNext}
            disabled={activeIndex === images.length - 1}
          >
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={activeIndex === images.length - 1 ? "#cccccc" : "#ffffff"} 
            />
          </TouchableOpacity>
        </>
      )}
      
      {/* Pagination indicators */}
      {images.length > 1 && (
        <View style={styles.pagination}>
          <Text style={styles.paginationText}>
            {activeIndex + 1} / {images.length}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  imageContainer: {
    width: width,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    zIndex: 1,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navButtonLeft: {
    left: 10,
  },
  navButtonRight: {
    right: 10,
  },
  pagination: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  paginationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default PropertyCarousel;
