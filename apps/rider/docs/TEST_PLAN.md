# Test Plan

Comprehensive testing guide for the Delivery Partner Application.

## Test Environment Setup

### Prerequisites
- Backend server running on `http://localhost:3000`
- Mobile app running on iOS/Android simulator or physical device
- PostgreSQL database initialized with schema
- Sample data seeded (optional but recommended)

### Test Accounts
- **Email**: john.doe@example.com | **Password**: password123
- **Email**: jane.smith@example.com | **Password**: password123

---

## 1. Authentication Tests

### 1.1 Registration Flow
**Objective**: Verify new partner registration

**Steps**:
1. Open mobile app
2. Tap "Create Account"
3. Fill in registration form:
   - Full Name: "Test Partner"
   - Email: "test@example.com"
   - Phone: "+1234567890"
   - Password: "password123"
   - Vehicle Type: "Motorcycle"
   - Vehicle Number: "TEST-123"
4. Tap "Create Account"

**Expected Result**:
- ✅ Account created successfully
- ✅ Automatically logged in
- ✅ Redirected to Home screen
- ✅ Tokens stored securely

**Edge Cases**:
- Try registering with existing email → Should show error
- Try weak password (< 6 chars) → Should show validation error
- Leave required fields empty → Should show validation error

---

### 1.2 Login Flow
**Objective**: Verify partner login

**Steps**:
1. Open mobile app
2. Enter email: "john.doe@example.com"
3. Enter password: "password123"
4. Tap "Sign In"

**Expected Result**:
- ✅ Login successful
- ✅ Redirected to Home screen
- ✅ Partner name displayed
- ✅ Tokens stored securely

**Edge Cases**:
- Wrong password → Should show error
- Non-existent email → Should show error
- Empty fields → Should show validation error

---

### 1.3 Token Refresh
**Objective**: Verify automatic token refresh

**Steps**:
1. Login to app
2. Wait for access token to expire (15 minutes) OR manually expire token
3. Make any API request (e.g., view profile)

**Expected Result**:
- ✅ Token automatically refreshed
- ✅ Request succeeds without re-login
- ✅ No user interruption

**Testing Tip**: Modify `JWT_ACCESS_EXPIRY` in backend `.env` to `30s` for faster testing

---

### 1.4 Logout
**Objective**: Verify logout functionality

**Steps**:
1. Login to app
2. Navigate to Profile screen
3. Tap "Logout"
4. Confirm logout

**Expected Result**:
- ✅ Tokens cleared from storage
- ✅ Redirected to Login screen
- ✅ Cannot access protected screens

---

## 2. Partner Management Tests

### 2.1 View Profile
**Objective**: Verify profile display

**Steps**:
1. Login to app
2. Navigate to Profile screen

**Expected Result**:
- ✅ All profile fields displayed correctly
- ✅ Email, name, phone, vehicle info shown
- ✅ Stats (deliveries, rating) displayed

---

### 2.2 Edit Profile
**Objective**: Verify profile updates

**Steps**:
1. Navigate to Profile screen
2. Tap "Edit Profile"
3. Change phone number to "+9876543210"
4. Change vehicle type to "Car"
5. Tap "Save Changes"

**Expected Result**:
- ✅ Profile updated successfully
- ✅ Changes reflected immediately
- ✅ Backend updated (verify with GET /partner/profile)

**Edge Cases**:
- Cancel editing → Changes discarded
- Invalid phone format → Should validate

---

### 2.3 Status Toggle
**Objective**: Verify online/offline status

**Steps**:
1. Navigate to Home screen
2. Toggle status switch to "Online"
3. Verify status badge shows "Online"
4. Toggle to "Offline"

**Expected Result**:
- ✅ Status updates in real-time
- ✅ Backend updated (verify with GET /partner/profile)
- ✅ When offline, cannot accept jobs

---

## 3. Job Management Tests

### 3.1 Browse Available Jobs
**Objective**: Verify job listing

