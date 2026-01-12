# Authentication Quick Start Guide

## ✅ What's Been Created

Your login and registration screens have been successfully built! Here's what's ready:

### 📱 Screens Created
1. **Login Screen** ([app/auth/login.tsx](app/auth/login.tsx))
   - Email & Password login
   - Show/Hide password toggle
   - Forgot Password functionality
   - Link to Sign Up

2. **Sign Up Screen** ([app/auth/signup.tsx](app/auth/signup.tsx))
   - Full Name input
   - Email & Password registration
   - User Type selection (Buy Parts / Sell Parts)
   - Show/Hide password toggle
   - Link to Sign In

### 🔧 Files Created/Modified

```
apps/mobile/
├── app/
│   ├── _layout.tsx                 # ✅ Updated with AuthProvider
│   └── auth/
│       ├── login.tsx               # ✅ New login screen
│       └── signup.tsx              # ✅ New signup screen
├── config/
│   └── firebase.ts                 # ✅ Firebase configuration
├── contexts/
│   └── AuthContext.tsx             # ✅ Auth state management
├── services/
│   └── api.ts                      # ✅ Backend API integration
├── utils/
│   └── auth.ts                     # ✅ Auth helper functions
└── FIREBASE_SETUP.md              # ✅ Detailed setup guide
```

## 🚀 Next Steps to Get It Working

### Step 1: Configure Firebase (REQUIRED)

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (⚙️ icon)
4. Scroll to "Your apps" → Select Web app or create one
5. Copy your config values

6. **Update** [apps/mobile/config/firebase.ts](apps/mobile/config/firebase.ts):
   ```typescript
   const firebaseConfig = {
     apiKey: "AIza...",              // Your API key
     authDomain: "your-app.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-app.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```

### Step 2: Enable Email Authentication in Firebase

1. In Firebase Console → Authentication
2. Click "Sign-in method" tab
3. Enable "Email/Password"
4. Click "Save"

### Step 3: Run the App

```bash
cd apps/mobile
npm start
```

Then press:
- `a` for Android
- `i` for iOS
- Scan QR code with Expo Go app

## 🎨 Design Features

Matches your uploaded designs:
- ✅ Clean, modern UI
- ✅ Email/Password inputs with icons
- ✅ Blue primary color (#4285F4)
- ✅ User type selection toggles
- ✅ Proper validation & error handling
- ✅ Loading states

## 📝 How to Use

### Testing Login
1. First create an account using the Sign Up screen
2. Use those credentials to log in

### Testing Sign Up
1. Navigate to Sign Up screen
2. Enter Full Name, Email, Password
3. Choose "Buy Parts" or "Sell Parts"
4. Tap "Create Account"
5. You'll be navigated to the appropriate dashboard

## 🔌 Backend Integration

The screens are already integrated with your backend API:

- **On Sign Up**: Saves user data to your backend at `POST /api/users`
- **On Login**: Fetches user role from `GET /api/users/:firebaseUid`

Update the backend URL in [apps/mobile/services/api.ts](apps/mobile/services/api.ts):
```typescript
const API_BASE_URL = 'http://localhost:3000'; // Change to your backend URL
```

## 🆘 Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
→ You haven't updated the Firebase config yet. See Step 1 above.

### "Firebase: Error (auth/operation-not-allowed)"
→ Enable Email/Password authentication in Firebase Console. See Step 2 above.

### Backend not saving users
→ Make sure your backend server is running and the API_BASE_URL is correct.

## 📚 Full Documentation

For detailed documentation, see [FIREBASE_SETUP.md](FIREBASE_SETUP.md)

## ✨ Features Included

- ✅ Firebase Authentication
- ✅ Email/Password login & registration
- ✅ Password reset functionality
- ✅ User role management (Customer/Salesman)
- ✅ Backend API integration
- ✅ Auth state management with Context
- ✅ Input validation
- ✅ Error handling
- ✅ Loading states
- ✅ Responsive design

---

**Need help?** Check [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for more details!
