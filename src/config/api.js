// API Configuration - USING CENTRALIZED IP CONFIGURATION
// Import from the centralized IP configuration
import { SERVER_URL } from './ip-config';

// IMPORTANT: Use the centralized SERVER_URL from ip-config.js
// This file is only for endpoint definitions
// We do NOT export API_URL anymore - use SERVER_URL everywhere instead!

// Make it available globally
global.API_SERVER_IP = SERVER_URL;

// Log the API URL being used for debugging
console.log('USING CENTRALIZED API URL:', SERVER_URL);
console.log('TO CHANGE IP ADDRESS, EDIT THE ip-config.js FILE');

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
  ADD_FAVORITE: (id) => `/api/properties/${id}/favorite`,
  REMOVE_FAVORITE: (id) => `/api/properties/${id}/favorite`,
  USER_PROPERTIES: '/api/properties/user',
  PROPERTY_STATUS: (id) => `/api/properties/${id}/status`,
  NEARBY_PROPERTIES: '/api/properties/nearby',
  
  // Messages
  CONVERSATIONS: '/api/messages/conversations',
  CONVERSATION_BY_ID: (id) => `/api/messages/conversations/${id}`,
  MESSAGES: '/api/messages',
  DELETE_CONVERSATION: (id) => `/api/messages/conversations/${id}`,
  
  // Notifications
  NOTIFICATIONS: '/api/notifications',
  NOTIFICATION_READ: (id) => `/api/notifications/${id}/read`,
  NOTIFICATION_READ_ALL: '/api/notifications/read-all',
  DELETE_NOTIFICATION: (id) => `/api/notifications/${id}`,
  
  // User Settings
  USER_SETTINGS: '/api/users/settings',
  USER_SEARCH_HISTORY: '/api/users/search-history',
  
  // Admin
  APPROVE_PROPERTY: (id) => `/api/properties/${id}/approve`,
  
  // Users
  USERS: '/api/users',
  USER_BY_ID: (id) => `/api/users/${id}`
};
