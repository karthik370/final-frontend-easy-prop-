import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import SearchScreen from '../../screens/SearchScreen';
import PropertyDetailsScreen from '../../screens/PropertyDetailsScreen';
import FilterScreen from '../../screens/FilterScreen';
import ViewMapScreen from '../../screens/ViewMapScreen';

const Stack = createNativeStackNavigator();

const SearchStack = () => {
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
        name="Search" 
        component={SearchScreen} 
        options={{ title: 'Search Properties' }}
      />
      <Stack.Screen 
        name="SearchPropertyDetails" 
        component={PropertyDetailsScreen} 
        options={{ title: 'Property Details' }}
      />
      <Stack.Screen 
        name="Filter" 
        component={FilterScreen} 
        options={{ title: 'Filter Properties' }}
      />
      <Stack.Screen 
        name="SearchViewMap" 
        component={ViewMapScreen} 
        options={{ title: 'Map View' }}
      />
    </Stack.Navigator>
  );
};

export default SearchStack;
