# 📮 Postman API Testing Guide

This guide shows you how to test the DigiFix Car Marketplace API using Postman.

---

## 🔧 Setup

### Base URL
```
http://localhost:3000/api
```

### Required Headers (for all requests)
```
Content-Type: application/json
```

### For Authenticated Requests (add this header)
```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 📋 Step-by-Step Testing Flow

### Step 1: Register a Salesman Account

**Request:**
```
POST http://localhost:3000/api/auth/register
```

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "name": "Auto Parts Store",
  "email": "salesman@test.com",
  "password": "password123",
  "role": "SALESMAN"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "clxxx...",
      "email": "salesman@test.com",
      "name": "Auto Parts Store",
      "role": "SALESMAN"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

⚠️ **IMPORTANT:** Copy the `token` from the response! You'll need it for authenticated requests.

---

### Step 2: Login (if you already have an account)

**Request:**
```
POST http://localhost:3000/api/auth/login
```

**Body (raw JSON):**
```json
{
  "email": "salesman@test.com",
  "password": "password123"
}
```

**Expected Response:** Same as register - contains token.

---

### Step 3: Create a Category (Required before adding products)

**Request:**
```
POST http://localhost:3000/api/categories
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**Body (raw JSON):**
```json
{
  "name": "Brakes",
  "description": "Brake pads, rotors, calipers, and brake fluid",
  "icon": "🛑"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "name": "Brakes",
    "description": "Brake pads, rotors, calipers, and brake fluid",
    "icon": "🛑"
  }
}
```

⚠️ **IMPORTANT:** Copy the category `id`! You'll need it when creating products.

---

### Step 4: Create More Categories (Optional)

Repeat Step 3 with different data:

```json
{ "name": "Engine Parts", "description": "Engine components", "icon": "⚙️" }
{ "name": "Filters", "description": "Oil, air, fuel filters", "icon": "🔧" }
{ "name": "Lighting", "description": "Headlights, taillights, bulbs", "icon": "💡" }
{ "name": "Electrical", "description": "Batteries, alternators", "icon": "🔋" }
```

---

### Step 5: Get All Categories

**Request:**
```
GET http://localhost:3000/api/categories
```

**No authentication required.**

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "name": "Brakes",
      "description": "...",
      "_count": { "products": 0 }
    }
  ]
}
```

---

### Step 6: Create a Product (Salesman Only)

**Request:**
```
POST http://localhost:3000/api/products
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**Body (raw JSON):**
```json
{
  "name": "Premium Brake Pads - Front",
  "description": "High-performance ceramic brake pads for superior stopping power. Compatible with Toyota, Honda, and Nissan vehicles.",
  "price": 45.99,
  "discountPrice": 39.99,
  "sku": "BRK-PAD-001",
  "stock": 50,
  "images": [
    "https://example.com/images/brake-pads-1.jpg",
    "https://example.com/images/brake-pads-2.jpg"
  ],
  "categoryId": "PASTE_CATEGORY_ID_HERE"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "clxxx...",
    "name": "Premium Brake Pads - Front",
    "description": "High-performance ceramic brake pads...",
    "price": 45.99,
    "discountPrice": 39.99,
    "sku": "BRK-PAD-001",
    "stock": 50,
    "isActive": true,
    "category": {
      "id": "...",
      "name": "Brakes"
    }
  }
}
```

---

### Step 7: Create More Products

Here are some example products you can add:

**Product 2: Oil Filter**
```json
{
  "name": "Premium Oil Filter",
  "description": "High-quality oil filter for optimal engine performance",
  "price": 12.99,
  "stock": 100,
  "sku": "FLT-OIL-001",
  "categoryId": "FILTERS_CATEGORY_ID"
}
```

**Product 3: LED Headlight**
```json
{
  "name": "LED Headlight Bulb H11",
  "description": "Super bright 6000K white LED headlight bulb",
  "price": 34.99,
  "discountPrice": 29.99,
  "stock": 75,
  "sku": "LGT-LED-H11",
  "categoryId": "LIGHTING_CATEGORY_ID"
}
```

