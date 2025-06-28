import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AboutApp = () => {
  return (
    <ScrollView style={styles.container}>
      {/* App Logo and Name */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="home" size={80} color="#fff" />
        </View>
        <Text style={styles.appName}>Property Pulse</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
      </View>

      {/* App Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Our App</Text>
        <Text style={styles.description}>
          Property Pulse is a modern real estate marketplace designed to connect property owners with potential buyers and renters. Our platform offers a seamless experience for listing, discovering, and transacting real estate properties.
        </Text>
      </View>

      {/* Key Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Features</Text>
        
        <View style={styles.featureItem}>
          <View style={styles.featureIconContainer}>
            <Ionicons name="home" size={24} color="#fff" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Property Listings</Text>
            <Text style={styles.featureDescription}>
              Easily list your properties with detailed information, multiple photos, and location data. Browse through a wide range of available properties with advanced filtering options.
            </Text>
          </View>
        </View>
        
        <View style={styles.featureItem}>
          <View style={[styles.featureIconContainer, { backgroundColor: '#4285F4' }]}>
            <Ionicons name="search" size={24} color="#fff" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Advanced Search</Text>
            <Text style={styles.featureDescription}>
              Find exactly what you're looking for with our powerful search and filtering capabilities. Filter by location, price range, property type, and many other parameters.
            </Text>
          </View>
        </View>
        
        <View style={styles.featureItem}>
          <View style={[styles.featureIconContainer, { backgroundColor: '#EA4335' }]}>
            <Ionicons name="map" size={24} color="#fff" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Map Integration</Text>
            <Text style={styles.featureDescription}>
              Visualize property locations on an interactive map. Explore neighborhoods and find properties in your preferred areas with ease.
            </Text>
          </View>
        </View>
        
        <View style={styles.featureItem}>
          <View style={[styles.featureIconContainer, { backgroundColor: '#FBBC05' }]}>
            <Ionicons name="chatbubble" size={24} color="#fff" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>In-App Messaging</Text>
            <Text style={styles.featureDescription}>
              Communicate directly with property owners or interested buyers through our secure in-app messaging system. Negotiate deals and ask questions without leaving the app.
            </Text>
          </View>
        </View>
        
        <View style={styles.featureItem}>
          <View style={[styles.featureIconContainer, { backgroundColor: '#34A853' }]}>
            <Ionicons name="notifications" size={24} color="#fff" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Real-time Notifications</Text>
            <Text style={styles.featureDescription}>
              Stay updated with real-time notifications about property views, messages, and favorites. Never miss an important update or potential deal.
            </Text>
          </View>
        </View>
      </View>

      {/* Technology Stack */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Technology Stack</Text>
        <Text style={styles.description}>
          Our application is built using modern technologies to ensure a smooth, responsive experience:
        </Text>
        
        <View style={styles.techList}>
          <View style={styles.techItem}>
            <Text style={styles.techName}>React Native</Text>
            <Text style={styles.techDescription}>For cross-platform mobile development</Text>
          </View>
          
          <View style={styles.techItem}>
            <Text style={styles.techName}>Node.js & Express</Text>
            <Text style={styles.techDescription}>Powering our robust backend services</Text>
          </View>
          
          <View style={styles.techItem}>
            <Text style={styles.techName}>MongoDB</Text>
            <Text style={styles.techDescription}>For flexible, scalable data storage</Text>
          </View>
          
          <View style={styles.techItem}>
            <Text style={styles.techName}>Firebase</Text>
            <Text style={styles.techDescription}>For authentication and real-time features</Text>
          </View>
          
          <View style={styles.techItem}>
            <Text style={styles.techName}>Google Maps API</Text>
            <Text style={styles.techDescription}>For location-based services</Text>
          </View>
        </View>
      </View>

      {/* Development Team */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Development Team</Text>
        <Text style={styles.description}>
          This application was developed as a comprehensive real estate marketplace solution, demonstrating modern mobile app development practices and technologies. The project showcases integration of various APIs, real-time communication, and location-based services.
        </Text>
      </View>

      {/* Copyright */}
      <View style={styles.footer}>
        <Text style={styles.copyright}>© 2023 Property Pulse. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#0066cc',
    alignItems: 'center',
    padding: 30,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  appVersion: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  techList: {
    marginTop: 15,
  },
  techItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  techName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  techDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  copyright: {
    fontSize: 12,
    color: '#999',
  },
});

export default AboutApp; 