**Preparation**:
Create test job using admin endpoint:
```bash
curl -X POST http://localhost:3000/api/admin/jobs \
  -H "Content-Type: application/json" \
  -H "x-api-key: test_admin_key_change_in_production" \
  -d '{
    "orderNumber": "ORD-TEST-001",
    "customerName": "Test Customer",
    "customerPhone": "+1234567890",
    "pickupAddress": "123 Test St, Downtown",
    "pickupLatitude": 40.7128,
    "pickupLongitude": -74.0060,
    "dropoffAddress": "456 Demo Ave, Uptown",
    "dropoffLatitude": 40.7589,
    "dropoffLongitude": -73.9851,
    "paymentAmount": 25.00,
    "itemsDescription": "Test spare parts"
  }'
```

**Steps**:
1. Set status to "Online"
2. Navigate to "Available Jobs"
3. Pull to refresh

**Expected Result**:
- ✅ Test job appears in list
- ✅ Order number, addresses, payment shown
- ✅ Distance calculated (if available)
- ✅ Items description displayed

---

### 3.2 Accept Job
**Objective**: Verify job acceptance

**Steps**:
1. Browse available jobs
2. Tap "Accept Job" on a job
3. Confirm acceptance

**Expected Result**:
- ✅ Job accepted successfully
- ✅ Redirected to Active Delivery screen
- ✅ Partner status changed to "busy"
- ✅ Job removed from available list
- ✅ Job appears on Home screen

**Edge Cases**:
- Try accepting another job while having active job → Should show error
- Job already accepted by another partner → Should show error

---

### 3.3 Complete Delivery Workflow
**Objective**: Test full delivery lifecycle

**Steps**:
1. Accept a job
2. Navigate to Active Delivery screen
3. Verify map shows pickup and dropoff markers
4. Tap "Arrived at Pickup"
   - Status changes to "picked_up"
5. Tap "Start Delivery"
   - Status changes to "in_transit"
   - GPS tracking starts
6. Tap "Mark as Delivered"
   - Redirected to Proof of Delivery screen

**Expected Result**:
- ✅ Status transitions work correctly
- ✅ Timestamps recorded for each status
- ✅ Map displays correctly
- ✅ Job details visible at each step

---

### 3.4 Proof of Delivery
**Objective**: Verify proof submission

**Steps**:
1. Complete delivery workflow to "Mark as Delivered"
2. On Proof of Delivery screen:
   - Tap "Take Photo" → Capture photo
   - Tap "Capture Signature" → Draw signature
   - Enter recipient name: "Test Recipient"
   - Enter notes: "Delivered successfully"
3. Tap "Complete Delivery"

**Expected Result**:
- ✅ Photo captured and displayed
- ✅ Signature captured and displayed
- ✅ Proof submitted successfully
- ✅ Job marked as "delivered"
- ✅ Partner status returns to "online"
- ✅ Total deliveries count incremented
- ✅ Redirected to Home screen

**Edge Cases**:
- Submit without photo or signature → Should show warning
- Camera permission denied → Should show error

---

### 3.5 View Job History
**Objective**: Verify completed jobs display

**Steps**:
1. Complete at least one delivery
2. Navigate to "Job History"

**Expected Result**:
- ✅ Completed job appears in history
- ✅ Order number, addresses shown
- ✅ Payment amount displayed
- ✅ Delivery date shown
- ✅ Status shows "DELIVERED"

---

## 4. GPS Tracking Tests

### 4.1 Location Permissions
**Objective**: Verify location permission handling

**Steps**:
1. Fresh install of app
2. Login
3. Accept a job

**Expected Result**:
- ✅ App requests location permission
- ✅ If granted, tracking works
- ✅ If denied, app shows appropriate message

---

### 4.2 Real-time Tracking
**Objective**: Verify GPS tracking during delivery

**Steps**:
1. Accept a job
2. Start delivery (status: in_transit)
3. Move around (or simulate location in simulator)
4. Check backend tracking data:
```bash
curl http://localhost:3000/api/admin/jobs/1/tracking \
  -H "x-api-key: test_admin_key_change_in_production"
```

**Expected Result**:
- ✅ Location updates sent every 10 seconds
- ✅ Tracking points stored in database
- ✅ Latitude, longitude, accuracy recorded
- ✅ Tracking stops when delivery completed

