# Mobile App - Backend Connection Guide

## ✅ What's Already Done:

### Backend is Ready:
1. ✅ Login checks database before allowing sign-in
2. ✅ Returns error if user hasn't signed up
3. ✅ JWT authentication working
4. ✅ Server running on port 3000

### Mobile App Files Created:
1. ✅ `src/api/auth.ts` - API functions for login/register
2. ✅ `src/api/storage.ts` - Token and user data storage
3. ✅ `app/auth/login.tsx` - Updated to use real API
4. ✅ `app/auth/register.tsx` - Updated to use real API

## 🔧 Setup Steps:

### Step 1: Install Required Package

Open terminal in mobile folder and run:

```bash
cd E:\Mobile-apps\digifix-car-marketplace\apps\mobile
npm install @react-native-async-storage/async-storage
```

### Step 2: Setup Database (One-time)

In backend folder, run:

```bash
cd E:\Mobile-apps\digifix-car-marketplace\backend
npx prisma db push
```

This creates all tables in your Supabase database.

### Step 3: Start Backend Server

```bash
cd E:\Mobile-apps\digifix-car-marketplace\backend
npm run dev
```

Server will run on: `http://localhost:3000`

### Step 4: API URL (Now Automatic! 🚀)

The app is now configured to **automatically detect** the correct backend URL:

- **Web (Chrome):** Automatically uses `localhost:3000`
- **Expo Go (Physical Device):** Automatically detects your computer's IP address using `hostUri`. 
- **Android Emulator:** Automatically uses `10.0.2.2:3000`
- **iOS Simulator:** Automatically uses `localhost:3000`

> [!TIP]
> You no longer need to manually edit `api.config.ts` every time your IP changes! 
> Just ensure your phone and computer are on the **same Wi-Fi network**.

### Step 5: Start Mobile App

```bash
cd E:\Mobile-apps\digifix-car-marketplace\apps\mobile
npx expo start
```

## 🔄 How It Works:

### Registration Flow:
1. User fills registration form
2. App calls `POST http://localhost:3000/api/auth/register`
3. Backend:
   - ✅ Checks if email already exists
   - ✅ Hashes password with bcrypt
   - ✅ Saves user to database
   - ✅ Generates JWT token
   - ✅ Returns user data + token
4. App saves token & user data to AsyncStorage
5. Redirects to customer/salesman view based on role

### Login Flow:
1. User enters email & password
2. App calls `POST http://localhost:3000/api/auth/login`
3. Backend:
   - ✅ **Checks if user exists in database**
   - ✅ Returns error if user not found: "Invalid email or password"
   - ✅ Verifies password hash
   - ✅ Returns error if password wrong
   - ✅ Generates JWT token if valid
4. App saves token & user data to AsyncStorage
5. Redirects to customer/salesman view based on role

### Error Messages:
- **User not signed up:** "Invalid email or password. Please check your credentials or sign up first."
- **Wrong password:** "Invalid email or password"
- **Missing fields:** "Please fill in all fields"
- **Network error:** "Failed to connect to server"

## 🧪 Testing:

### Test Registration:
1. Open mobile app
2. Go to Register screen
3. Enter details:
   - Name: Test User
   - Email: test@example.com
   - Password: Test1234
   - Confirm: Test1234
4. Click Register
5. ✅ User saved to database
6. ✅ JWT token generated
7. ✅ Redirected to home screen

### Test Login (User Exists):
1. Go to Login screen
2. Enter:
   - Email: test@example.com
   - Password: Test1234
3. Click Login
4. ✅ Backend checks database
5. ✅ User found, password verified
6. ✅ JWT token generated
7. ✅ Redirected to home screen

### Test Login (User Doesn't Exist):
1. Go to Login screen
2. Enter:
   - Email: nonexistent@example.com
   - Password: anything
3. Click Login
4. ❌ Backend checks database
5. ❌ User not found
6. ❌ Error: "Invalid email or password"
7. ❌ Login blocked

## 📱 Mobile App Features:

### What's Implemented:
- ✅ Real API calls to backend
- ✅ Token storage in AsyncStorage
- ✅ User data persistence
- ✅ Error handling
- ✅ Loading states
- ✅ Role-based routing (Customer/Salesman)
- ✅ Password validation
- ✅ Email validation

### API Functions Available:
```typescript
// From src/api/auth.ts
import { registerUser, loginUser, getUserProfile } from '../../src/api/auth';

// From src/api/storage.ts
import { saveToken, getToken, saveUser, getUser, clearAuthData } from '../../src/api/storage';
```

## 🔐 Security Features:

1. **Password Hashing:** bcrypt with 12 salt rounds
2. **JWT Tokens:** Signed with secret key, 7-day expiration
3. **Database Validation:** User must exist in database to login
4. **Protected Routes:** Token required for profile/protected endpoints
5. **Secure Storage:** Tokens stored in AsyncStorage

## 🐛 Troubleshooting:

### "Network request failed"
- Check backend server is running
- Verify API_URL matches your setup
- For physical device, use computer's IP address
- Ensure both devices on same WiFi network

### "Failed to register user"
- Check database connection in backend
- Run `npx prisma db push` to create tables
- Check backend console for error details

### "Invalid email or password"
- User hasn't registered yet (sign up first!)
- Wrong password entered
- Check email spelling

## 📝 Next Steps:

1. Install AsyncStorage package (see Step 1)
2. Update API_URL for your setup (see Step 4)
3. Start backend server
4. Test registration
5. Test login with registered user
6. Test login with non-existent user (should fail!)

---

**Summary:** Your backend ALREADY prevents login if user hasn't signed up! The mobile app is now connected to check the database before allowing sign-in. Just follow the setup steps above to get it running.
