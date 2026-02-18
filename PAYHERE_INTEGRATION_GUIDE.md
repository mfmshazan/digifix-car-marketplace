# PayHere Payment Gateway Integration Guide

## ✅ Status
**Integration Complete** - PayHere Sandbox Mode integrated for mobile app

---

## 📋 What's Been Done

### 1. **Database Schema** ✅
Added three new tables to support payment processing:

#### `Payment` Table
```sql
- id: Unique payment identifier
- orderId: Reference to order being paid
- merchantId: PayHere merchant ID
- paymentId: PayHere payment transaction ID
- amount: Payment amount in LKR
- status: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
- customerName, Email, Phone: Payer details
- paymentGatewayResponse: JSON response from PayHere
- createdAt, updatedAt, processedAt: Timestamps
```

#### `PaymentLog` Table
```sql
- Tracks all payment actions (INITIATED, APPROVED, DECLINED, etc.)
- Stores error codes and messages
- Maintains audit trail of payment lifecycle
```

#### `Order` Model Update
- Added `payment` relation to link orders with payments

### 2. **Backend API** ✅

#### Payment Service (`backend/src/services/paymentService.js`)
```javascript
- generateMD5Hash() - Security hash generation
- generateMerchantHash() - PayHere request signing
- verifyResponseHash() - Validate PayHere responses
- createPayment() - Create payment records
- generateCheckoutParams() - Build PayHere form data
- processPaymentCallback() - Handle payment notifications
- cancelPayment() - Cancel pending payments
```

#### Payment Routes (`backend/src/routes/payment.routes.js`)
```
POST   /api/payments/initiate              - Start payment process
POST   /api/payments/callback              - PayHere server-to-server callback
GET    /api/payments/return                - User return from PayHere
POST   /api/payments/:paymentId/cancel     - Cancel payment
GET    /api/payments/:paymentId            - Get payment details
GET    /api/payments/order/:orderId        - Get order payments
```

### 3. **Mobile App Integration** ✅

#### Payment API Client (`apps/mobile/src/api/payment.ts`)
```typescript
- initiatePayment(orderId)         - Start checkout process
- getPaymentDetails(paymentId)     - Check payment status
- cancelPayment(paymentId)         - Cancel payment
- getOrderPayments(orderId)        - Get payment history
- checkPaymentStatus(params)       - Verify payment status
```

#### Checkout Screen (`apps/mobile/app/(customer)/checkout.tsx`)
- Order summary display
- Price breakdown calculation
- PayHere payment integration
- Sandbox mode test card information
- Error handling and user feedback

---

## 🔧 PayHere Configuration

### Sandbox Mode Details
```
Mode:           SANDBOX (Testing)
Website:        https://sandbox.payhere.lk
Merchant ID:    1218678 (Demo Account)
Merchant Key:   MjAwMzk0MjIzNDEwODAxMzMwOTA0MDc1OTc5MzY3NDc5MzI3MTM2OA==
Currency:       LKR (Sri Lankan Rupee)
```

### Test Payment Cards (Sandbox)
```
VISA Test Card
- Number: 4111 1111 1111 1111
- Expiry: Any future date (MM/YY)
- CVV:    Any 3 digits
- Result: SUCCESS

MasterCard Test Card
- Number: 5555 5555 5555 4444
- Expiry: Any future date (MM/YY)
- CVV:    Any 3 digits
- Result: SUCCESS
```

### Environment Variables (Add to `.env`)
```env
# PayHere Configuration
PAYHERE_MODE=SANDBOX
PAYHERE_MERCHANT_ID=1218678
PAYHERE_MERCHANT_SECRET=MjAwMzk0MjIzNDEwODAxMzMwOTA0MDc1OTc5MzY3NDc5MzI3MTM2OA==
PAYHERE_RETURN_URL=http://localhost:3000/api/payments/return
PAYHERE_NOTIFY_URL=http://localhost:3000/api/payments/notify
PAYHERE_CANCEL_URL=exp://localhost:8081
```

---

## 🚀 How It Works

### Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CUSTOMER CLICKS "PROCEED TO CHECKOUT"                     │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Mobile App Calls: POST /api/payments/initiate             │
│    - Sends: orderId, customer info                           │
│    - Receives: checkoutUrl, checkoutParams (signed)          │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. App Opens PayHere Checkout in Browser                     │
│    - WebBrowser.openBrowserAsync(checkoutUrl)               │
│    - Displays payment form with signed parameters           │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CUSTOMER ENTERS PAYMENT DETAILS                           │
│    - Card number, expiry, CVV                               │
│    - Completes 3D Secure (if required)                      │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. PayHere PROCESSES PAYMENT                                 │
│    - Validates card                                          │
│    - Authorizes transaction                                  │
│    - Generates payment ID                                    │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼ (Server Notification)
┌─────────────────────────────────────────────────────────────┐
│ 6. PayHere Calls: POST /api/payments/callback               │
│    - Sends: order_id, payment_id, status_code, hash         │
│    - Validation: MD5(merchant_id + order_id + amount +      │
│                 status_code + merchant_secret)              │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Backend UPDATES DATABASE                                  │
│    - Update Payment status                                   │
│    - Update Order payment status                             │
│    - Create PaymentLog entry                                 │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. PayHere REDIRECTS USER                                    │
│    - Redirect URL: /api/payments/return?order_id=...        │
│    - Displays payment status                                 │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. Mobile App CHECKS STATUS                                  │
│    - Calls: GET /api/payments/return?order_id=...           │
│    - Displays confirmation or error                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Using the Checkout Screen

