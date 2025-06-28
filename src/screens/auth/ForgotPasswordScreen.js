import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import { SERVER_URL } from '../../config/environment';
import { AuthContext } from '../../context/AuthContext';

const ForgotPasswordScreen = ({ navigation }) => {
  const { resetPassword } = useContext(AuthContext);
  
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: Verification Code, 3: New Password
  const [previewUrl, setPreviewUrl] = useState('');

  // Step 1: Send verification code
  const handleSendVerificationCode = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      console.log('Sending verification code to:', email);
      
      // Send request to backend to generate and send verification code
      const response = await axios.post(`${SERVER_URL}/api/auth/send-verification-code`, {
        email
      });
      
      console.log('Verification code sent response:', response.data);
      
      if (response.data.success) {
        // If there's a preview URL for testing, store it
        if (response.data.previewUrl) {
          setPreviewUrl(response.data.previewUrl);
          Alert.alert(
            'Verification Code Sent',
            'A verification code has been sent to your email. For testing, you can view the email at the preview URL or use the code shown in the console.',
            [
              { 
                text: 'View Email', 
                onPress: () => {
                  // In a real app, you could open this URL in a WebView or external browser
                  console.log('Preview URL:', response.data.previewUrl);
                  Alert.alert('Preview URL', response.data.previewUrl);
                } 
              },
              { 
                text: 'Continue', 
                onPress: () => {
                  // For testing, if code is returned, auto-fill it
                  if (response.data.code) {
                    setVerificationCode(response.data.code);
                  }
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'Verification Code Sent',
            'A verification code has been sent to your email address. Please check your inbox and enter the code.',
            [{ text: 'OK' }]
          );
        }
        setStep(2);
      } else {
        setError(response.data.message || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      
      let errorMessage = 'Failed to send verification code. Please try again.';
      
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = 'No account found with this email address.';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify the code
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code from your email');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      // Verify the code with backend
      const response = await axios.post(`${SERVER_URL}/api/auth/verify-code`, {
        email,
        verificationCode
      });
      
      if (response.data.success) {
        setStep(3);
      } else {
        setError(response.data.message || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      
      let errorMessage = 'Failed to verify code. Please try again.';
      
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async () => {
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      // Use the resetPassword function from AuthContext
      const result = await resetPassword(email, newPassword, verificationCode);
      
      if (result.success) {
        if (result.autoLogin) {
          // User was automatically logged in
          Alert.alert(
            'Password Reset Successful',
            'Your password has been reset successfully. You will now be redirected to the home screen.',
            [{ 
              text: 'OK',
              onPress: () => navigation.reset({
                index: 0,
                routes: [{ name: 'MainNavigator' }],
              })
            }]
          );
        } else {
          // User needs to log in manually
          Alert.alert(
            'Password Reset Successful',
            'Your password has been reset successfully. Please log in with your new password.',
            [{ 
              text: 'Login Now',
              onPress: () => navigation.navigate('LoginScreen')
            }]
          );
        }
      } else {
        setError(result.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>Reset Your Password</Text>
            <Text style={styles.stepDescription}>
              Enter your email address and we'll send you a verification code to reset your password.
            </Text>
            
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={24} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSendVerificationCode}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Verification Code</Text>
              )}
            </TouchableOpacity>
          </>
        );
        
      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>Enter Verification Code</Text>
            <Text style={styles.stepDescription}>
              Please enter the verification code we sent to your email address.
            </Text>
            
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={24} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Verification Code"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="default"
                autoCapitalize="none"
              />
            </View>
            
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify Code</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleSendVerificationCode}
              disabled={isLoading}
            >
              <Text style={styles.resendButtonText}>Resend Code</Text>
            </TouchableOpacity>
          </>
        );
        
      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>Create New Password</Text>
            <Text style={styles.stepDescription}>
              Please enter your new password.
            </Text>
            
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={24} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#666"
                  style={styles.inputIcon}
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={24} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>
            
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (step > 1) {
                setStep(step - 1);
              } else {
                navigation.navigate('LoginScreen');
              }
            }}
          >
            <Ionicons name="arrow-back-outline" size={24} color="#0066cc" />
            <Text style={styles.backButtonText}>
              {step > 1 ? 'Back' : 'Back to Login'}
            </Text>
          </TouchableOpacity>
          
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          {renderStep()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    color: '#0066cc',
    fontSize: 16,
    marginLeft: 5,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
  },
  inputIcon: {
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  resendButtonText: {
    color: '#0066cc',
    fontSize: 16,
  },
});

export default ForgotPasswordScreen; 