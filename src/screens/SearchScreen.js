import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput, TouchableOpacity, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { SERVER_URL } from '../config/ip-config';
import { LocationContext } from '../context/LocationContext';

// Components
import PropertyCard from '../components/PropertyCard';

const SearchScreen = ({ route, navigation }) => {
  const initialQuery = route.params?.initialQuery || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    propertyType: '',
    minPrice: '',
    maxPrice: '',
    bhk: '',
    furnishing: '',
    city: '',
  });

  const { address } = useContext(LocationContext);

  useEffect(() => {
    if (initialQuery) {
      handleSearch();
    } else {
      // Load default properties when screen mounts
      loadProperties();
    }
  }, []);

  // Property search with reliable filtering
  const loadProperties = async (page = 1, appliedFilters = filters) => {
    console.log('🔎 Starting property search...');
    if (page === 1) {
      setIsLoading(true);
    }

    // Track if we've handled the response to prevent state updates after unmounting
    let responseHandled = false;
    
    // Safety timeout to ensure loading state doesn't get stuck
    const safetyTimeout = setTimeout(() => {
      if (!responseHandled) {
        console.log('⚠️ Search safety timeout reached - ensuring UI is responsive');
        setIsLoading(false);
      }
    }, 15000); // 15 second safety timeout
    
    console.log('🔍 Current appliedFilters:', JSON.stringify(appliedFilters));
    
    try {
      // --- Improved filter parameter construction ---
      const params = { page, limit: 10 };

      // Add search query if present
      if (searchQuery && searchQuery.trim() !== '') {
        params.search = searchQuery.trim();
        params.keyword = searchQuery.trim();
      }

      // Category filter (Buy → Sell mapping)
      if (appliedFilters.category && appliedFilters.category !== '') {
        if (appliedFilters.category === 'Buy') {
          params.category = 'Sell';
        } else if (appliedFilters.category === 'PG/Hostel') {
          // For PG/Hostel, send propertyType as array if backend supports it
          params.propertyType = ['PG', 'Hostel'];
        } else {
          params.category = appliedFilters.category;
        }
      }

      // Property type filter (if not already set by PG/Hostel logic)
      if (
        appliedFilters.propertyType &&
        appliedFilters.propertyType !== '' &&
        !(
          appliedFilters.category === 'PG/Hostel' &&
          Array.isArray(params.propertyType)
        )
      ) {
        params.propertyType = appliedFilters.propertyType;
      }

      // Price range
      if (appliedFilters.minPrice && appliedFilters.minPrice !== '') {
        params.minPrice = appliedFilters.minPrice;
      }
      if (appliedFilters.maxPrice && appliedFilters.maxPrice !== '') {
        params.maxPrice = appliedFilters.maxPrice;
      }

      // BHK/bedrooms
      if (appliedFilters.bhk && appliedFilters.bhk !== '') {
        params.bhk = appliedFilters.bhk;
        params.bedrooms = appliedFilters.bhk;
      }

      // Furnishing
      if (appliedFilters.furnishing && appliedFilters.furnishing !== '') {
        params.furnishing = appliedFilters.furnishing;
      }

      // City
      if (appliedFilters.city && appliedFilters.city !== '') {
        params.city = appliedFilters.city;
      }

      // Remove any undefined or empty string values (for clean API call)
      Object.keys(params).forEach(
        (key) =>
          (params[key] === undefined || params[key] === '' || (Array.isArray(params[key]) && params[key].length === 0)) &&
          delete params[key]
      );

      console.log('Final search params:', params);
      // --- End improved filter parameter construction ---
      
      // Make the API call using axios
      const response = await axios.get(`${SERVER_URL}/api/properties`, {
        params,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache'
        },
        timeout: 15000 // 15 second timeout
      });
      
      console.log('✅ Search response received');
      responseHandled = true;
      
      // Get the data directly from axios response
      const data = response.data;
      console.log('Data received:', typeof data, Array.isArray(data) ? data.length : 'not array');
      
      // Property extraction with multiple format support
      let propertiesToDisplay = [];
      let paginationFound = false;
      
      // Handle ALL possible response formats
      if (Array.isArray(data)) {
        // Direct array of properties
        console.log(`📊 Direct array with ${data.length} properties`);
        propertiesToDisplay = data;
      } 
      else if (data && Array.isArray(data.properties)) {
        // Standard {properties: [...]} format with pagination
        console.log(`📊 Standard format with ${data.properties.length} properties`);
        propertiesToDisplay = data.properties;
        
        // Check for pagination data
        if (data.page && data.totalPages) {
          console.log(`📊 Pagination data found: Page ${data.page} of ${data.totalPages}`);
          setCurrentPage(data.page);
          setTotalPages(data.totalPages);
          setHasMore(data.page < data.totalPages);
          paginationFound = true;
        }
      } 
      else if (data && typeof data === 'object') {
        // Search for property-like arrays in any key
        console.log('🔍 Non-standard response, searching for property arrays...');
        
        // First look for arrays containing property-like objects
        for (const key in data) {
          if (Array.isArray(data[key]) && data[key].length > 0) {
            // Check if array contains property-like objects
            if (data[key][0] && 
                (data[key][0].title || data[key][0].price || 
                 data[key][0].location || data[key][0].category)) {
              propertiesToDisplay = data[key];
              console.log(`🔎 Found properties in key "${key}" with ${propertiesToDisplay.length} properties`);
              break;
            }
          }
        }
        
        // If no property array found, use any available array
        if (propertiesToDisplay.length === 0) {
          for (const key in data) {
            if (Array.isArray(data[key]) && data[key].length > 0) {
              propertiesToDisplay = data[key];
              console.log(`⚠️ Using best-guess array from key "${key}": ${propertiesToDisplay.length} items`);
              break;
            }
          }
        }
      }
      
      // Verify and use the properties
      console.log(`🔢 Final property count: ${propertiesToDisplay.length}`);
      
      // Update state with the found properties
      if (propertiesToDisplay.length > 0) {
        // Validate each property has at least basic required fields
        const validProperties = propertiesToDisplay.filter(item => 
          item && typeof item === 'object' && 
          (item.title || item.price || item.location || item.images || item.description)
        );
        
        console.log(`✓ Found ${validProperties.length} valid properties for display`);
        
        // Update state based on pagination
        if (page === 1) {
          console.log('🔄 Setting initial properties list');
          setProperties(validProperties);
        } else {
          console.log('➕ Adding more properties to existing list');
          setProperties(prev => [...prev, ...validProperties]);
        }
        
        // Set pagination if not already found in response
        if (!paginationFound) {
          console.log('📝 Setting default pagination values');
          setHasMore(validProperties.length >= 10); // Assume we have more if we got a full page
        }
      } else {
        console.log('📭 No properties found matching search criteria');
        if (page === 1) {
          setProperties([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('🔴 SEARCH ERROR:', error.message);
      responseHandled = true;
      
      // Fallback to mock data for demo
      if (page === 1) {
        try {
          console.log('🔄 Loading mock search results as fallback...');
          const mockData = getMockProperties();
          console.log('⚠️ Using mock search results:', mockData.length, 'properties');
          setProperties(mockData);
        } catch (mockError) {
          console.error('Mock data error:', mockError);
          setProperties([]);
        }
      }
      setHasMore(false);
    } finally {
      // Always clean up and reset loading states
      console.log('🔄 Cleaning up search operation...');
      clearTimeout(safetyTimeout);
      setIsLoading(false);
      responseHandled = true;
    }
  };

  // Enhanced handleSearch: parses searchQuery and applies relevant filters before searching
  const handleSearch = () => {
    let parsedFilters = { ...filters };
    const query = searchQuery.trim().toLowerCase();
    // Parse for category
    if (query.includes('buy')) {
      parsedFilters.category = 'Buy';
    } else if (query.includes('rent')) {
      parsedFilters.category = 'Rent';
    } else if (query.includes('pg') || query.includes('hostel')) {
      parsedFilters.category = 'PG/Hostel';
    }
    // Parse for BHK
    const bhkMatch = query.match(/(\d+)\s*bhk/);
    if (bhkMatch) {
      parsedFilters.bhk = bhkMatch[1];
    }
    // Parse for city (if city is not already set)
    if (!parsedFilters.city) {
      const cityList = ['bangalore', 'mumbai', 'delhi', 'hyderabad', 'chennai', 'pune', 'kolkata'];
      for (let city of cityList) {
        if (query.includes(city)) {
          parsedFilters.city = city.charAt(0).toUpperCase() + city.slice(1);
          break;
        }
      }
    }
    // Parse for location/address (if not already set)
    // Optionally, you can add more sophisticated NLP here
    setFilters(parsedFilters);
    setCurrentPage(1);
    loadProperties(1, parsedFilters);
  };


  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      loadProperties(currentPage + 1);
    }
  };

  const openFilters = () => {
    navigation.navigate('FilterScreen', {
      currentFilters: filters,
      onApplyFilters: (newFilters) => {
        setFilters(newFilters);
        loadProperties(1, newFilters);
      },
    });
  };

  const handleViewMap = () => {
    navigation.navigate('ViewMap', {
      searchQuery: searchQuery,
      filters: filters
    });
  };

  // Render the footer for the FlatList (loading indicator or end message)
  const renderFooter = () => {
    if (isLoading && currentPage > 1) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#0066cc" />
          <Text style={styles.footerText}>Loading more properties...</Text>
        </View>
      );
    }
    
    if (!hasMore && properties.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerText}>No more properties to load</Text>
        </View>
      );
    }
    
    return null;
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
      status: 'active'
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
      status: 'active'
    },
    {
      _id: '3',
      title: 'Premium PG Accommodation',
      description: 'Luxury PG with AC, TV, and all meals',
      price: 12000,
      propertyType: 'PG',
      category: 'Rent',
      area: { value: 250, unit: 'sqft' },
      furnishing: 'Fully Furnished',
      images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80'],
      location: {
        address: 'HSR Layout, Sector 2',
        city: 'Bangalore',
        state: 'Karnataka'
      },
      status: 'active'
    }
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <View style={styles.container}>
        {/* Search Header */}
        <View style={styles.searchHeader}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={address?.city ? `Search in ${address.city}` : "Search properties..."}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={openFilters}
            >
              <Ionicons name="options-outline" size={22} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={handleViewMap}
            >
              <Ionicons name="map-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {/* Applied Filters Pills */}
          {Object.values(filters).some(value => value !== '') && (
            <View style={styles.appliedFiltersContainer}>
              {filters.category && (
                <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>{filters.category}</Text>
                </View>
              )}
              {filters.propertyType && (
                <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>{filters.propertyType}</Text>
                </View>
              )}
              {(filters.minPrice || filters.maxPrice) && (
                <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>
                    {filters.minPrice ? `₹${filters.minPrice}` : '₹0'} - 
                    {filters.maxPrice ? `₹${filters.maxPrice}` : 'Any'}
                  </Text>
                </View>
              )}
              {filters.bhk && (
                <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>{filters.bhk} BHK</Text>
                </View>
              )}
              {filters.furnishing && (
                <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>{filters.furnishing}</Text>
                </View>
              )}
              {filters.city && (
                <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>{filters.city}</Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={() => {
                  setFilters({
                    category: '',
                    propertyType: '',
                    minPrice: '',
                    maxPrice: '',
                    bhk: '',
                    furnishing: '',
                    city: '',
                  });
                  setCurrentPage(1);
                  loadProperties(1);
                }}
              >
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Properties List */}
        {isLoading && currentPage === 1 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0066cc" />
            <Text style={styles.loaderText}>Searching properties...</Text>
          </View>
        ) : properties.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={50} color="#999" />
            <Text style={styles.noResultsText}>No properties found</Text>
            <Text style={styles.noResultsSubtext}>
              Try changing your search criteria or filters
            </Text>
          </View>
        ) : (
          <FlatList
            data={(!initialQuery && Object.values(filters).every(v => v === '')) ? properties.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : properties}
            keyExtractor={(item) => item._id.toString()}
            renderItem={({ item }) => (
              <PropertyCard
                property={item}
                onPress={() => navigation.navigate('SearchPropertyDetails', { propertyId: item._id })}
              />
            )}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={isLoading && currentPage === 1}
                onRefresh={handleSearch}
                colors={['#0066cc']}
                tintColor="#0066cc"
              />
            }
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  searchHeader: {
    backgroundColor: '#0066cc',
    paddingTop: 10,
    paddingBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 5,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  filterButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appliedFiltersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    flexWrap: 'wrap',
  },
  filterPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    marginBottom: 8,
  },
  filterPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  clearFiltersButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  noResultsText: {
    marginTop: 20,
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  noResultsSubtext: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerEnd: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  }
});

export default SearchScreen;
