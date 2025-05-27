import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import axios from 'axios';
import { SERVER_URL } from '../../config/ip-config';
import { Ionicons } from '@expo/vector-icons';

const PhoneLoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validatePhone = () => {
    if (!phoneNumber) {
      setPhoneError('Phone number is required');
      return false;
    } else if (!/^\+?[1-9]\d{9,14}$/.test(phoneNumber)) {
      setPhoneError('Please enter a valid phone number with country code (e.g., +910123456789)');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleSendOTP = async () => {
    if (validatePhone()) {
      setIsLoading(true);
      
      try {
        // Call our real OTP service
        const response = await axios.post(`${SERVER_URL}/api/otp/send`, {
          phoneNumber: phoneNumber
        });
        
        setIsLoading(false);
        
        if (response.data.success) {
          // Navigate to OTP verification screen with the real verification ID
          navigation.navigate('OtpVerification', { 
            phoneNumber,
            verificationId: response.data.verificationId
          });
        } else {
          Alert.alert('Error', response.data.message || 'Failed to send verification code');
        }
      } catch (error) {
        setIsLoading(false);
        console.error('OTP send error:', error);
        
        // Show user-friendly error message
        const errorMessage = error.response?.data?.message || 
                            'Failed to send verification code. Please check your internet connection and try again.';
        Alert.alert('Error', errorMessage);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="call" size={80} color="#0066cc" />
        </View>
        
        <Text style={styles.title}>Phone Verification</Text>
        <Text style={styles.description}>
          We will send you a one-time password to this phone number
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={24} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            onBlur={validatePhone}
          />
        </View>
        {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

        <Text style={styles.hint}>Include country code (e.g., +91 for India)</Text>

        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSendOTP}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send Verification Code</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },

  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 5,
    backgroundColor: '#fff',
  },
  inputIcon: {
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 10,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  sendButton: {
    backgroundColor: '#ff6600',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    borderWidth: 1,
    borderColor: '#0066cc',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#0066cc',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PhoneLoginScreen;
