import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Auth Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import PhoneLoginScreen from '../screens/auth/PhoneLoginScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0066cc',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
      initialRouteName="Welcome"
    >
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ title: 'Sign In' }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen} 
        options={{ title: 'Create Account' }}
      />
      <Stack.Screen 
        name="PhoneLogin" 
        component={PhoneLoginScreen} 
        options={{ title: 'Login with Phone' }}
      />
      <Stack.Screen 
        name="OtpVerification" 
        component={OtpVerificationScreen} 
        options={{ title: 'Verify OTP' }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
