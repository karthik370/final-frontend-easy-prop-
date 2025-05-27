import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { SERVER_URL } from '../config/ip-config';

export const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load favorites from AsyncStorage on app start
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const storedFavorites = await AsyncStorage.getItem('favorites');
        if (storedFavorites) {
          setFavorites(JSON.parse(storedFavorites));
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, []);

  // Save favorites to AsyncStorage whenever they change
  useEffect(() => {
    const saveFavorites = async () => {
      try {
        await AsyncStorage.setItem('favorites', JSON.stringify(favorites));
      } catch (error) {
        console.error('Error saving favorites:', error);
      }
    };

    if (!loading) {
      saveFavorites();
    }
  }, [favorites, loading]);

  // Check if a property is in favorites
  const isFavorite = (propertyId) => {
    return favorites.includes(propertyId);
  };

  // Toggle a property in favorites
  const toggleFavorite = async (propertyId) => {
    try {
      if (isFavorite(propertyId)) {
        // Remove from favorites
        setFavorites(favorites.filter(id => id !== propertyId));
      } else {
        // Add to favorites
        setFavorites([...favorites, propertyId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Fetch all favorite properties
  const getFavoriteProperties = async () => {
    try {
      const response = await axios.post(`${SERVER_URL}/api/properties/getByIds`, {
        propertyIds: favorites
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching favorite properties:', error);
      return [];
    }
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        getFavoriteProperties,
        loading
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};
