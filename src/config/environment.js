// Environment configuration for development and production
// ALWAYS using the production backend URL
const ENV = {
  development: {
    // Always using the production server now instead of localhost
    SERVER_URL: 'https://easy-prop.onrender.com',
    ENV_NAME: 'development-using-prod-backend'
  },
  production: {
    // Your deployed backend URL
    SERVER_URL: 'https://easy-prop.onrender.com',
    ENV_NAME: 'production'
  }
};

// Determine which environment we're in
// __DEV__ is a global variable from React Native that is true when in development mode
const getEnvironment = () => {
  if (__DEV__) {
    console.log('🔧 Running in DEVELOPMENT environment');
    return ENV.development;
  }
  console.log('🚀 Running in PRODUCTION environment');
  return ENV.production;
};

// Export the environment configuration
export const environment = getEnvironment();

// Export variables for easy access
export const { SERVER_URL, ENV_NAME } = environment;
