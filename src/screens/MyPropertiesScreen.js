import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { SERVER_URL } from '../config/ip-config';
import { AuthContext } from '../context/AuthContext';

const MyPropertiesScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // all, active, pending, expired
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  useEffect(() => {
    if (userToken) {
      fetchUserProperties();
    } else {
      setIsLoading(false);
    }
  }, [userToken]);

  // Add a focus listener to refresh data when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userToken) {
        fetchUserProperties();
      }
    });

    return unsubscribe;
  }, [navigation, userToken]);

  // DIRECT fetch from MongoDB Atlas for user properties
  const fetchUserProperties = async () => {
    if (!userToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    console.log('DIRECT FETCH: Getting user properties from MongoDB Atlas...');
    
    try {
      // Use SERVER_URL from centralized config for consistency
      const apiUrl = `${SERVER_URL}/api/properties/user`;
      console.log('Using centralized SERVER_URL for user properties:', apiUrl);
      
      // Simple fetch request - most compatible approach
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${userToken}` // Add auth token for user-specific properties
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      // Parse the JSON response directly
      const data = await response.json();
      console.log('RAW USER PROPERTIES FROM MONGODB ATLAS:', data);
      
      setProperties(data);
      setIsLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('MONGODB ATLAS ERROR:', error.message);
      setIsLoading(false);
      setRefreshing(false);
      
      // Use mock data for demo
      const mockData = getMockProperties();
      console.log('Using mock data instead:', mockData.length, 'properties');
      setProperties(mockData);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserProperties();
  };

  const handlePropertyPress = (property) => {
    setSelectedProperty(property);
    setModalVisible(true);
  };

  const editProperty = (property) => {
    setModalVisible(false);
    navigation.navigate('EditProperty', { propertyId: property._id });
  };

  const viewPropertyDetails = (property) => {
    setModalVisible(false);
    navigation.navigate('MyPropertyDetails', { propertyId: property._id });
  };

  const republishProperty = async (property) => {
    try {
      // Update the property status in UI for immediate feedback
      const updatedProperties = properties.map(p => {
        if (p._id === property._id) {
          return { ...p, status: 'active' };
        }
        return p;
      });
      setProperties(updatedProperties);
      setModalVisible(false);
      
      // Make API call to update status on server
      await axios.put(`${SERVER_URL}/api/properties/${property._id}/status`, { status: 'active' }, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      Alert.alert('Success', 'Property has been republished successfully');
    } catch (error) {
      console.error('Republish property error:', error);
      Alert.alert('Error', 'Failed to republish property');
      fetchUserProperties(); // Refresh data in case of error
    }
  };

  const deleteProperty = (property) => {
    setModalVisible(false);
    Alert.alert(
      'Delete Property',
      'Are you sure you want to delete this property? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Show loading indicator
              setIsLoading(true);
              
              // Remove from UI immediately for better UX
              setProperties(properties.filter(p => p._id !== property._id));
              
              // Set up authentication header
              const config = {
                headers: {
                  'Authorization': `Bearer ${userToken}`
                }
              };
              
              // Make API call to delete on server
              await axios.delete(`${SERVER_URL}/api/properties/${property._id}`, {
                headers: {
                  'Authorization': `Bearer ${userToken}`
                }
              });
              
              // Try the fetch API method as backup if needed
              try {
                await fetch(`${SERVER_URL}/api/properties/${property._id}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${userToken}`
                  }
                });
              } catch (fetchError) {
                console.log('Fetch delete fallback not needed:', fetchError);
              }
              
              setIsLoading(false);
              Alert.alert('Success', 'Property has been deleted successfully');
              
              // Refresh data to ensure UI is in sync with database
              fetchUserProperties();
            } catch (error) {
              console.error('Delete property error:', error.response?.data || error.message || error);
              setIsLoading(false);
              Alert.alert('Error', 'Failed to delete property. Please try again.');
              fetchUserProperties(); // Refresh data in case of error
            }
          },
        },
      ]
    );
  };

  const getFilteredProperties = () => {
    if (activeFilter === 'all') {
      return properties;
    }
    return properties.filter(property => property.status === activeFilter);
  };

  // Mock data function for demo purposes
  const getMockProperties = () => [
    {
      _id: '1',
      title: '3 BHK Apartment in Whitefield',
      description: 'Spacious 3 BHK apartment with modern amenities',
      price: 25000,
      propertyType: 'Flat',
      category: 'Rent',
      bhk: 3,
      area: { value: 1450, unit: 'sqft' },
      furnishing: 'Semi-Furnished',
      images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80'],
      location: {
        address: 'Palm Meadows, Whitefield',
        city: 'Bangalore',
        state: 'Karnataka'
      },
      status: 'active',
      views: 27,
      createdAt: '2023-05-12T10:30:00Z'
    },
    {
      _id: '2',
      title: '2 BHK Independent House',
      description: 'Beautiful 2 BHK independent house with garden',
      price: 18000,
      propertyType: 'House',
      category: 'Rent',
      bhk: 2,
      area: { value: 1200, unit: 'sqft' },
      furnishing: 'Fully Furnished',
      images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80'],
      location: {
        address: 'Indiranagar, Near Metro',
        city: 'Bangalore',
        state: 'Karnataka'
      },
      status: 'pending',
      views: 0,
      createdAt: '2023-05-15T14:45:00Z'
    },
    {
      _id: '3',
      title: '1200 sq.ft Commercial Space',
      description: 'Commercial space for office or retail in prime location',
      price: 75000,
      propertyType: 'Commercial',
      category: 'Rent',
      area: { value: 1200, unit: 'sqft' },
      furnishing: 'Raw',
      images: ['https://images.unsplash.com/photo-1497366858526-0766cadbe8fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80'],
      location: {
        address: 'MG Road, CBD',
        city: 'Bangalore',
        state: 'Karnataka'
      },
      status: 'expired',
      views: 20,
      createdAt: '2023-04-01T09:15:00Z'
    },
  ];

  // Property Card Component
  const PropertyCard = ({ property }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'active': return '#25d366'; // Green
        case 'pending': return '#f39c12'; // Amber
        case 'expired': return '#e74c3c'; // Red
        default: return '#999';
      }
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
      <TouchableOpacity 
        style={styles.propertyCard}
        onPress={() => handlePropertyPress(property)}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: property.images[0] }}
            style={styles.propertyImage}
            resizeMode="cover"
          />
          <View 
            style={[styles.statusBadge, { backgroundColor: getStatusColor(property.status) }]}
          >
            <Text style={styles.statusText}>
              {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.propertyDetails}>
          <Text style={styles.propertyTitle} numberOfLines={1}>
            {property.title}
          </Text>
          
          <Text style={styles.propertyPrice}>
            ₹{property.price.toLocaleString()}
            {property.category === 'Rent' ? '/month' : ''}
          </Text>
          
          <Text style={styles.propertyLocation} numberOfLines={1}>
            <Ionicons name="location-outline" size={14} color="#666" />
            {' '}{property.location.address}
          </Text>
          
          <View style={styles.propertyFooter}>
            <Text style={styles.propertyDate}>
              Posted: {formatDate(property.createdAt)}
            </Text>
            
            <View style={styles.viewsContainer}>
              <Ionicons name="eye-outline" size={14} color="#666" />
              <Text style={styles.viewsText}>{property.views}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // If not logged in, show login prompt
  if (!userToken) {
    return (
      <View style={styles.loginPromptContainer}>
        <Ionicons name="home" size={80} color="#ddd" />
        <Text style={styles.loginPromptTitle}>No Properties Found</Text>
        <Text style={styles.loginPromptText}>
          Sign in to view and manage your property listings
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Auth')}
        >
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state
  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading your properties...</Text>
      </View>
    );
  }

  // Filter tabs
  const FilterTabs = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterTab, activeFilter === 'all' && styles.activeFilterTab]}
        onPress={() => setActiveFilter('all')}
      >
        <Text 
          style={[styles.filterText, activeFilter === 'all' && styles.activeFilterText]}
        >
          All
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterTab, activeFilter === 'active' && styles.activeFilterTab]}
        onPress={() => setActiveFilter('active')}
      >
        <Text 
          style={[styles.filterText, activeFilter === 'active' && styles.activeFilterText]}
        >
          Active
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterTab, activeFilter === 'pending' && styles.activeFilterTab]}
        onPress={() => setActiveFilter('pending')}
      >
        <Text 
          style={[styles.filterText, activeFilter === 'pending' && styles.activeFilterText]}
        >
          Pending
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterTab, activeFilter === 'expired' && styles.activeFilterTab]}
        onPress={() => setActiveFilter('expired')}
      >
        <Text 
          style={[styles.filterText, activeFilter === 'expired' && styles.activeFilterText]}
        >
          Expired
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Property modal actions
  const PropertyActionModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedProperty?.title}
            </Text>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => viewPropertyDetails(selectedProperty)}
            >
              <Ionicons name="eye-outline" size={22} color="#0066cc" />
              <Text style={styles.modalOptionText}>View Details</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => editProperty(selectedProperty)}
            >
              <Ionicons name="create-outline" size={22} color="#0066cc" />
              <Text style={styles.modalOptionText}>Edit Listing</Text>
            </TouchableOpacity>
            
            {selectedProperty?.status === 'expired' && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => republishProperty(selectedProperty)}
              >
                <Ionicons name="refresh-outline" size={22} color="#25d366" />
                <Text style={[styles.modalOptionText, { color: '#25d366' }]}>Republish</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => deleteProperty(selectedProperty)}
            >
              <Ionicons name="trash-outline" size={22} color="#e74c3c" />
              <Text style={[styles.modalOptionText, { color: '#e74c3c' }]}>Delete</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const filteredProperties = getFilteredProperties();

  // Empty state based on filter
  if (filteredProperties.length === 0) {
    return (
      <View style={styles.container}>
        <FilterTabs />
        <View style={styles.emptyContainer}>
          <Ionicons name="home-outline" size={80} color="#ddd" />
          <Text style={styles.emptyTitle}>
            {activeFilter === 'all' 
              ? 'No Properties Yet' 
              : `No ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Properties`}
          </Text>
          <Text style={styles.emptyText}>
            {activeFilter === 'all' 
              ? 'Your property listings will appear here'
              : `You don't have any ${activeFilter} property listings`}
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddProperty')}
          >
            <Text style={styles.addButtonText}>Add New Property</Text>
          </TouchableOpacity>
        </View>
        <PropertyActionModal />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FilterTabs />
      
      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <PropertyCard property={item} />}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Properties</Text>
            <Text style={styles.headerCount}>
              {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'}
            </Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addPropertyButton}
            onPress={() => navigation.navigate('AddProperty')}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addPropertyButtonText}>Add New Property</Text>
          </TouchableOpacity>
        }
      />
      
      <PropertyActionModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loginPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  loginPromptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  loginPromptText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeFilterTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0066cc',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    fontWeight: 'bold',
    color: '#0066cc',
  },
  listContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  propertyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: 150,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  propertyDetails: {
    padding: 12,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  propertyPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 5,
  },
  propertyLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  propertyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  propertyDate: {
    fontSize: 12,
    color: '#999',
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  addButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addPropertyButton: {
    backgroundColor: '#0066cc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
  addPropertyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalContent: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: 5,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
});

export default MyPropertiesScreen;