### Navigate to Checkout
```typescript
// From cart screen
router.push({
  pathname: '/(customer)/checkout',
  params: { orderId: 'YOUR_ORDER_ID' }
});
```

### Checkout Screen Features
- ✅ Order summary with itemization
- ✅ Price breakdown (subtotal, delivery, discount)
- ✅ PayHere payment method selection
- ✅ Test card information display
- ✅ Sandbox mode indicator
- ✅ Error handling and user feedback
- ✅ Loading states
- ✅ Payment cancellation

---

## 🔐 Security Features

### Hash Validation
- All PayHere requests signed with MD5 hash
- Response hash verified before processing
- Prevents tampering with payment data

### Payment Status Tracking
- Payment Log maintains audit trail
- Records all actions and state changes
- Error messages logged for debugging

### User Authentication
- Token-based authentication required
- Orders validated to belong to user
- Prevents unauthorized payment attempts

---

## 📊 Payment Status Codes

| Status | Description | Order Status |
|--------|-------------|--------------|
| PENDING | Payment initiated, awaiting processing | PENDING |
| PROCESSING | Payment being processed | PENDING |
| COMPLETED | Payment successful | CONFIRMED |
| FAILED | Payment declined/failed | PENDING |
| CANCELLED | User cancelled payment | CANCELLED |
| REFUNDED | Payment refunded | REFUNDED |

---

## 🧪 Testing the Integration

### 1. Start Backend
```bash
cd backend
docker-compose -f docker-compose.dev.yml up
```

### 2. Start Mobile App
```bash
cd apps/mobile
npm start
```

### 3. Create Test Order
- Add items to cart
- Proceed to checkout
- Click "Proceed to Payment"

### 4. Test Payment
- Enter test card: 4111 1111 1111 1111
- Any expiry date (future)
- Any 3-digit CVV
- Complete payment

### 5. Verify Payment
- Check database: `SELECT * FROM "Payment";`
- Check PaymentLog: `SELECT * FROM "PaymentLog";`
- Verify Order status updated

---

## 📞 PayHere Resources

### Official Documentation
- **Website**: https://www.payhere.lk
- **Sandbox**: https://sandbox.payhere.lk
- **Docs**: https://payhere.freshdesk.com/support/home

### Support
- **Email**: support@payhere.lk
- **Phone**: +94 11 759 7676
- **Live Chat**: Available on PayHere website

---

## 🔄 Next Steps

### For Production
1. ✅ Get PayHere production merchant account
2. ✅ Update environment variables with production credentials
3. ✅ Change PAYHERE_MODE to "PRODUCTION"
4. ✅ Update callback URLs to actual domain
5. ✅ Enable 3D Secure for added security
6. ✅ Test thoroughly with production cards

### Future Enhancements
1. Add wallet payment option
2. Implement recurring payments
3. Add refund management
4. Create payment invoice generation
5. Integrate SMS payment notifications
6. Add payment history export
7. Implement subscription payments
8. Add multiple payment methods

---

## 🐛 Troubleshooting

### Payment Not Processing
- Check merchant ID and secret in .env
- Verify callback URL is accessible
- Check database connection
- Review PaymentLog for errors

### Hash Mismatch Error
- Verify merchant secret is correct
- Check order ID and amount formatting
- Ensure amounts are rounded to 2 decimals

### Callback Not Received
- Check PayHere notification settings
- Verify notify URL in dashboard
- Check firewall/proxy settings
- Review backend logs

---

## 📝 Database Queries

### View All Payments
```sql
SELECT * FROM "Payment" ORDER BY "createdAt" DESC;
```

### View Payment Logs
```sql
SELECT * FROM "PaymentLog" WHERE "paymentId" = 'payment-id';
```

### View Orders with Payment Status
```sql
SELECT id, "orderNumber", "paymentStatus", 
       (SELECT status FROM "Payment" WHERE "orderId" = "Order".id LIMIT 1) 
FROM "Order";
```

---

## ✨ Integration Complete!

Your PayHere payment gateway is now integrated in the mobile app! 

📱 **Test it now** by navigating to checkout and trying a test payment with the provided test card numbers.

🚀 **Ready for production** once you update credentials and switch to production mode.

Questions? Check PayHere docs or contact support.
