import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HelpSupport = () => {
  const handlePhoneCall = () => {
    Linking.openURL('tel:6304767391').catch((err) => {
      Alert.alert('Error', 'Could not open phone app');
    });
  };

  const handleEmail = () => {
    Linking.openURL('mailto:govardhanbommineni@gmail.com').catch((err) => {
      Alert.alert('Error', 'Could not open email app');
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <Text style={styles.headerSubtitle}>
          We're here to help you with any questions or issues you may have.
        </Text>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Us</Text>
        
        <TouchableOpacity style={styles.contactItem} onPress={handlePhoneCall}>
          <View style={styles.contactIconContainer}>
            <Ionicons name="call" size={24} color="#fff" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Phone Support</Text>
            <Text style={styles.contactValue}>+1 (630) 476-7391</Text>
            <Text style={styles.contactHours}>Available 9 AM - 6 PM (EST), Monday to Friday</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactItem} onPress={handleEmail}>
          <View style={[styles.contactIconContainer, { backgroundColor: '#4285F4' }]}>
            <Ionicons name="mail" size={24} color="#fff" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Email Support</Text>
            <Text style={styles.contactValue}>govardhanbommineni@gmail.com</Text>
            <Text style={styles.contactHours}>We typically respond within 24 hours</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* FAQs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How do I list a property?</Text>
          <Text style={styles.faqAnswer}>
            To list a property, navigate to the "My Properties" section from your profile and tap on "Add New Property". Fill in the required details about your property, upload photos, and submit for review.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How long does it take for my property to be approved?</Text>
          <Text style={styles.faqAnswer}>
            Property listings are typically reviewed and approved within 24-48 hours. You'll receive a notification once your property is approved and live on the platform.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How do I edit my property listing?</Text>
          <Text style={styles.faqAnswer}>
            Go to "My Properties" in your profile, find the property you want to edit, tap on it, and select "Edit Listing" from the options. Make your changes and save them.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How do I contact a property owner?</Text>
          <Text style={styles.faqAnswer}>
            When viewing a property listing, you'll find contact options at the bottom of the page. You can message the owner directly through the app or use their provided contact information if available.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How do I reset my password?</Text>
          <Text style={styles.faqAnswer}>
            On the login screen, tap on "Forgot Password" and follow the instructions to reset your password. You'll receive a password reset link via email.
          </Text>
        </View>
      </View>

      {/* Support Commitment */}
      <View style={styles.supportCommitment}>
        <Text style={styles.commitmentTitle}>Our Support Commitment</Text>
        <Text style={styles.commitmentText}>
          At Property Pulse, we're committed to providing excellent customer service. Our dedicated support team works tirelessly to ensure you have the best experience using our platform. Whether you're buying, selling, or renting, we're here to help every step of the way.
        </Text>
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
    padding: 20,
    paddingTop: 30,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 15,
    color: '#0066cc',
    marginBottom: 2,
  },
  contactHours: {
    fontSize: 12,
    color: '#999',
  },
  faqItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  supportCommitment: {
    backgroundColor: '#fff',
    marginTop: 20,
    marginBottom: 30,
    padding: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  commitmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  commitmentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
  },
});

export default HelpSupport; 