import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Stack Navigators
import HomeStack from './stacks/HomeStack';
import SearchStack from './stacks/SearchStack';
import AddPropertyStack from './stacks/AddPropertyStack';
import FavoritesStack from './stacks/FavoritesStack';
import ProfileStack from './stacks/ProfileStack';

const Tab = createBottomTabNavigator();

const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'SearchTab') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'AddPropertyTab') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'FavoritesTab') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0066cc',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStack} 
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="SearchTab" 
        component={SearchStack} 
        options={{ title: 'Search' }}
      />
      <Tab.Screen 
        name="AddPropertyTab" 
        component={AddPropertyStack} 
        options={{ 
          title: 'Add',
          tabBarLabel: 'Add Property',
        }}
      />
      <Tab.Screen 
        name="FavoritesTab" 
        component={FavoritesStack} 
        options={{ title: 'Favorites' }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileStack} 
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
