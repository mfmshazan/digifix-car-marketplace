# Delivery Partner Mobile Application

A production-ready mobile application for delivery partners in a spare-parts delivery platform, featuring real-time GPS tracking, secure authentication, offline resilience, and complete delivery workflow management.

## 🚀 Features

### For Delivery Partners
- **Secure Authentication**: JWT-based login with automatic token refresh
- **Job Management**: Browse and accept available delivery jobs
- **Real-time Tracking**: GPS location tracking during deliveries
- **Delivery Workflow**: Step-by-step guidance from pickup to dropoff
- **Proof of Delivery**: Photo capture and signature collection
- **Offline Support**: Queue actions when offline, sync when connected
- **Job History**: View past deliveries and earnings
- **Profile Management**: Update personal and vehicle information

### Technical Features
- **Auto-refreshing Tokens**: Seamless authentication without re-login
- **Secure Storage**: iOS Keychain and Android Keystore integration
- **Clean Architecture**: Separation of concerns with services layer
- **Responsive UI**: Works on both iOS and Android devices

## 📁 Project Structure

```
delivary partner app/
├── backend/                    # Node.js/Express API server
│   ├── config/                # Configuration files
│   │   ├── database.js        # PostgreSQL connection
│   │   └── auth.js            # JWT utilities
│   ├── middleware/            # Express middleware
│   │   ├── auth.js            # Authentication middleware
│   │   └── errorHandler.js   # Error handling
│   ├── routes/                # API routes
│   │   ├── auth.js            # Authentication endpoints
│   │   ├── partner.js         # Partner management
│   │   ├── jobs.js            # Job management
│   │   └── admin.js           # Admin endpoints (testing)
│   ├── database/              # Database files
│   │   ├── schema.sql         # Database schema
│   │   └── seed.sql           # Sample data
│   ├── scripts/               # Utility scripts
│   │   ├── initDatabase.js    # Initialize database
│   │   └── seedDatabase.js    # Seed sample data
│   ├── server.js              # Main server file
│   ├── package.json           # Dependencies
│   └── .env.example           # Environment variables template
│
├── mobile/                    # React Native (Expo) mobile app
│   ├── screens/               # App screens
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── HomeScreen.js
│   │   ├── AvailableJobsScreen.js
│   │   ├── ActiveDeliveryScreen.js
│   │   ├── ProofOfDeliveryScreen.js
│   │   ├── JobHistoryScreen.js
│   │   └── ProfileScreen.js
│   ├── services/              # Business logic services
│   │   ├── api.js             # API client with auto-refresh
│   │   ├── storage.js         # Secure storage
│   │   ├── location.js        # GPS tracking
│   │   └── offline.js         # Offline queue
│   ├── components/            # Reusable components
│   │   └── Common.js          # Button, Input components
│   ├── styles/                # Design system
│   │   └── theme.js           # Colors, typography, spacing
│   ├── App.js                 # Main app component
│   ├── config.js              # App configuration
│   ├── package.json           # Dependencies
│   └── app.json               # Expo configuration
│
└── docs/                      # Documentation
    ├── API_DOCUMENTATION.md   # API reference
    ├── TEST_PLAN.md           # Testing guide
    └── DEPLOYMENT_GUIDE.md    # Deployment instructions
```

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (access + refresh tokens)
- **Validation**: express-validator
- **Password Hashing**: bcrypt

### Mobile App
- **Framework**: React Native with Expo
- **Navigation**: React Navigation
- **Storage**: Expo SecureStore
- **Location**: Expo Location
- **Camera**: Expo Camera & Image Picker
- **Maps**: react-native-maps
- **HTTP Client**: Axios
- **Signatures**: react-native-signature-canvas

## 📋 Prerequisites

- **Node.js**: v16 or higher
- **PostgreSQL**: v12 or higher
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **iOS Simulator** (Mac only) or **Android Emulator**

## 🚀 Getting Started

### 1. Database Setup

