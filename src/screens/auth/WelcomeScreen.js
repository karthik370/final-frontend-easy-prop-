import React, { useContext } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '../../context/AuthContext';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const WelcomeScreen = ({ navigation }) => {
  const authCtx = useContext(AuthContext);
  if (!authCtx) {
    console.error('AuthContext is not available in WelcomeScreen!');
    return null;
  }
  const { guestLogin, isLoading } = authCtx;

  const handleGuestLogin = async () => {
    try {
      const success = await guestLogin();
      console.log('Guest login completed:', success);
    } catch (error) {
      console.error('Guest login error:', error);
    }
  };

  return (
    <LinearGradient
      colors={['#0066cc', '#4da6ff', '#0066cc']}
      style={styles.background}
    >
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>Home Zest</Text>
          <Text style={styles.tagline}>Find your dream property</Text>
        </View>

        <BannerAd
          size={BannerAdSize.MEDIUM_RECTANGLE}
          unitId={TestIds.BANNER} // This is Google's test ad unit ID
          requestOptions={{
            requestNonPersonalizedAdsOnly: false
          }}
          onAdLoaded={() => console.log('Ad loaded successfully')}
          onAdFailedToLoad={(error) => console.log('AdMob error:', error)}
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.loginButton]}
            onPress={() => navigation.navigate('LoginScreen')}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.registerButton]}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.buttonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.guestButton]}
            onPress={handleGuestLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0066cc" size="small" />
            ) : (
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    color: '#fff',
    marginTop: 10,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 40,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  loginButton: {
    backgroundColor: '#0066cc',
  },
  registerButton: {
    backgroundColor: '#25d366',
  },
  guestButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guestButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default WelcomeScreen;