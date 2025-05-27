// CRITICAL API CONFIGURATION - USING CENTRALIZED IP CONFIG

// Import from the centralized IP configuration
import { SERVER_IP, SERVER_PORT, SERVER_URL } from './ip-config';

// Use the centralized server IP and port
export const LOCAL_IP = SERVER_IP; // Using centralized IP config
export const API_PORT = SERVER_PORT;

// Use the complete URL from the centralized config
const DIRECT_CONNECTION = SERVER_URL;

// EXPORT THE FINAL API URL
export const API_URL = DIRECT_CONNECTION;

// Make sure this is used throughout the application
console.log('📡 USING CENTRALIZED BACKEND CONNECTION:', API_URL);
console.log('📝 TO CHANGE IP, EDIT src/config/ip-config.js');

// DO NOT EDIT BELOW THIS LINE
// API endpoints 
export const ENDPOINTS = {
  // Auth
  REGISTER: '/api/auth/register',
  LOGIN: '/api/auth/login',
  FIREBASE_AUTH: '/api/auth/firebase',
  PROFILE: '/api/auth/profile',
  
  // Properties
  PROPERTIES: '/api/properties',
  PROPERTY_BY_ID: (id) => `/api/properties/${id}`,
  FAVORITES: '/api/properties/favorites',
  ADD_PROPERTY: '/api/properties/add',
  
  // User
  USER_PROFILE: '/api/users/profile',
  USER_PROPERTIES: '/api/users/properties',
};