```bash
# Install PostgreSQL (if not already installed)
# Windows: Download from https://www.postgresql.org/download/windows/
# Mac: brew install postgresql

# Create database
createdb delivery_partner_db

# Or using psql
psql -U postgres
CREATE DATABASE delivery_partner_db;
\q
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file from example
copy .env.example .env

# Edit .env file with your database credentials
# Update DB_PASSWORD and JWT secrets

# Initialize database schema
node scripts/initDatabase.js

# Seed sample data (optional)
node scripts/seedDatabase.js

# Start the server
npm start

# Server will run on http://localhost:3000
```

### 3. Mobile App Setup

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Update config.js with your backend URL
# For physical device testing, use your computer's IP address

# Start Expo
npx expo start

# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Or scan QR code with Expo Go app on your phone
```

## 🔑 Default Test Accounts

After running the seed script, you can use these accounts:

- **Email**: john.doe@example.com | **Password**: password123
- **Email**: jane.smith@example.com | **Password**: password123
- **Email**: mike.wilson@example.com | **Password**: password123

## 🧪 Testing the Application

### Create a Test Job (Using Admin Endpoint)

```bash
curl -X POST http://localhost:3000/api/admin/jobs \
  -H "Content-Type: application/json" \
  -H "x-api-key: test_admin_key_change_in_production" \
  -d '{
    "orderNumber": "ORD-TEST-001",
    "customerName": "Test Customer",
    "customerPhone": "+1234567890",
    "pickupAddress": "123 Test St",
    "pickupLatitude": 40.7128,
    "pickupLongitude": -74.0060,
    "dropoffAddress": "456 Demo Ave",
    "dropoffLatitude": 40.7589,
    "dropoffLongitude": -73.9851,
    "paymentAmount": 25.00,
    "itemsDescription": "Test parts"
  }'
```

### Complete Delivery Flow

1. **Login**: Use test account credentials
2. **Go Online**: Toggle status to "Online" on home screen
3. **Browse Jobs**: Navigate to "Available Jobs"
4. **Accept Job**: Tap "Accept Job" on any available delivery
5. **Pickup**: Tap "Arrived at Pickup" when at location
6. **In Transit**: Tap "Start Delivery" after pickup
7. **Deliver**: Tap "Mark as Delivered" at dropoff
8. **Proof**: Capture photo and signature, submit

## 📱 Mobile App Screens

1. **Login/Register**: Secure authentication
2. **Home Dashboard**: Status toggle, active job, stats
3. **Available Jobs**: Browse and accept deliveries
4. **Active Delivery**: Map view, job details, status updates
5. **Proof of Delivery**: Photo, signature, notes
6. **Job History**: Past deliveries
7. **Profile**: Edit info, view stats, logout

## 🔒 Security Features

- JWT access tokens (15-minute expiry)
- JWT refresh tokens (7-day expiry)
- Secure token storage (Keychain/Keystore)
- Automatic token refresh on expiry
- Password hashing with bcrypt
- API request validation
- SQL injection protection

## 📡 API Endpoints

See [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) for complete API reference.

## 🐛 Troubleshooting

### Backend Issues

**Database connection failed**
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env` file
- Ensure database exists: `psql -l`

**Port already in use**
- Change PORT in `.env` file
- Or kill process: `npx kill-port 3000`

### Mobile App Issues

**Cannot connect to backend**
- Update `API_BASE_URL` in `config.js`
- For physical device, use computer's IP address
- Ensure backend server is running

**Location permissions denied**
- Go to device Settings > App Permissions
- Enable Location for Expo Go

**Camera not working**
- Enable Camera permission in device settings
- Restart Expo app

## 📚 Additional Documentation

- [API Documentation](docs/API_DOCUMENTATION.md) - Complete API reference
- [Test Plan](docs/TEST_PLAN.md) - Testing scenarios and checklist
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Production deployment steps

## 🤝 Support

For issues or questions, please refer to the documentation or create an issue in the repository.

## 📄 License

MIT License - feel free to use this project for your own purposes.
