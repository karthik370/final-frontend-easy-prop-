import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FilterChip = ({
  label,
  selected = false,
  onPress,
  onClose,
  closable = false,
  icon,
  disabled = false,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && styles.selected,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {icon && (
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={16}
            color={selected ? '#ffffff' : '#666666'}
          />
        </View>
      )}
      <Text style={[styles.label, selected && styles.selectedLabel]}>
        {label}
      </Text>
      {closable && (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons
            name="close-circle"
            size={16}
            color={selected ? '#ffffff' : '#999999'}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  selected: {
    backgroundColor: '#0066cc',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 14,
    color: '#666666',
  },
  selectedLabel: {
    color: '#ffffff',
    fontWeight: '500',
  },
  iconContainer: {
    marginRight: 6,
  },
  closeButton: {
    marginLeft: 6,
  },
});

export default FilterChip;
