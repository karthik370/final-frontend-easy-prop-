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
        console.log('AppNavigator initialized, login status checked');
      } catch (error) {
        console.error('Login check error:', error);
      } finally {
        setInitializing(false);
      }
    };

    bootstrapAsync();
  }, []);

  // 3. Second useEffect - check if first launch
  useEffect(() => {
    // Skip if still initializing
    if (initializing) return;

    const checkFirstLaunch = async () => {
      try {
        const alreadyLaunched = await AsyncStorage.getItem('alreadyLaunched');
        
        if (alreadyLaunched === null) {
          await AsyncStorage.setItem('alreadyLaunched', 'true');
          setIsFirstLaunch(true);
        } else {
          setIsFirstLaunch(false);
        }
      } catch (error) {
        console.log('Error with first launch check:', error);
        setIsFirstLaunch(false); // Default to not showing welcome screen on error
      }
    };
    
    checkFirstLaunch();
  }, [initializing]);

  // 4. Listen for userToken changes
  useEffect(() => {
    if (!initializing && userToken) {
      console.log('User token detected, should navigate to Main');
    }
  }, [userToken, initializing]);

  // Loading state while checking login or first launch
  if (initializing || isLoading || isFirstLaunch === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  // Determine which navigator to show based on authentication state
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!userToken ? (
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigator} 
          initialParams={{ isFirstLaunch: isFirstLaunch }}
        />
      ) : (
        <Stack.Screen 
          name="Main" 
          component={MainNavigator} 
          options={{ animationEnabled: true }}
        />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
