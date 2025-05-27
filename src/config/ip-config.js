// Import environment configuration
import { SERVER_URL } from './environment';

// Export variables for easy access across the app
export { SERVER_URL };

// For legacy support (in case any components still use these)
export const SERVER_IP = "easy-prop.onrender.com";
export const SERVER_PORT = "";

// Console log to help debug API connections
console.log("API Configuration loaded. Using SERVER_URL:", SERVER_URL);