---

## 5. Offline Resilience Tests

### 5.1 Offline Actions Queue
**Objective**: Verify offline action queuing

**Steps**:
1. Accept a job and start delivery
2. Turn off device network (airplane mode)
3. Update job status (e.g., "Arrived at Pickup")
4. Try to submit location updates
5. Turn network back on

**Expected Result**:
- ✅ Actions queued while offline
- ✅ No app crashes
- ✅ When online, queued actions sync automatically
- ✅ Status updates applied in order

**Note**: Current implementation queues actions but requires manual retry. Full auto-sync can be enhanced.

---

## 6. Error Handling Tests

### 6.1 Network Errors
**Objective**: Verify graceful error handling

**Steps**:
1. Stop backend server
2. Try to login
3. Try to accept a job
4. Try to update profile

**Expected Result**:
- ✅ User-friendly error messages shown
- ✅ No app crashes
- ✅ Retry options available

---

### 6.2 Invalid Data
**Objective**: Verify validation

**Steps**:
1. Try to register with invalid email
2. Try to update profile with empty name
3. Try to submit proof without photo/signature

**Expected Result**:
- ✅ Validation errors shown
- ✅ Clear error messages
- ✅ Form highlights invalid fields

---

## 7. Performance Tests

### 7.1 App Launch Time
**Objective**: Verify fast app startup

**Expected Result**:
- ✅ App launches in < 3 seconds
- ✅ Auth check completes quickly
- ✅ No unnecessary loading screens

---

### 7.2 API Response Time
**Objective**: Verify API performance

**Steps**:
Test key endpoints with timing:
```bash
time curl http://localhost:3000/api/jobs/available \
  -H "Authorization: Bearer <token>"
```

**Expected Result**:
- ✅ Most endpoints respond in < 200ms
- ✅ Database queries optimized
- ✅ No N+1 query problems

---

## 8. Security Tests

### 8.1 Token Security
**Objective**: Verify secure token storage

**Steps**:
1. Login to app
2. Check device storage (requires dev tools)

**Expected Result**:
- ✅ Tokens stored in Keychain (iOS) or Keystore (Android)
- ✅ Not stored in plain text
- ✅ Not accessible to other apps

---

### 8.2 API Authorization
**Objective**: Verify protected endpoints

**Steps**:
1. Try accessing `/api/partner/profile` without token
2. Try accessing with expired token
3. Try accessing with invalid token

**Expected Result**:
- ✅ All return 401 or 403 errors
- ✅ No data leaked
- ✅ Clear error messages

---

## Test Checklist

### Authentication
- [ ] Registration works
- [ ] Login works
- [ ] Token refresh works
- [ ] Logout works

### Profile Management
- [ ] View profile
- [ ] Edit profile
- [ ] Toggle online/offline status

### Job Management
- [ ] Browse available jobs
- [ ] Accept job
- [ ] Update job status (pickup, in-transit, delivered)
- [ ] Submit proof of delivery
- [ ] View job history

### GPS Tracking
- [ ] Location permissions requested
- [ ] Real-time tracking during delivery
- [ ] Tracking stops after delivery

### Offline Support
- [ ] Actions queued when offline
- [ ] Actions sync when online

### Error Handling
- [ ] Network errors handled gracefully
- [ ] Validation errors shown clearly
- [ ] No app crashes

### Performance
- [ ] Fast app launch
- [ ] Quick API responses
- [ ] Smooth UI interactions

### Security
- [ ] Tokens stored securely
- [ ] Protected endpoints require auth
- [ ] Passwords hashed

---

## Bug Reporting Template

When reporting bugs, include:

**Title**: Brief description

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**: What should happen

**Actual Behavior**: What actually happens

**Environment**:
- Device: iPhone 14 / Android Pixel 6
- OS Version: iOS 17 / Android 13
- App Version: 1.0.0
- Backend Version: 1.0.0

**Screenshots/Logs**: Attach if available

---

## Automated Testing (Future Enhancement)

Consider adding:
- Unit tests for services and utilities
- Integration tests for API endpoints
- E2E tests with Detox or Appium
- CI/CD pipeline with automated testing
