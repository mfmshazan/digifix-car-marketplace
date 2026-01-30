# 🚀 Quick Start Guide for Team Members

This guide helps you get the DigiFix Car Marketplace running on your machine using Docker.

## 📋 Prerequisites

### 1. Install Required Software

| Software | Download Link | Purpose |
|----------|--------------|---------|
| **Git** | [git-scm.com](https://git-scm.com/downloads) | Clone the repository |
| **Docker Desktop** | [docker.com](https://www.docker.com/products/docker-desktop/) | Run the backend & database |
| **Node.js 20+** | [nodejs.org](https://nodejs.org/) | Run the mobile app |
| **Expo Go App** | [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) / [App Store](https://apps.apple.com/app/expo-go/id982107779) | Test on your phone |

### 2. Verify Installation

Open PowerShell/Terminal and run:

```powershell
git --version
docker --version
node --version
npm --version
```

---

## 🔧 Setup Steps

### Step 1: Clone the Repository

```powershell
# Clone the repo
git clone https://github.com/mfmshazan/digifix-car-marketplace.git

# Navigate to project folder
cd digifix-car-marketplace

# Switch to dev branch
git checkout dev
```

### Step 2: Create Environment File

```powershell
# Copy the example environment file
Copy-Item .env.docker.example .env
```

Or manually create a `.env` file in the project root with:

```env
# PostgreSQL Configuration
POSTGRES_USER=digifix
POSTGRES_PASSWORD=digifix123
POSTGRES_DB=digifix_db
POSTGRES_PORT=5432

# Backend Configuration
NODE_ENV=development
BACKEND_PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
FRONTEND_URL=*
```

### Step 3: Start Docker Containers

```powershell
# Make sure Docker Desktop is running!

# Build and start all services
docker-compose up -d --build
```

Wait for the build to complete (first time takes ~2-5 minutes).

### Step 4: Verify Backend is Running

```powershell
# Check container status
docker-compose ps

# Test the API
Invoke-RestMethod -Uri "http://localhost:3000/health"
```

You should see:
```
status    timestamp
------    ---------
ok        2026-01-30T...
```

### Step 5: Setup Mobile App

```powershell
# Navigate to mobile app folder
cd apps/mobile

# Install dependencies
npm install

# Find your computer's IP address
ipconfig
# Look for "IPv4 Address" (e.g., 192.168.1.105)
```

### Step 6: Update API Configuration

Edit `apps/mobile/src/config/api.config.ts`:

```typescript
// Change this line to YOUR IP address
const LOCAL_IP = 'YOUR_IP_ADDRESS_HERE';  // e.g., '192.168.1.105'
```

### Step 7: Start Mobile App

```powershell
# In apps/mobile folder
npm start
```

### Step 8: Run on Your Phone

1. Make sure your phone and computer are on the **same WiFi network**
2. Open **Expo Go** app on your phone
3. Scan the QR code shown in the terminal
4. The app should load and connect to your local backend!

---

## 📱 Running Options

### Option A: Physical Device (Recommended)
- Install Expo Go on your phone
- Scan QR code from terminal
- Must be on same WiFi as your computer

### Option B: Android Emulator
- Install Android Studio
- Create a virtual device
- Press `a` in Expo terminal

### Option C: Web Browser
- Press `w` in Expo terminal
- Opens at http://localhost:8081

---

## 🛠️ Common Commands

### Docker Commands

```powershell
# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# Restart containers
docker-compose restart

# Rebuild after code changes
docker-compose up -d --build

# Full reset (⚠️ deletes database)
docker-compose down -v
docker-compose up -d --build
```

### Mobile App Commands

```powershell
# Start development server
npm start

# Clear cache and start
npx expo start -c

# Run on Android emulator
npm run android

# Run on web
npm run web
```

---

## 🔍 Troubleshooting

### Issue: "Docker Desktop is not running"
**Solution:** Start Docker Desktop application and wait for it to fully load.

### Issue: "Port 3000 already in use"
**Solution:** Change the port in `.env`:
```env
BACKEND_PORT=3001
```
Then update `api.config.ts` to use port 3001.

### Issue: "Cannot connect to API from phone"
**Solutions:**
1. Verify phone and computer are on the same WiFi
2. Check your IP address is correct in `api.config.ts`
3. Try disabling Windows Firewall temporarily
4. Make sure Docker containers are running: `docker-compose ps`

### Issue: "Database connection failed"
**Solution:**
```powershell
# Check if PostgreSQL is running
docker-compose ps

# Restart the containers
docker-compose restart
```

### Issue: "Expo app shows error"
**Solution:**
```powershell
# Clear Expo cache
npx expo start -c
```

### Issue: "npm install fails"
**Solution:**
```powershell
# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

---

## 📊 Project Structure

```
digifix-car-marketplace/
├── .env                    # Your environment variables (create this!)
├── docker-compose.yml      # Docker orchestration
├── backend/
│   ├── Dockerfile          # Backend container config
│   ├── src/                # Backend source code
│   └── prisma/             # Database schema
└── apps/
    └── mobile/
        ├── app/            # Expo Router pages
        └── src/
            ├── api/        # API functions
            └── config/     # API configuration
```

---

## 🔐 API Endpoints

Base URL: `http://YOUR_IP:3000/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/products` | Get all products |
| GET | `/api/categories` | Get all categories |

---

## 👥 Team Workflow

### Pulling Latest Changes

```powershell
# Get latest code
git pull origin dev

# Rebuild containers if backend changed
docker-compose up -d --build

# Reinstall mobile dependencies if package.json changed
cd apps/mobile
npm install
```

### After Database Schema Changes

If someone updates `prisma/schema.prisma`:

```powershell
# Rebuild backend to apply new schema
docker-compose up -d --build
```

---

## 📞 Need Help?

1. Check the logs: `docker-compose logs -f`
2. Verify containers are running: `docker-compose ps`
3. Make sure Docker Desktop is running
4. Ensure you're on the same WiFi as your phone
5. Ask in the team group chat!

---

**Happy coding! 🎉**
