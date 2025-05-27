import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config/api';

const SimpleAddPropertyScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [successCount, setSuccessCount] = useState(0);

  const addProperty = async () => {
    setIsLoading(true);
    try {
      // Generate a unique name with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const count = successCount + 1;
      
      const imageUrls = [
        'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg',
        'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg'
      ];
      
      // Create a simple property with guaranteed working images
      const propertyData = {
        title: `Quick Property #${count} - ${timestamp}`,
        description: 'This property was added with the instant add button',
        price: 35000 + (count * 1000),
        category: 'Rent',
        propertyType: 'Apartment',
        bhk: 3,
        area: {
          value: 1500,
          unit: 'sqft'
        },
        furnishing: 'Semi-Furnished',
        amenities: ['Parking', 'Security', 'Water Supply', 'Power Backup'],
        images: imageUrls,
        location: {
          address: 'Banjara Hills, Hyderabad',
          city: 'Hyderabad',
          state: 'Telangana',
          country: 'India',
          coordinates: {
            type: 'Point',
            coordinates: [78.4867, 17.385]
          }
        },
        contactInfo: {
          name: 'Property Owner',
          phone: '9876543210',
          email: 'owner@example.com',
          showPhone: true,
          showEmail: true
        }
      };
      
      console.log('SENDING PROPERTY TO DATABASE:', JSON.stringify(propertyData).substring(0, 100) + '...');
      
      const response = await fetch(`${API_URL}/api/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVmYjUzZDgzZjA2Zjc0MjRlOGUyZmQ0MCIsImlhdCI6MTYwNTcwNDI1OSwiZXhwIjoxNjA4Mjk2MjU5fQ.cBg9Kt54GjUzGMFP_gv7MCdKTK_Qg-CeXUj8Ee75T0s'
        },
        body: JSON.stringify(propertyData)
      });
      
      const data = await response.json();
      console.log('API RESPONSE:', JSON.stringify(data).substring(0, 100) + '...');
      
      setSuccessCount(count);
      
      Alert.alert(
        '✅ Property Added!', 
        'Property has been stored in the database. Go to Home to see it.',
        [{ text: 'Go to Home', onPress: () => navigation.navigate('HomeTab') }]
      );
    } catch (error) {
      console.error('Error adding property:', error);
      Alert.alert('Error', 'Could not add property: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="add-circle" size={60} color="#2196F3" />
          <Text style={styles.title}>Quick Property Add</Text>
          <Text style={styles.subtitle}>Add a property with a single tap</Text>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>What happens when you tap the button:</Text>
          <Text style={styles.infoText}>1. A new property is created with real images</Text>
          <Text style={styles.infoText}>2. It's saved to the MongoDB database</Text>
          <Text style={styles.infoText}>3. It will appear on the Home screen</Text>
          <Text style={styles.infoText}>4. You can view all details</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.bigButton} 
          onPress={addProperty}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={30} color="#fff" />
              <Text style={styles.bigButtonText}>TAP TO ADD PROPERTY NOW</Text>
            </>
          )}
        </TouchableOpacity>
        
        {successCount > 0 && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>Properties added: {successCount}</Text>
            <TouchableOpacity 
              style={styles.viewButton}
              onPress={() => navigation.navigate('HomeTab')}
            >
              <Text style={styles.viewButtonText}>VIEW IN HOME</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginVertical: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#444',
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    paddingLeft: 10,
  },
  bigButton: {
    backgroundColor: '#2196F3',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 30,
    elevation: 3,
  },
  bigButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  successContainer: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#388e3c',
    marginBottom: 15,
  },
  viewButton: {
    backgroundColor: '#388e3c',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default SimpleAddPropertyScreen;
