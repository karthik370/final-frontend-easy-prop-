import axios from 'axios';
import { Platform } from 'react-native';
import { SERVER_URL } from '../config/ip-config';

// Default fallback image if upload fails
const FALLBACK_IMAGE = 'https://res.cloudinary.com/ddrsyt38h/image/upload/v1589149756/samples/landscapes/nature-mountains.jpg';

/**
 * Uploads a single image to Cloudinary
 * @param {string} imageUri - Local URI of the image
 * @param {string} folder - Destination folder in Cloudinary
 * @returns {Promise<string>} Uploaded image URL
 */
export const uploadImageToCloudinary = async (imageUri) => {
  if (!imageUri) throw new Error('No image URI provided');

  const filename = imageUri.split('/').pop() || 'unknown';
  console.log(`📤 Starting upload for ${filename}...`);

  try {
    // Create form data
    const formData = new FormData();
    
    // Prepare file for upload
    formData.append('image', {
      uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
      type: 'image/jpeg',
      name: filename
    });

    // Upload through backend
    const response = await axios.post(`${SERVER_URL}/api/upload/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000
    });

    if (!response.data?.imageUrl) {
      throw new Error('Upload response missing imageUrl');
    }

    console.log(`✅ Successfully uploaded ${filename}`);
    return response.data.imageUrl;

  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message;
    console.error(`❌ Error uploading ${filename}:`, errorMessage);
    console.error('Full error:', error.response?.data || error);
    throw new Error(`Upload failed: ${errorMessage}`);
  }
};

/**
 * Uploads multiple images to Cloudinary
 * @param {Array<string>} imageUris - Array of image URIs
 * @param {string} folder - Destination folder
 * @returns {Promise<Object>} Upload results
 */
export const uploadMultipleImages = async (imageUris, folder = 'property-images') => {
  if (!Array.isArray(imageUris) || imageUris.length === 0) {
    return { success: false, urls: [FALLBACK_IMAGE], error: 'No images provided' };
  }

  console.log(`[UPLOAD] Starting upload of ${imageUris.length} images...`);
  
  const results = {
    urls: [],
    success: false,
    total: imageUris.length,
    successful: 0,
    failed: 0
  };

  for (let i = 0; i < imageUris.length; i++) {
    try {
      // Add delay between uploads to prevent rate limiting
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 1000));

      const imageUrl = await uploadImageToCloudinary(imageUris[i], folder);
      results.urls.push(imageUrl);
      results.successful++;

    } catch (error) {
      console.error(`Failed to upload image ${i + 1}/${imageUris.length}:`, error.message);
      results.urls.push(FALLBACK_IMAGE);
      results.failed++;
    }
  }

  // Log upload summary
  console.log(`
=== Upload Summary ===
• Total: ${results.total}
• Successful: ${results.successful}
• Failed: ${results.failed}
==================`);

  results.success = results.successful > 0;
  return results;
};

/**
 * Checks if a URL is from Cloudinary
 * @param {string} url - URL to check
 * @returns {boolean} True if URL is from Cloudinary
 */
export const isCloudinaryUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('cloudinary.com');
};

/**
 * Gets an optimized version of a Cloudinary image URL
 * @param {string} url - Original Cloudinary URL
 * @param {number} width - Desired width
 * @param {number} height - Desired height
 * @param {string} quality - Image quality
 * @returns {string} Optimized image URL
 */
export const getOptimizedImageUrl = (url, width = 800, height = 600, quality = 'auto') => {
  if (!isCloudinaryUrl(url)) return url;
  
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;

  return `${parts[0]}/upload/w_${width},h_${height},c_fill,q_${quality}/${parts[1]}`;
};