import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import AddPropertyScreen from '../../screens/AddPropertyScreen';
import EditPropertyScreen from '../../screens/EditPropertyScreen';
import SimpleLocationPicker from '../../screens/SimpleLocationPicker'; // Using the improved location picker
import ImagePickerScreen from '../../screens/ImagePickerScreen';
import PropertyPreviewScreen from '../../screens/PropertyPreviewScreen';

const Stack = createNativeStackNavigator();

const AddPropertyStack = () => {
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
        name="AddProperty" 
        component={AddPropertyScreen} 
        options={{ title: 'Post a Property' }}
      />
      <Stack.Screen 
        name="LocationPicker" 
        component={SimpleLocationPicker} 
        options={{ title: 'Select Location' }}
      />
      <Stack.Screen 
        name="ImagePicker" 
        component={ImagePickerScreen} 
        options={{ title: 'Upload Images' }}
      />
      <Stack.Screen 
        name="PropertyPreview" 
        component={PropertyPreviewScreen} 
        options={{ title: 'Preview Listing' }}
      />
      <Stack.Screen 
        name="EditProperty" 
        component={EditPropertyScreen} 
        options={{ title: 'Edit Property' }}
      />
    </Stack.Navigator>
  );
};

export default AddPropertyStack;
