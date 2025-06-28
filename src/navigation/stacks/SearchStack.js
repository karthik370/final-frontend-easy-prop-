import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SearchScreen from '../../screens/SearchScreen';
import FilterScreen from '../../screens/FilterScreen';
import PropertyDetailsScreen from '../../screens/PropertyDetailsScreen';

const Stack = createNativeStackNavigator();

const SearchStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Search"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="FilterScreen" component={FilterScreen} />
      <Stack.Screen 
        name="SearchPropertyDetails" 
        component={PropertyDetailsScreen} 
        options={{ 
          headerShown: true,
          title: 'Property Details' 
        }} 
      />
    </Stack.Navigator>
  );
};

export default SearchStack;
