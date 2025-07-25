import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FilterScreen = ({ route, navigation }) => {
  const { currentFilters, onApplyFilters } = route.params;

  const [category, setCategory] = useState(currentFilters.category || '');
  const [propertyType, setPropertyType] = useState(currentFilters.propertyType || '');
  const [minPrice, setMinPrice] = useState(currentFilters.minPrice || '');
  const [maxPrice, setMaxPrice] = useState(currentFilters.maxPrice || '');
  const [bhk, setBhk] = useState(currentFilters.bhk || '');
  const [furnishing, setFurnishing] = useState(currentFilters.furnishing || '');
  const [city, setCity] = useState(currentFilters.city || '');

  const handleApplyFilters = () => {
    const newFilters = {
      category,
      propertyType,
      minPrice,
      maxPrice,
      bhk,
      furnishing,
      city,
    };
    
    onApplyFilters(newFilters);
    navigation.goBack();
  };

  const handleResetFilters = () => {
    setCategory('');
    setPropertyType('');
    setMinPrice('');
    setMaxPrice('');
    setBhk('');
    setFurnishing('');
    setCity('');
  };

  const categoryOptions = [
    { value: 'Sell', label: 'Buy' },
    { value: 'Rent', label: 'Rent' },
  ];

  const propertyTypeOptions = [
    { value: 'Flat', label: 'Flat' },
    { value: 'House', label: 'House' },
    { value: 'Plot', label: 'Plot' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'PG', label: 'PG' },
  ];

  const bhkOptions = [
    { value: '1', label: '1 BHK' },
    { value: '2', label: '2 BHK' },
    { value: '3', label: '3 BHK' },
    { value: '4', label: '4 BHK' },
    { value: '5', label: '5+ BHK' },
  ];

  const furnishingOptions = [
    { value: 'Unfurnished', label: 'Unfurnished' },
    { value: 'Semi-Furnished', label: 'Semi-Furnished' },
    { value: 'Fully Furnished', label: 'Fully Furnished' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filters</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetFilters}
        >
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Category Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Looking To</Text>
          <View style={styles.optionsContainer}>
            {categoryOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  category === option.value && styles.optionButtonSelected,
                ]}
                onPress={() => setCategory(option.value)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    category === option.value && styles.optionButtonTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Property Type Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Property Type</Text>
          <View style={styles.optionsContainer}>
            {propertyTypeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  propertyType === option.value && styles.optionButtonSelected,
                ]}
                onPress={() => setPropertyType(option.value)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    propertyType === option.value && styles.optionButtonTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Budget/Price Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Budget</Text>
          <View style={styles.priceContainer}>
            <View style={styles.priceInputContainer}>
              <Text style={styles.priceLabel}>Min Price</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  value={minPrice}
                  onChangeText={setMinPrice}
                  placeholder="0"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.priceSeparator} />
            <View style={styles.priceInputContainer}>
              <Text style={styles.priceLabel}>Max Price</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  placeholder="Any"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        </View>

        {/* BHK Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>BHK</Text>
          <View style={styles.optionsContainer}>
            {bhkOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  bhk === option.value && styles.optionButtonSelected,
                ]}
                onPress={() => setBhk(option.value)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    bhk === option.value && styles.optionButtonTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Furnishing Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Furnishing</Text>
          <View style={styles.optionsContainer}>
            {furnishingOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  furnishing === option.value && styles.optionButtonSelected,
                ]}
                onPress={() => setFurnishing(option.value)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    furnishing === option.value && styles.optionButtonTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* City Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>City</Text>
          <View style={styles.cityInputContainer}>
            <Ionicons name="location-outline" size={20} color="#666" style={styles.cityIcon} />
            <TextInput
              style={styles.cityInput}
              value={city}
              onChangeText={setCity}
              placeholder="Enter city name"
              placeholderTextColor="#888"
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApplyFilters}
        >
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  resetButton: {
    padding: 5,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#0066cc',
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
  },
  filterSection: {
    paddingHorizontal: 15,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    marginBottom: 10,
  },
  optionButtonSelected: {
    backgroundColor: '#0066cc',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#666',
  },
  optionButtonTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  priceContainer: {
    flexDirection: 'row',
  },
  priceInputContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#333',
  },
  priceInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 5,
    fontSize: 16,
  },
  priceSeparator: {
    width: 15,
  },
  cityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  cityIcon: {
    marginRight: 10,
  },
  cityInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  bottomBar: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  applyButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FilterScreen;
