# API Documentation

Complete API reference for the Delivery Partner Backend.

**Base URL**: `http://localhost:3000/api`

---

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Register

Create a new delivery partner account.

**Endpoint**: `POST /auth/register`

**Request Body**:
```json
{
  "email": "partner@example.com",
  "password": "securepassword",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "vehicleType": "Motorcycle",
  "vehicleNumber": "ABC-1234"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "partner": {
      "id": 1,
      "email": "partner@example.com",
      "full_name": "John Doe",
      "phone": "+1234567890",
      "vehicle_type": "Motorcycle",
      "vehicle_number": "ABC-1234",
      "status": "offline",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Login

Authenticate with email and password.

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "email": "partner@example.com",
  "password": "securepassword"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "partner": {
      "id": 1,
      "email": "partner@example.com",
      "full_name": "John Doe",
      "phone": "+1234567890",
      "vehicle_type": "Motorcycle",
      "vehicle_number": "ABC-1234",
      "status": "offline",
      "rating": 4.5,
      "total_deliveries": 42
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Refresh Token

Get a new access token using refresh token.

**Endpoint**: `POST /auth/refresh`

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Logout

Invalidate refresh token.

**Endpoint**: `POST /auth/logout`

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## Partner Management

### Get Profile

Get current partner's profile.

**Endpoint**: `GET /partner/profile`

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "partner@example.com",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "vehicle_type": "Motorcycle",
    "vehicle_number": "ABC-1234",
    "status": "online",
    "current_latitude": 40.7128,
    "current_longitude": -74.0060,
    "rating": 4.5,
    "total_deliveries": 42,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### Update Profile

Update partner information.

**Endpoint**: `PUT /partner/profile`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "fullName": "John Smith",
  "phone": "+1234567891",
  "vehicleType": "Car",
  "vehicleNumber": "XYZ-5678"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": 1,
    "email": "partner@example.com",
    "full_name": "John Smith",
    "phone": "+1234567891",
    "vehicle_type": "Car",
    "vehicle_number": "XYZ-5678",
    "status": "online",
    "rating": 4.5,
    "total_deliveries": 42
  }
}
```

---

### Update Status

Update availability status (online/offline).

**Endpoint**: `PUT /partner/status`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "status": "online"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Status updated successfully",
  "data": {
    "status": "online"
  }
}
```

---

### Update Location

Update current GPS location.

**Endpoint**: `PUT /partner/location`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Location updated successfully"
}
```

---

## Job Management

### Get Available Jobs

List all available jobs (not assigned).

**Endpoint**: `GET /jobs/available`

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "order_number": "ORD-2024-001",
      "customer_name": "Alice Johnson",
      "customer_phone": "+1234567893",
      "pickup_address": "123 Main St, Downtown",
      "pickup_latitude": 40.7128,
      "pickup_longitude": -74.0060,
      "dropoff_address": "456 Oak Ave, Uptown",
      "dropoff_latitude": 40.7589,
      "dropoff_longitude": -73.9851,
      "distance_km": 8.5,
      "payment_amount": 15.00,
      "items_description": "Brake pads and oil filter",
      "special_instructions": "Handle with care",
      "status": "available",
      "created_at": "2024-01-15T09:00:00.000Z"
    }
  ]
}
```

---

### Get Active Job

Get partner's currently active job.

**Endpoint**: `GET /jobs/active`

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_number": "ORD-2024-001",
    "customer_name": "Alice Johnson",
    "customer_phone": "+1234567893",
    "pickup_address": "123 Main St, Downtown",
    "pickup_latitude": 40.7128,
    "pickup_longitude": -74.0060,
    "pickup_contact_name": "Auto Parts Store",
    "pickup_contact_phone": "+1234567894",
    "dropoff_address": "456 Oak Ave, Uptown",
    "dropoff_latitude": 40.7589,
    "dropoff_longitude": -73.9851,
    "distance_km": 8.5,
    "payment_amount": 15.00,
    "items_description": "Brake pads and oil filter",
    "special_instructions": "Handle with care",
    "status": "assigned",
    "assigned_at": "2024-01-15T10:00:00.000Z",
    "created_at": "2024-01-15T09:00:00.000Z"
  }
}
```

---

### Get Job History

Get partner's completed job history.

