import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import FavoritesScreen from '../../screens/FavoritesScreen';
import PropertyDetailsScreen from '../../screens/PropertyDetailsScreen';
import ViewMapScreen from '../../screens/ViewMapScreen';

const Stack = createNativeStackNavigator();

const FavoritesStack = () => {
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
        name="Favorites" 
        component={FavoritesScreen} 
        options={{ title: 'My Favorites' }}
      />
      <Stack.Screen 
        name="FavoritePropertyDetails" 
        component={PropertyDetailsScreen} 
        options={{ title: 'Property Details' }}
      />
      <Stack.Screen 
        name="ViewMap" 
        component={ViewMapScreen} 
        options={{ title: 'Map View' }}
      />
    </Stack.Navigator>
  );
};

export default FavoritesStack;
