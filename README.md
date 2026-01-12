# AutoParts Marketplace

A full-stack auto parts marketplace application built with React Native (Expo), TypeScript, and Firebase.

## 🚀 Features

### Customer Features
- **Authentication**: Email/password login and registration with Firebase
- **Product Browsing**: Browse parts by category with search and filtering
- **Shopping Cart**: Add/remove items, adjust quantities, real-time totals
- **Orders**: View order history with status tracking
- **Profile Management**:
  - Edit profile information
  - Manage multiple delivery addresses
  - Save payment methods securely
  - Customize notification preferences
  - Access help & support resources

### Salesman Features
- Product management
- Order processing
- Inventory tracking

### Technical Features
- **State Management**: Zustand for global state
- **Data Persistence**: AsyncStorage for local data
- **Error Handling**: Error boundaries and comprehensive validation
- **Form Validation**: Real-time validation for all inputs
- **Responsive Design**: Works on web, iOS, and Android
- **TypeScript**: Full type safety throughout

## 📦 Tech Stack

### Frontend
- **React Native** with Expo (~54.0.30)
- **Expo Router** (~6.0.21) for file-based navigation
- **TypeScript** for type safety
- **Zustand** for state management
- **Firebase** for authentication
- **AsyncStorage** for local persistence

### Backend
- **Node.js** with Express
- **PostgreSQL** database
- **Prisma** ORM
- **TypeScript**

## 🛠️ Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd digifix-car-marketplace-main
```

2. **Install dependencies**
```bash
npm run install:all
```

This will install dependencies for:
- Root project (concurrently)
- Backend server
- Mobile app

3. **Configure Firebase**
- Create a Firebase project at https://console.firebase.google.com
- Enable Email/Password authentication
- Download `google-services.json` and place it in `apps/mobile/app/`
- Update Firebase config in `apps/mobile/config/firebase.ts`

4. **Configure Database**
- Create a PostgreSQL database
- Update `.env` file in `backend/` with your database URL:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/dbname"
```

5. **Run database migrations**
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

## 🚀 Running the Application

### Run Both Frontend and Backend
```bash
npm run dev
```

This starts:
- Backend API on `http://localhost:3000`
- Frontend on `http://localhost:8081`

### Run Individually

**Backend only:**
```bash
npm run dev:backend
```

**Frontend only:**
```bash
npm run dev:mobile
```

## 📱 Project Structure

```
digifix-car-marketplace-main/
├── apps/
│   └── mobile/                 # React Native app
│       ├── app/                # Expo Router pages
│       │   ├── (customer)/     # Customer screens
│       │   ├── (salesman)/     # Salesman screens
│       │   ├── auth/           # Authentication screens
│       │   └── profile/        # Profile management screens
│       ├── components/         # Reusable components
│       │   ├── common/         # Common components (ErrorBoundary, Loading)
│       │   └── icons/          # Icon components
│       ├── config/             # Configuration files
│       ├── services/           # API services
│       ├── store/              # Zustand stores
│       └── utils/              # Utility functions
├── backend/                    # Express API server
│   ├── prisma/                 # Database schema
│   └── src/                    # Source code
│       ├── controllers/        # Route controllers
│       ├── middleware/         # Express middleware
│       └── routes/             # API routes
└── package.json                # Root package.json
```

## 🔐 Authentication Flow

1. User registers with email/password
2. Firebase creates authentication account
3. User data saved to PostgreSQL via backend
4. Role-based navigation (Customer vs Salesman)
5. Session managed by Firebase Auth

## 💾 Data Persistence

- **Firebase Auth**: User authentication state
- **AsyncStorage**: 
  - User profile data
  - Addresses
  - Payment methods
  - Notification preferences
- **PostgreSQL**: 
  - User accounts
  - Products
  - Orders
  - Inventory

## 🛡️ Error Handling

- Error boundaries catch React component errors
- Form validation with real-time feedback
- Network error handling with user-friendly messages
- Firebase auth errors with specific messages
- Backend API error responses

## 📝 Available Scripts

```bash
# Install all dependencies
npm run install:all

# Run both frontend and backend
npm run dev

# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:mobile

# Backend specific
cd backend
npm run dev          # Development mode with nodemon
npm run build        # Build TypeScript
npm run start        # Production mode
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio

# Frontend specific
cd apps/mobile
npm start            # Start Expo
npm run web          # Start web version
npm run android      # Start Android
npm run ios          # Start iOS
```

## 🎨 Design System

### Colors
- **Primary**: #4285F4 (Google Blue)
- **Success**: #4CAF50 (Green)
- **Warning**: #FFA000 (Orange)
- **Error**: #F44336 (Red)
- **Text Primary**: #000
- **Text Secondary**: #666
- **Border**: #E0E0E0
- **Background**: #F5F5F5

### Typography
- **Header**: 18-20px, bold
- **Title**: 15-16px, semibold
- **Body**: 14-15px, regular
- **Caption**: 12-13px, regular

## 🔧 Configuration

### Firebase Config
Located in `apps/mobile/config/firebase.ts`:
```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  // ... other config
};
```

### Backend Config
Located in `backend/.env`:
```env
DATABASE_URL="postgresql://..."
PORT=3000
JWT_SECRET="your-secret"
```

## 🚧 Production Considerations

### Before Deployment
- [ ] Update Firebase config with production credentials
- [ ] Set up production database
- [ ] Configure environment variables
- [ ] Enable Firebase security rules
- [ ] Set up proper CORS policies
- [ ] Add rate limiting to API
- [ ] Enable HTTPS
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies

### Security
- Passwords hashed with bcrypt
- JWT tokens for API authentication
- Firebase Auth for user management
- Environment variables for secrets
- Input validation on all forms
- XSS protection
- CSRF protection

## 📄 License

Proprietary - All rights reserved

## 👥 Support

For support, email support@autoparts.com or use the in-app Help & Support feature.

## 🎯 Roadmap

- [ ] Real-time order tracking
- [ ] Push notifications
- [ ] Product reviews and ratings
- [ ] Wishlist functionality
- [ ] Advanced search filters
- [ ] Multiple payment gateways
- [ ] Mobile app deployment (iOS/Android)
- [ ] Admin dashboard
- [ ] Analytics and reporting
- [ ] Email notifications
- [ ] SMS alerts
