import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Context
import { AuthContext } from '../context/AuthContext';

// Navigators
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  // 1. All hooks must be called at the top level, before any conditional returns
  const { userToken, isLoading, isLoggedIn } = useContext(AuthContext);
  const [initializing, setInitializing] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  // 2. First useEffect - check login status
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        await isLoggedIn();
        console.log('AppNavigator initialized once');
      } catch (error) {
        console.error('Login check error:', error);
      } finally {
        setInitializing(false);
      }
    };

    bootstrapAsync();
    // Empty dependency array to run only once at mount
  }, []);

  // 3. Second useEffect - check if first launch
  useEffect(() => {
    // Skip if still initializing
    if (initializing) return;

    const checkFirstLaunch = async () => {
      try {
        // Reset the already launched flag to ensure welcome screen shows
        await AsyncStorage.removeItem('alreadyLaunched');
        console.log('Forced welcome screen to show');
        setIsFirstLaunch(true);
      } catch (error) {
        console.log('Error with first launch check:', error);
        setIsFirstLaunch(true); // Default to showing welcome screen even on error
      }
    };
    
    checkFirstLaunch();
    // This will run once after initializing is set to false
  }, [initializing]);

  // Loading state while checking login or first launch
  if (initializing || isLoading || isFirstLaunch === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  // Show welcome screen only if there's no user token
  // This will allow the guest login to navigate to main screens
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!userToken ? (
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigator} 
          initialParams={{ isFirstLaunch: true }}
        />
      ) : (
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