**Product 4: Car Battery**
```json
{
  "name": "12V Car Battery 60Ah",
  "description": "Maintenance-free car battery with 2-year warranty",
  "price": 89.99,
  "stock": 25,
  "sku": "BAT-12V-60",
  "categoryId": "ELECTRICAL_CATEGORY_ID"
}
```

---

### Step 8: Get All Products

**Request:**
```
GET http://localhost:3000/api/products
```

**No authentication required.**

**Query Parameters (optional):**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `category` - Filter by category ID
- `search` - Search in name/description
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `sortBy` - Sort field (createdAt, price, name)
- `sortOrder` - asc or desc

**Example with filters:**
```
GET http://localhost:3000/api/products?search=brake&minPrice=10&maxPrice=100
```

---

### Step 9: Get Product by ID

**Request:**
```
GET http://localhost:3000/api/products/PRODUCT_ID_HERE
```

---

### Step 10: Update a Product (Salesman Only)

**Request:**
```
PUT http://localhost:3000/api/products/PRODUCT_ID_HERE
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**Body (raw JSON):**
```json
{
  "price": 49.99,
  "stock": 45,
  "discountPrice": 42.99
}
```

---

### Step 11: Delete a Product (Salesman Only)

**Request:**
```
DELETE http://localhost:3000/api/products/PRODUCT_ID_HERE
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 🔐 Authentication Errors

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided"
}
```
**Solution:** Add the `Authorization: Bearer TOKEN` header.

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. SALESMAN role required"
}
```
**Solution:** Make sure you registered as SALESMAN, not CUSTOMER.

---

## 📁 Postman Collection Setup

### Create Environment Variables

1. Open Postman → Environments → Create New
2. Add these variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `baseUrl` | `http://localhost:3000/api` | `http://localhost:3000/api` |
| `token` | (empty) | (paste your token here) |
| `categoryId` | (empty) | (paste after creating) |

### Use Variables in Requests

**URL:**
```
{{baseUrl}}/products
```

**Authorization Header:**
```
Bearer {{token}}
```

---

## 🧪 Quick Test Script (PowerShell)

Run these commands to test the API quickly:

```powershell
# 1. Health Check
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get

# 2. Register Salesman
$body = @{
    name = "Test Store"
    email = "test@store.com"
    password = "password123"
    role = "SALESMAN"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method Post -Body $body -ContentType "application/json"
$token = $response.data.token
Write-Host "Token: $token"

# 3. Create Category
$headers = @{ Authorization = "Bearer $token" }
$catBody = @{ name = "Brakes"; description = "Brake parts" } | ConvertTo-Json
$category = Invoke-RestMethod -Uri "http://localhost:3000/api/categories" -Method Post -Body $catBody -ContentType "application/json" -Headers $headers
$categoryId = $category.data.id
Write-Host "Category ID: $categoryId"

# 4. Create Product
$productBody = @{
    name = "Test Brake Pads"
    price = 45.99
    stock = 50
    categoryId = $categoryId
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/products" -Method Post -Body $productBody -ContentType "application/json" -Headers $headers

# 5. Get All Products
Invoke-RestMethod -Uri "http://localhost:3000/api/products" -Method Get
```

---

## 📊 API Endpoints Summary

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/auth/register` | ❌ | - | Register user |
| POST | `/auth/login` | ❌ | - | Login user |
| GET | `/auth/profile` | ✅ | Any | Get profile |
| GET | `/categories` | ❌ | - | List categories |
| POST | `/categories` | ✅ | Any | Create category |
| GET | `/products` | ❌ | - | List products |
| GET | `/products/:id` | ❌ | - | Get product |
| POST | `/products` | ✅ | SALESMAN | Create product |
| PUT | `/products/:id` | ✅ | SALESMAN | Update product |
| DELETE | `/products/:id` | ✅ | SALESMAN | Delete product |

---

## 💡 Tips

1. **Save your token** - You'll need it for all authenticated requests
2. **Create categories first** - Products require a valid categoryId
3. **Check Docker is running** - `docker-compose ps` should show healthy containers
4. **View logs for errors** - `docker-compose logs -f backend`

Happy Testing! 🚀
