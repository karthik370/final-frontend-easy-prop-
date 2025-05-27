import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FilterChip from './FilterChip';

const PropertyFilters = ({ filters, onFilterChange, onApplyFilters }) => {
  const [activeSection, setActiveSection] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [tempFilters, setTempFilters] = useState({ ...filters });

  // Define filter options
  const filterOptions = {
    category: [
      { value: 'sell', label: 'Buy', icon: 'cash-outline' },
      { value: 'rent', label: 'Rent', icon: 'key-outline' },
      { value: 'pg', label: 'PG/Hostel', icon: 'bed-outline' },
    ],
    propertyType: [
      { value: 'apartment', label: 'Apartment' },
      { value: 'house', label: 'House/Villa' },
      { value: 'plot', label: 'Plot/Land' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'farmhouse', label: 'Farmhouse' },
    ],
    bhk: [
      { value: '1', label: '1 BHK' },
      { value: '2', label: '2 BHK' },
      { value: '3', label: '3 BHK' },
      { value: '4', label: '4 BHK' },
      { value: '5+', label: '5+ BHK' },
    ],
    furnishing: [
      { value: 'fully_furnished', label: 'Fully Furnished' },
      { value: 'semi_furnished', label: 'Semi Furnished' },
      { value: 'unfurnished', label: 'Unfurnished' },
    ],
    amenities: [
      { value: 'parking', label: 'Parking' },
      { value: 'lift', label: 'Lift' },
      { value: 'swimming_pool', label: 'Swimming Pool' },
      { value: 'gym', label: 'Gym' },
      { value: 'security', label: 'Security' },
      { value: 'garden', label: 'Garden' },
      { value: 'power_backup', label: 'Power Backup' },
    ],
    sortBy: [
      { value: 'relevance', label: 'Relevance' },
      { value: 'newest', label: 'Newest First' },
      { value: 'price_low', label: 'Price: Low to High' },
      { value: 'price_high', label: 'Price: High to Low' },
    ],
  };

  const handleFilterSelect = (section, value) => {
    let updatedFilters;

    // For single-select filters
    if (['category', 'propertyType', 'furnishing', 'sortBy'].includes(section)) {
      updatedFilters = {
        ...tempFilters,
        [section]: tempFilters[section] === value ? '' : value,
      };
    }
    // For multi-select filters
    else if (section === 'amenities') {
      const amenities = tempFilters.amenities || [];
      updatedFilters = {
        ...tempFilters,
        amenities: amenities.includes(value)
          ? amenities.filter(item => item !== value)
          : [...amenities, value],
      };
    }
    // For BHK filter
    else if (section === 'bhk') {
      const bhk = tempFilters.bhk || [];
      updatedFilters = {
        ...tempFilters,
        bhk: bhk.includes(value)
          ? bhk.filter(item => item !== value)
          : [...bhk, value],
      };
    }

    setTempFilters(updatedFilters);
  };

  const openFilterModal = (section) => {
    setActiveSection(section);
    setModalVisible(true);
  };

  const applyFilters = () => {
    onFilterChange(tempFilters);
    if (onApplyFilters) {
      onApplyFilters(tempFilters);
    }
    setModalVisible(false);
  };

  const clearFilters = () => {
    if (activeSection) {
      // Clear only the active section
      const cleared = { ...tempFilters };
      if (activeSection === 'bhk' || activeSection === 'amenities') {
        cleared[activeSection] = [];
      } else {
        cleared[activeSection] = '';
      }
      setTempFilters(cleared);
    } else {
      // Clear all filters
      setTempFilters({
        category: '',
        propertyType: '',
        bhk: [],
        furnishing: '',
        amenities: [],
        sortBy: 'relevance',
      });
    }
  };

  const cancelChanges = () => {
    setTempFilters({ ...filters });
    setModalVisible(false);
  };

  const isFilterActive = (section) => {
    if (section === 'bhk' || section === 'amenities') {
      return tempFilters[section]?.length > 0;
    } else {
      return !!tempFilters[section];
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (tempFilters.category) count++;
    if (tempFilters.propertyType) count++;
    if (tempFilters.bhk?.length > 0) count++;
    if (tempFilters.furnishing) count++;
    if (tempFilters.amenities?.length > 0) count++;
    return count;
  };

  const renderModalContent = () => {
    if (!activeSection) return null;

    const options = filterOptions[activeSection];
    const isMultiSelect = activeSection === 'bhk' || activeSection === 'amenities';

    return (
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {activeSection === 'bhk' ? 'BHK' : 
             activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
          </Text>
          <TouchableOpacity onPress={cancelChanges}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalOptionsContainer}>
          <View style={styles.modalOptions}>
            {options.map(option => {
              const isSelected = isMultiSelect
                ? tempFilters[activeSection]?.includes(option.value)
                : tempFilters[activeSection] === option.value;
              
              return (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  selected={isSelected}
                  icon={option.icon}
                  onPress={() => handleFilterSelect(activeSection, option.value)}
                  style={styles.modalChip}
                />
              );
            })}
          </View>
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={clearFilters}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.applyButton} 
            onPress={applyFilters}
          >
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Filter by Category */}
        <FilterChip
          label="Category"
          icon="options-outline"
          selected={isFilterActive('category')}
          onPress={() => openFilterModal('category')}
        />
        
        {/* Filter by Property Type */}
        <FilterChip
          label="Property Type"
          icon="home-outline"
          selected={isFilterActive('propertyType')}
          onPress={() => openFilterModal('propertyType')}
        />
        
        {/* Filter by BHK */}
        <FilterChip
          label="BHK"
          icon="bed-outline"
          selected={isFilterActive('bhk')}
          onPress={() => openFilterModal('bhk')}
        />
        
        {/* Filter by Furnishing */}
        <FilterChip
          label="Furnishing"
          icon="cube-outline"
          selected={isFilterActive('furnishing')}
          onPress={() => openFilterModal('furnishing')}
        />
        
        {/* Filter by Amenities */}
        <FilterChip
          label="Amenities"
          icon="water-outline"
          selected={isFilterActive('amenities')}
          onPress={() => openFilterModal('amenities')}
        />
        
        {/* Sort By */}
        <FilterChip
          label="Sort"
          icon="swap-vertical-outline"
          selected={tempFilters.sortBy !== 'relevance'}
          onPress={() => openFilterModal('sortBy')}
        />
      </ScrollView>
      
      {getActiveFilterCount() > 0 && (
        <TouchableOpacity 
          style={styles.clearAllButton}
          onPress={() => {
            setActiveSection(null);
            clearFilters();
            onFilterChange({
              category: '',
              propertyType: '',
              bhk: [],
              furnishing: '',
              amenities: [],
              sortBy: 'relevance',
            });
          }}
        >
          <Text style={styles.clearAllText}>Clear All ({getActiveFilterCount()})</Text>
        </TouchableOpacity>
      )}
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={cancelChanges}
      >
        <View style={styles.modalContainer}>
          {renderModalContent()}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 5,
  },
  clearAllButton: {
    marginLeft: 15,
    marginTop: 5,
  },
  clearAllText: {
    color: '#0066cc',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    height: '70%', // Use 70% of screen height
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  modalOptionsContainer: {
    flex: 1,
  },
  modalOptions: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalChip: {
    marginBottom: 10,
    marginRight: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#0066cc',
    borderRadius: 5,
  },
  clearButtonText: {
    color: '#0066cc',
    fontSize: 16,
    fontWeight: '500',
  },
  applyButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#0066cc',
    borderRadius: 5,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PropertyFilters;
