import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import HomeScreen from '../../screens/HomeScreen';
import PropertyDetailsScreen from '../../screens/PropertyDetailsScreen';
import ViewMapScreen from '../../screens/ViewMapScreen';
import ChatScreen from '../../screens/ChatScreen';
import PropertyListingScreen from '../../screens/PropertyListingScreen';

const Stack = createNativeStackNavigator();

const HomeStack = () => {
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
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'Home Zest' }}
      />
      <Stack.Screen 
        name="PropertyDetails" 
        component={PropertyDetailsScreen} 
        options={{ title: 'Property Details' }}
      />
      <Stack.Screen 
        name="PropertyListing" 
        component={PropertyListingScreen} 
        options={({ route }) => ({
          title: route.params?.category || 'Properties',
          headerShown: false
        })}
      />
      <Stack.Screen 
        name="ViewMap" 
        component={ViewMapScreen} 
        options={{ title: 'Map View' }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={({ route }) => ({ title: route.params?.userName || 'Chat' })}
      />
    </Stack.Navigator>
  );
};

export default HomeStack;
