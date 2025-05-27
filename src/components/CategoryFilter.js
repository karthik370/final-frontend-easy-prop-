import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CategoryFilter = ({ selectedCategory, onSelectCategory }) => {
  const categories = [
    { id: 'All', label: 'All', icon: 'home-outline' },
    { id: 'Buy', label: 'Buy', icon: 'wallet-outline' },
    { id: 'Rent', label: 'Rent', icon: 'key-outline' },
    { id: 'PG', label: 'PG', icon: 'bed-outline' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollView}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryItem,
              selectedCategory === category.id && styles.selectedCategory,
            ]}
            onPress={() => onSelectCategory(category.id)}
          >
            <Ionicons
              name={category.icon}
              size={20}
              color={selectedCategory === category.id ? '#fff' : '#666'}
              style={styles.categoryIcon}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.selectedCategoryText,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  scrollView: {
    paddingHorizontal: 15,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  selectedCategory: {
    backgroundColor: '#0066cc',
  },
  categoryIcon: {
    marginRight: 5,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default CategoryFilter;
