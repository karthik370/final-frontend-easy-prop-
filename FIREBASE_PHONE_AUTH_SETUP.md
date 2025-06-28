# Firebase Phone Authentication Setup Guide

## Prerequisites
Before you can use phone authentication in your app, you need to complete the following setup steps:

## 1. Firebase Console Configuration

### Enable Phone Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **olx-clone-73fb2**
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Phone** provider
5. Toggle the **Enable** switch
6. Click **Save**

### Add Test Phone Numbers (Optional but Recommended)
For testing without using real SMS:
1. In the Phone authentication settings
2. Click on **Phone numbers for testing (optional)**
3. Add test phone numbers and verification codes:
   - Example: +911234567890 → 123456
   - Example: +919876543210 → 654321

## 2. Firebase Project Settings

### Android Configuration
1. In Firebase Console, go to **Project Settings**
2. Under **Your apps**, select your Android app
3. Download the latest `google-services.json`
4. Place it in your Android app directory (if building locally)

### iOS Configuration
1. In Firebase Console, go to **Project Settings**
2. Under **Your apps**, select your iOS app
3. Download the latest `GoogleService-Info.plist`
4. Place it in your iOS app directory (if building locally)

## 3. Backend API Endpoint

Create a new endpoint in your backend to handle Firebase phone authentication:

```javascript
// POST /api/auth/firebase-phone
app.post('/api/auth/firebase-phone', async (req, res) => {
  const { uid, phoneNumber, idToken } = req.body;
  
  try {
    // Verify the Firebase ID token (optional but recommended)
    // const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Check if user exists
    let user = await User.findOne({ firebaseUID: uid });
    
    if (!user) {
      // Create new user
      user = new User({
        firebaseUID: uid,
        phone: phoneNumber,
        name: '', // Can be updated later
        email: '', // Can be updated later
        role: 'user',
        properties: [],
        favorites: []
      });
      await user.save();
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Firebase phone auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
});
```

## 4. Testing the Implementation

### Test Flow:
1. Open the app and navigate to Login screen
2. Click "Login with Phone Number"
3. Enter a phone number with country code (e.g., +911234567890)
4. Complete the reCAPTCHA verification
5. Click "Send Verification Code"
6. Enter the 6-digit OTP received via SMS
7. Click "Verify"
8. User should be logged in and redirected to Home screen

### Common Issues and Solutions:

**Issue: "auth/operation-not-allowed"**
- Solution: Enable Phone authentication in Firebase Console

**Issue: "auth/invalid-phone-number"**
- Solution: Ensure phone number includes country code (e.g., +91 for India)

**Issue: "auth/quota-exceeded"**
- Solution: Check Firebase SMS quota limits or use test phone numbers

**Issue: reCAPTCHA not working**
- Solution: Ensure Firebase configuration is correct in app.json

## 5. Production Considerations

1. **SMS Costs**: Firebase provides a free tier for SMS, but charges apply after limits
2. **Security**: Always verify Firebase ID tokens on your backend
3. **User Experience**: Consider implementing:
   - Auto-detect country code based on device locale
   - SMS auto-read functionality (Android)
   - Proper error messages for users

## 6. Next Steps

1. Test with real phone numbers
2. Monitor Firebase Authentication dashboard for usage
3. Set up Firebase Authentication triggers for user events
4. Consider adding additional authentication methods (Email, Google, etc.)
