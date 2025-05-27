import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import ProfileScreen from '../../screens/ProfileScreen';
import EditProfileScreen from '../../screens/EditProfileScreen';
import MyPropertiesScreen from '../../screens/MyPropertiesScreen';
import PropertyDetailsScreen from '../../screens/PropertyDetailsScreen';
import SettingsScreen from '../../screens/SettingsScreen';
import NotificationsScreen from '../../screens/NotificationsScreen';
import MessagesScreen from '../../screens/MessagesScreen';
import ChatScreen from '../../screens/ChatScreen';
import ViewMapScreen from '../../screens/ViewMapScreen';

const Stack = createNativeStackNavigator();

const ProfileStack = () => {
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
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'My Profile' }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen} 
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen 
        name="MyProperties" 
        component={MyPropertiesScreen} 
        options={{ title: 'My Properties' }}
      />
      <Stack.Screen 
        name="MyPropertyDetails" 
        component={PropertyDetailsScreen} 
        options={{ title: 'Property Details' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: 'Settings' }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen 
        name="Messages" 
        component={MessagesScreen} 
        options={{ title: 'Messages' }}
      />
      <Stack.Screen 
        name="ChatScreen" 
        component={ChatScreen} 
        options={({ route }) => ({ 
          title: route.params?.recipient?.name || 'Chat',
          headerBackTitle: 'Back'
        })}
      />
      <Stack.Screen 
        name="ViewMap" 
        component={ViewMapScreen} 
        options={{ title: 'Map View' }}
      />
    </Stack.Navigator>
  );
};

export default ProfileStack;
