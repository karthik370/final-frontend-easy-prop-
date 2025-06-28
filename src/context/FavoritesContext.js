import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { SERVER_URL } from '../config/ip-config';

export const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]); // array of property IDs
  const [favoriteProperties, setFavoriteProperties] = useState([]); // array of property objects
  const [loading, setLoading] = useState(true);

  // Helper to fetch full property objects for given IDs
  const fetchFavoriteProperties = async (ids) => {
    if (!ids || ids.length === 0) {
      setFavoriteProperties([]);
      return;
    }
    try {
      const response = await axios.post(`${SERVER_URL}/api/properties/getByIds`, {
        propertyIds: ids
      });
      setFavoriteProperties(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching favorite properties:', error);
      setFavoriteProperties([]);
    }
  };

  // Load favorites from backend on app start or login
  useEffect(() => {
    const fetchFavoritesFromBackend = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${SERVER_URL}/api/properties/favorites`);
        const properties = Array.isArray(response.data) ? response.data : [];
        const ids = properties.map(p => p._id);
        setFavorites(ids);
        setFavoriteProperties(properties);
      } catch (error) {
        console.error('Error fetching favorites from backend:', error);
        setFavorites([]);
        setFavoriteProperties([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFavoritesFromBackend();
  }, []);

  // Check if a property is in favorites
  const isFavorite = (propertyId) => {
    return favorites.includes(propertyId);
  };

  // Toggle a property in favorites (sync with backend and update both arrays)
  const toggleFavorite = async (propertyId) => {
    try {
      let updatedFavorites, updatedProperties;
      if (isFavorite(propertyId)) {
        // Remove from backend
        await axios.delete(`${SERVER_URL}/api/properties/${propertyId}/favorite`);
        updatedFavorites = favorites.filter(id => id !== propertyId);
        setFavorites(updatedFavorites);
        // Remove from property objects
        updatedProperties = favoriteProperties.filter(p => p._id !== propertyId);
        setFavoriteProperties(updatedProperties);
        return false; // removed
      } else {
        // Add to backend
        await axios.post(`${SERVER_URL}/api/properties/${propertyId}/favorite`);
        updatedFavorites = [...favorites, propertyId];
        setFavorites(updatedFavorites);
        // Fetch and add the new property object
        const propRes = await axios.get(`${SERVER_URL}/api/properties/${propertyId}`);
        if (propRes.data && propRes.data._id) {
          setFavoriteProperties([...favoriteProperties, propRes.data]);
        } else {
          // fallback: refetch all
          fetchFavoriteProperties(updatedFavorites);
        }
        return true; // added
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return isFavorite(propertyId); // fallback to current state
    }
  };

  // Manual reload of favorites from backend (for screens to call after add/remove)
  const reloadFavorites = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${SERVER_URL}/api/properties/favorites`);
      const properties = Array.isArray(response.data) ? response.data : [];
      const ids = properties.map(p => p._id);
      setFavorites(ids);
      setFavoriteProperties(properties);
    } catch (error) {
      console.error('Error reloading favorites from backend:', error);
      setFavorites([]);
      setFavoriteProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all favorite properties (manual, returns array)
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
        favoriteProperties,
        isFavorite,
        toggleFavorite,
        getFavoriteProperties,
        reloadFavorites,
        loading
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};
