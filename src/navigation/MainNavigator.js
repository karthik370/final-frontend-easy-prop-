import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';

// Stack Navigators
import HomeStack from './stacks/HomeStack';
import SearchStack from './stacks/SearchStack';
import AddPropertyStack from './stacks/AddPropertyStack';
import FavoritesStack from './stacks/FavoritesStack';
import ProfileStack from './stacks/ProfileStack';

const Tab = createBottomTabNavigator();

const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;
        
        let iconName;
        if (route.name === 'HomeTab') {
          iconName = isFocused ? 'home' : 'home-outline';
        } else if (route.name === 'SearchTab') {
          iconName = isFocused ? 'search' : 'search-outline';
        } else if (route.name === 'AddPropertyTab') {
          iconName = 'add';
        } else if (route.name === 'FavoritesTab') {
          iconName = isFocused ? 'heart' : 'heart-outline';
        } else if (route.name === 'ProfileTab') {
          iconName = isFocused ? 'person' : 'person-outline';
        }

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (route.name === 'AddPropertyTab') {
          return (
            <TouchableOpacity
              key={index}
              onPress={onPress}
              style={[styles.tabItem, styles.addPropertyContainer]}
            >
              <View style={styles.addPropertyButton}>
                <Ionicons name={iconName} size={28} color="#FFFFFF" />
                <Text style={styles.addPropertyText}>Add</Text>
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={index}
            onPress={onPress}
            style={styles.tabItem}
          >
            <Ionicons 
              name={iconName} 
              size={24} 
              color={isFocused ? '#0066cc' : 'gray'} 
            />
            <Text style={{ 
              color: isFocused ? '#0066cc' : 'gray',
              fontSize: 12,
            }}>
              {label === 'HomeTab' ? 'Home' : 
               label === 'SearchTab' ? 'Search' : 
               label === 'FavoritesTab' ? 'Favorites' : 'Profile'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const MainNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStack} 
      />
      <Tab.Screen 
        name="SearchTab" 
        component={SearchStack} 
      />
      <Tab.Screen 
        name="AddPropertyTab" 
        component={AddPropertyStack} 
      />
      <Tab.Screen 
        name="FavoritesTab" 
        component={FavoritesStack} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileStack} 
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingBottom: 5,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPropertyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPropertyButton: {
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  addPropertyText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 1,
  }
});

export default MainNavigator;
