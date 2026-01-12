# Firebase Authentication Setup

This mobile app uses Firebase for authentication. Follow these steps to complete the setup:

## Prerequisites

- Firebase project created (you already have google-services.json)
- Node.js and npm installed

## Installation

Dependencies have been installed:
- `firebase` - Firebase JavaScript SDK
- `@react-native-async-storage/async-storage` - For authentication persistence

## Firebase Configuration

### Step 1: Get Your Firebase Web Config

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on the gear icon (⚙️) next to "Project Overview"
4. Scroll down to "Your apps" section
5. If you haven't added a web app:
   - Click "Add app" and select Web (</>)
   - Register your app
6. Copy the Firebase configuration object

### Step 2: Update Firebase Config

Open `apps/mobile/config/firebase.ts` and replace the placeholder values with your actual Firebase configuration:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",              // Replace with your API key
  authDomain: "YOUR_AUTH_DOMAIN",      // Replace with your auth domain
  projectId: "YOUR_PROJECT_ID",        // Replace with your project ID
  storageBucket: "YOUR_STORAGE_BUCKET", // Replace with your storage bucket
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Replace with your messaging sender ID
  appId: "YOUR_APP_ID"                 // Replace with your app ID
};
```

### Step 3: Enable Email/Password Authentication

1. In Firebase Console, go to "Authentication" in the left sidebar
2. Click on the "Sign-in method" tab
3. Enable "Email/Password" provider
4. Click "Save"

## Features Implemented

### Login Screen (`/auth/login`)
- Email and password sign in
- Show/hide password toggle
- Forgot password functionality
- Input validation
- Error handling
- Navigation to signup

### Signup Screen (`/auth/signup`)
- Full name input
- Email and password registration
- User type selection (Buy Parts / Sell Parts)
- Show/hide password toggle
- Input validation
- Error handling
- Navigation to login

## Authentication Utilities

### Auth Helper Functions (`utils/auth.ts`)
- `signIn(email, password)` - Sign in user
- `signUp(email, password, displayName)` - Create new user
- `logout()` - Sign out user
- `resetPassword(email)` - Send password reset email
- `getCurrentUser()` - Get current user
- `updateUserProfile(displayName, photoURL)` - Update user profile

### Auth Context (`contexts/AuthContext.tsx`)
- Provides authentication state throughout the app
- `user` - Current user object
- `loading` - Loading state
- `isAuthenticated` - Boolean authentication status

## Usage Example

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, loading, isAuthenticated } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <LoginScreen />;
  }
  
  return <MainApp user={user} />;
}
```

## Navigation Flow

1. **Login Screen** → After successful login → Customer/Salesman Dashboard
2. **Signup Screen** → After successful signup → Customer/Salesman Dashboard (based on user type)
3. **Forgot Password** → Sends reset email → User clicks link in email → Resets password

## TODO: Backend Integration

Currently, the user type (buyer/seller) is stored locally. You should:

1. Create a backend endpoint to save user data:
   ```typescript
   POST /api/users
   {
     "firebaseUid": "user_firebase_uid",
     "email": "user@example.com",
     "name": "Full Name",
     "role": "CUSTOMER" | "SALESMAN"
   }
   ```

2. Update the signup screen to call this endpoint after Firebase registration

3. Fetch user role on login to determine navigation:
   ```typescript
   GET /api/users/:firebaseUid
   Response: { role: "CUSTOMER" | "SALESMAN", ... }
   ```

## Running the App

```bash
cd apps/mobile

# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Testing

Test accounts can be created through the signup screen or Firebase Console.

### Test Login Flow:
1. Open the app
2. Navigate to Login screen
3. Enter test credentials
4. Should navigate to appropriate dashboard

### Test Signup Flow:
1. Open the app
2. Navigate to Signup screen
3. Fill in all fields
4. Select user type (Buy/Sell Parts)
5. Create account
6. Should navigate to appropriate dashboard

## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
- Check that you've updated the Firebase config in `config/firebase.ts`

### "Firebase: Error (auth/operation-not-allowed)"
- Enable Email/Password authentication in Firebase Console

### App crashes on startup
- Make sure all dependencies are installed: `npm install`
- Clear cache: `npm start -- --clear`

## Security Notes

- Never commit your actual Firebase config to public repositories
- Consider using environment variables for production
- Implement proper backend validation
- Use Firebase Security Rules to protect data
