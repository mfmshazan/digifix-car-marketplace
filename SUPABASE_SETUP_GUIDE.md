# 🗄️ Supabase Database Setup Guide

## 📊 **Current Situation Explained**

### **Two Databases Problem:**
You currently have **TWO separate databases**:

1. **Local Docker PostgreSQL** (was being used)
   - Location: Docker container `digifix-postgres`
   - Contains: The 4-5 users you registered through the app
   - Status: Now disabled

2. **Supabase PostgreSQL** (cloud database)
   - Location: Supabase cloud
   - Contains: Only 1 user (`test@gmail.com`)
   - Status: Trying to connect now

### **Why you only see 1 user in Supabase:**
- The other users were saved in the **local Docker database**, not Supabase
- When you were using Docker, it was using its own PostgreSQL database
- Now we're switching to use Supabase for all data

---

## ✅ **Steps to Connect Docker Backend to Supabase**

### **Step 1: Get Fresh Supabase Connection Strings**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click on **"Project Settings"** (gear icon on left sidebar)
4. Click on **"Database"** tab
5. Scroll down to **"Connection string"** section

#### **Get Connection Pooling URL (for DATABASE_URL):**
- Click on **"Connection pooling"** mode
- You'll see something like:
  ```
  postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres
  ```
- **IMPORTANT:** Replace `[YOUR-PASSWORD]` with your actual database password
- URL-encode special characters:
  - `$` → `%24`
  - `!` → `%21`
  - `&` → `%26`
  - `@` → `%40`
  - `#` → `%23`

#### **Get Direct Connection URL (for DIRECT_URL):**
- Click on **"Direct connection"** mode
- You'll see something like:
  ```
  postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
  ```
- Same password encoding rules apply

### **Step 2: Update .env File**

Edit the file: `E:\Mobile-apps\digifix-car-marketplace\.env`

```env
# ================================
# SUPABASE DATABASE CONNECTION
# ================================

# Pooler URL (Port 6543 - for connection pooling)
DATABASE_URL="YOUR_CONNECTION_POOLING_URL_HERE"

# Direct URL (Port 5432 - for migrations)
DIRECT_URL="YOUR_DIRECT_CONNECTION_URL_HERE"

# ================================
# Backend Configuration
# ================================
NODE_ENV=development
BACKEND_PORT=3000

JWT_SECRET=digifix-car-marketplace-super-secret-jwt-key-2026
FRONTEND_URL=*
```

### **Step 3: Restart Docker Backend**

```powershell
# In PowerShell
docker-compose restart backend
```

### **Step 4: Check if Connection Works**

```powershell
# Check logs
docker logs digifix-backend --tail 50

# You should see: "🚀 Server running on port 3000"
# If you see authentication errors, check your password encoding
```

### **Step 5: Run Prisma Migrations to Supabase**

```powershell
# Push the schema to Supabase
docker exec -it digifix-backend npx prisma db push

# Seed the database with mock data
docker exec -it digifix-backend npm run seed
```

---

## 🔍 **Verify Connection**

### **Check Supabase Table Editor:**
1. Go to Supabase Dashboard
2. Click **"Table Editor"** on left sidebar
3. You should see tables: `User`, `Car`, `CarPart`, `Category`, etc.
4. Click on `User` table - you should see the seeded users

### **Check Prisma Studio:**
```powershell
docker exec -it digifix-backend npx prisma studio
```
- Open `http://localhost:5555`
- You should see all your data from Supabase

---

## 🚨 **Troubleshooting**

### **Error: "Authentication failed"**
- **Problem:** Wrong password or special characters not URL-encoded
- **Solution:** 
  1. Go to Supabase Dashboard → Database Settings
  2. Click "Reset Database Password"
  3. Copy the new password
  4. URL-encode it properly
  5. Update `.env` file

### **Error: "Can't reach database server"**
- **Problem:** Supabase project might be paused
- **Solution:** 
  1. Go to Supabase Dashboard
  2. Check if project shows "Paused"
  3. Click "Restore" to activate it

### **Error: "Circuit breaker open"**
- **Problem:** Too many failed connection attempts
- **Solution:** 
  1. Wait 5-10 minutes
  2. Fix the connection string
  3. Try again

---

## 📋 **Quick Reference**

### **Example Connection Strings (with encoded password):**

If your password is: `C$zv!X4n&NnWzr3`
Encoded it becomes: `C%24zv%21X4n%26NnWzr3`

```env
# Connection Pooling (Port 6543)
DATABASE_URL="postgresql://postgres.dietuoumcsfwhwirxtux:C%24zv%21X4n%26NnWzr3@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct Connection (Port 5432)
DIRECT_URL="postgresql://postgres.dietuoumcsfwhwirxtux:C%24zv%21X4n%26NnWzr3@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
```

---

## 🎯 **After Successful Connection**

1. **All new signups** will be saved to Supabase
2. **Prisma Studio** will show Supabase data
3. **Mobile app** will work with Supabase data
4. **Old local Docker data** is isolated (can be deleted with `docker volume rm digifix-car-marketplace_postgres_data`)

---

## 📞 **Need Help?**

If you're still having issues:
1. Check your Supabase project is active (not paused)
2. Verify the connection strings are copied correctly
3. Make sure special characters are URL-encoded
4. Check Docker logs: `docker logs digifix-backend`