**Endpoint**: `GET /jobs/history?limit=20&offset=0`

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "order_number": "ORD-2024-005",
      "customer_name": "Bob Smith",
      "pickup_address": "789 Elm St",
      "dropoff_address": "321 Pine Rd",
      "distance_km": 12.3,
      "payment_amount": 22.50,
      "status": "delivered",
      "assigned_at": "2024-01-14T08:00:00.000Z",
      "picked_up_at": "2024-01-14T08:30:00.000Z",
      "delivered_at": "2024-01-14T09:15:00.000Z"
    }
  ]
}
```

---

### Accept Job

Accept an available job.

**Endpoint**: `POST /jobs/:id/accept`

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Job accepted successfully",
  "data": {
    "id": 1,
    "order_number": "ORD-2024-001",
    "customer_name": "Alice Johnson",
    "customer_phone": "+1234567893",
    "pickup_address": "123 Main St, Downtown",
    "pickup_latitude": 40.7128,
    "pickup_longitude": -74.0060,
    "dropoff_address": "456 Oak Ave, Uptown",
    "dropoff_latitude": 40.7589,
    "dropoff_longitude": -73.9851,
    "payment_amount": 15.00,
    "status": "assigned",
    "assigned_at": "2024-01-15T10:00:00.000Z"
  }
}
```

**Error** (400 Bad Request):
```json
{
  "success": false,
  "message": "You already have an active delivery"
}
```

---

### Update Job Status

Update job status during delivery.

**Endpoint**: `PUT /jobs/:id/status`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "status": "picked_up"
}
```

**Valid Status Values**: `picked_up`, `in_transit`, `delivered`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Job status updated successfully",
  "data": {
    "id": 1,
    "order_number": "ORD-2024-001",
    "status": "picked_up",
    "picked_up_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### Add Location Tracking

Add GPS tracking point during delivery.

**Endpoint**: `POST /jobs/:id/location`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "latitude": 40.7300,
  "longitude": -74.0100,
  "accuracy": 10.5,
  "speed": 15.2,
  "heading": 180.0
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Location tracked successfully"
}
```

---

### Submit Proof of Delivery

Submit proof of delivery (photo, signature, notes).

**Endpoint**: `POST /jobs/:id/proof`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "photoUrl": "https://example.com/photos/delivery123.jpg",
  "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "recipientName": "Alice Johnson",
  "notes": "Delivered to front desk",
  "latitude": 40.7589,
  "longitude": -73.9851
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Proof of delivery submitted successfully",
  "data": {
    "id": 1,
    "created_at": "2024-01-15T11:00:00.000Z"
  }
}
```

---

## Admin Endpoints (Testing)

### Create Job

Create a new delivery job for testing.

**Endpoint**: `POST /admin/jobs`

**Headers**: `x-api-key: <admin_api_key>`

**Request Body**:
```json
{
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
  "itemsDescription": "Test parts",
  "specialInstructions": "Test delivery"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Job created successfully",
  "data": {
    "id": 10,
    "order_number": "ORD-TEST-001",
    "status": "available",
    "created_at": "2024-01-15T12:00:00.000Z"
  }
}
```

---

### Get All Jobs

Get all jobs with optional status filter.

**Endpoint**: `GET /admin/jobs?status=available`

**Headers**: `x-api-key: <admin_api_key>`

**Query Parameters**:
- `status` (optional): Filter by status

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "order_number": "ORD-2024-001",
      "status": "delivered",
      "partner_name": "John Doe",
      "partner_phone": "+1234567890",
      "created_at": "2024-01-15T09:00:00.000Z"
    }
  ]
}
```

---

### Get All Partners

Get all delivery partners.

**Endpoint**: `GET /admin/partners`

**Headers**: `x-api-key: <admin_api_key>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "partner@example.com",
      "full_name": "John Doe",
      "phone": "+1234567890",
      "vehicle_type": "Motorcycle",
      "vehicle_number": "ABC-1234",
      "status": "online",
      "rating": 4.5,
      "total_deliveries": 42,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Error Responses

All endpoints may return these error responses:

**400 Bad Request**:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**401 Unauthorized**:
```json
{
  "success": false,
  "message": "Access token required"
}
```

**403 Forbidden**:
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

**404 Not Found**:
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. In production, consider adding rate limiting middleware.

## Pagination

Endpoints that return lists support pagination via `limit` and `offset` query parameters.

## CORS

CORS is enabled for all origins in development. Configure appropriately for production.
