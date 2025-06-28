# Firebase Phone Authentication Setup - Complete Guide

## Step 1: Create a New Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** or **"Add project"**
3. Enter your project name (e.g., "olx-clone-production")
4. Click **Continue**
5. Enable/Disable Google Analytics (your choice)
6. Click **Create Project**

## Step 2: Add Your App to Firebase

### For Web/Expo App:
1. In Firebase Console, click the **Web** icon (</>) 
2. Register your app with a nickname (e.g., "OLX Clone App")
3. Check **"Also set up Firebase Hosting"** if you plan to host
4. Click **Register app**
5. You'll see your Firebase configuration - **SAVE THIS!**

Your config will look like:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID", 
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 3: Enable Phone Authentication

1. In Firebase Console, go to **Authentication** (left sidebar)
2. Click **"Get started"** if first time
3. Click **"Sign-in method"** tab
4. Find **Phone** in the providers list
5. Click on it and toggle **Enable**
6. Click **Save**

## Step 4: Configure Test Phone Numbers (Optional)

1. In Phone authentication settings
2. Expand **"Phone numbers for testing (optional)"**
3. Add test numbers like:
   - Phone: +911234567890 → Code: 123456
   - Phone: +919876543210 → Code: 654321
4. Click **Save**

## Step 5: Update Your App Configuration

### IMPORTANT: Replace the Firebase config in these files:

1. **app.json** - Update the firebase section:
```json
{
  "expo": {
    "extra": {
      "firebase": {
        "apiKey": "YOUR_NEW_API_KEY",
        "authDomain": "YOUR_NEW_AUTH_DOMAIN",
        "projectId": "YOUR_NEW_PROJECT_ID",
        "storageBucket": "YOUR_NEW_STORAGE_BUCKET",
        "messagingSenderId": "YOUR_NEW_MESSAGING_SENDER_ID",
        "appId": "YOUR_NEW_APP_ID"
      }
    }
  }
}
```

2. **src/config/firebase.js** - Update the fallback config:
```javascript
const firebaseConfig = Constants.expoConfig?.extra?.firebase || {
  apiKey: "YOUR_NEW_API_KEY",
  authDomain: "YOUR_NEW_AUTH_DOMAIN",
  projectId: "YOUR_NEW_PROJECT_ID",
  storageBucket: "YOUR_NEW_STORAGE_BUCKET",
  messagingSenderId: "YOUR_NEW_MESSAGING_SENDER_ID",
  appId: "YOUR_NEW_APP_ID"
};
```

## Step 6: Set Up Authentication Settings

### Configure Authorized Domains:
1. In Firebase Console → Authentication → Settings
2. Under **Authorized domains**, add:
   - localhost (for testing)
   - Your production domain (if you have one)
   - expo.dev (for Expo Go testing)

### Configure SHA Certificates (For Android):
1. Generate SHA-1 fingerprint:
   ```bash
   npx eas credentials
   ```
2. Select Android → Production → Keystore
3. Copy the SHA-1 fingerprint
4. In Firebase Console → Project Settings → Your Android app
5. Add the SHA-1 fingerprint
6. Download `google-services.json`

## Step 7: Platform-Specific Setup

### Android Setup:
1. Download `google-services.json` from Firebase Console
2. Place it in `android/app/` directory (if ejected)
3. For EAS builds, add to `app.json`:
```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

### iOS Setup:
1. Download `GoogleService-Info.plist` from Firebase Console
2. Place it in `ios/` directory (if ejected)
3. For EAS builds, add to `app.json`:
```json
{
  "expo": {
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

## Step 8: Security Rules (Important!)

1. Go to Firebase Console → Authentication → Settings → User actions
2. Configure:
   - Enable account deletion
   - Set rate limits for SMS
   - Configure reCAPTCHA settings

## Step 9: Monitor Usage

1. Firebase provides free tier:
   - 10K SMS verifications/month
   - Check current usage in Firebase Console → Usage tab

## Ready to Proceed?

Once you've completed these steps, provide me with:
1. Your new Firebase configuration object
2. Confirm phone authentication is enabled
3. Any test phone numbers you've added

Then I'll update all your code files with the new configuration!
