import React, { useState, useContext, useEffect, useRef } from 'react';
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
  Keyboard
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { SERVER_URL } from '../../config/ip-config';

const OtpVerificationScreen = ({ route, navigation }) => {
  const { phoneNumber, verificationId } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [remainingTime, setRemainingTime] = useState(60); // 60 seconds countdown
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  
  const { firebaseLogin } = useContext(AuthContext);
  
  const inputRefs = useRef([]);

  // Handle OTP input changes
  const handleOtpChange = (value, index) => {
    // Only allow numeric input
    if (/^\d?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      
      // Auto-focus next input if current input filled
      if (value && index < 5) {
        inputRefs.current[index + 1].focus();
      }
    }
  };

  // Handle backspace key press
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      // Focus previous input on backspace when current is empty
      inputRefs.current[index - 1].focus();
    }
  };

  // Countdown timer for OTP resend
  useEffect(() => {
    if (remainingTime > 0 && isResendDisabled) {
      const timer = setTimeout(() => {
        setRemainingTime(remainingTime - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (remainingTime === 0) {
      setIsResendDisabled(false);
    }
  }, [remainingTime, isResendDisabled]);

  // Handle OTP verification
  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    
    if (otpValue.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit verification code');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call our real OTP verification API
      const response = await axios.post(`${SERVER_URL}/api/otp/verify`, {
        verificationId,
        otp: otpValue
      });
      
      if (response.data.success) {
        // The API already handled user creation/login and returned a token
        const { token, user } = response.data;
        
        // Update AuthContext with the user and token
        const { setUser, setUserToken } = useContext(AuthContext);
        setUser(user);
        setUserToken(token);
        
        // Store in AsyncStorage (handled by AuthContext setUserToken)
        console.log('Phone authentication successful');
        
        // Navigate to Home screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        Alert.alert('Error', response.data.message || 'Verification failed');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      const errorMessage = error.response?.data?.message || 
                          'Failed to verify code. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP resend
  const handleResendOtp = async () => {
    // Reset timer and disable resend button
    setRemainingTime(60);
    setIsResendDisabled(true);
    setIsLoading(true);
    
    try {
      // Call our real OTP service to send a new code
      const response = await axios.post(`${SERVER_URL}/api/otp/send`, {
        phoneNumber: phoneNumber
      });
      
      setIsLoading(false);
      
      if (response.data.success) {
        // Update the verification ID with the new one
        route.params.verificationId = response.data.verificationId;
        
        Alert.alert('Success', 'A new verification code has been sent to your phone');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to send new verification code');
        // Reset the timer if failed
        setIsResendDisabled(false);
        setRemainingTime(0);
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Resend OTP error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          'Failed to send new code. Please try again.';
      Alert.alert('Error', errorMessage);
      
      // Reset the timer if failed
      setIsResendDisabled(false);
      setRemainingTime(0);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Verify Phone</Text>
        <Text style={styles.description}>
          Enter the 6-digit code sent to{' '}
          <Text style={styles.phoneText}>{phoneNumber}</Text>
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              style={styles.otpInput}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              ref={(ref) => (inputRefs.current[index] = ref)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.verifyButton}
          onPress={handleVerifyOtp}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          {isResendDisabled ? (
            <Text style={styles.timerText}>{`Resend in ${remainingTime}s`}</Text>
          ) : (
            <TouchableOpacity onPress={handleResendOtp}>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Change Phone Number</Text>
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
  phoneText: {
    fontWeight: 'bold',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  otpInput: {
    width: 45,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: '#fff',
  },
  verifyButton: {
    backgroundColor: '#ff6600',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  resendText: {
    color: '#666',
    fontSize: 14,
  },
  timerText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resendLink: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    color: '#0066cc',
    fontSize: 14,
  },
});

export default OtpVerificationScreen;
