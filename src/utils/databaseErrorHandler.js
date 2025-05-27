// Database Error Handler - Specifically for MongoDB Atlas connections
// This utility handles errors when connecting to MongoDB Atlas

/**
 * Handle MongoDB Atlas connection errors gracefully
 * @param {Error} error - The error object from the API call
 * @param {Function} retryCallback - Function to retry the operation
 * @param {Function} fallbackCallback - Function to execute as fallback if retry fails
 */
export const handleDatabaseError = async (error, retryCallback, fallbackCallback) => {
  console.log('Handling MongoDB Atlas connection error:', error.message);
  
  // Check if it's a network error
  if (error.message.includes('Network Error') || 
      error.message.includes('timeout') || 
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('Aborted')) {
    
    console.log('Network error detected - will retry connection to MongoDB Atlas');
    
    // Wait a bit before retrying
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try again
    if (typeof retryCallback === 'function') {
      console.log('Retrying MongoDB Atlas connection...');
      return retryCallback();
    }
  }
  
  // If we get here, either it's not a network error or retry failed
  console.log('Using fallback for MongoDB Atlas connection');
  if (typeof fallbackCallback === 'function') {
    return fallbackCallback();
  }
  
  // If no fallback provided, just rethrow
  throw error;
};

/**
 * Get sample data for when MongoDB Atlas is unavailable
 * @param {string} dataType - The type of data to provide (properties, messages, etc.)
 * @returns {Object} Sample data of the requested type
 */
export const getSampleData = (dataType) => {
  switch(dataType) {
    case 'properties':
      return {
        properties: [
          {
            _id: 'sample1',
            title: 'Sample Property (Offline Mode)',
            description: 'This is sample data shown when MongoDB Atlas is unreachable',
            price: 25000,
            location: {
              name: 'Sample Location',
              coordinates: {
                coordinates: [77.5946, 12.9716]
              }
            },
            images: ['https://dummyimage.com/600x400/e0e0e0/666666.jpg&text=Offline+Mode'],
            category: 'Rent',
            bhk: 2,
            propertyType: 'Apartment',
            user: {
              _id: 'sample_user',
              name: 'Sample User'
            }
          }
        ]
      };
    
    case 'messages':
      return {
        messages: [
          {
            _id: 'sample_msg1',
            content: 'MongoDB Atlas connection is currently unavailable. Please try again later.',
            sender: 'system',
            createdAt: new Date().toISOString(),
            status: 'received'
          }
        ]
      };
      
    default:
      return { message: 'MongoDB Atlas connection unavailable. Please try again later.' };
  }
};
