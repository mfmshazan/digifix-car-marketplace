# 📦 Order Management System — Full Flow Explained

This document traces the **complete lifecycle of an order**: from a customer tapping "Place Order" all the way to the rider marking it delivered — and how every party gets updated in real time.

---

## 🗺️ Bird's Eye View

```
Customer App
    │
    │  POST /api/orders  (createOrder)
    ▼
Backend: order.controller.js
    │
    ├──► 1. Creates Order record in DB (status: PENDING)
    ├──► 2. Socket.IO → Notifies Salesman in real time
    ├──► 3. OneSignal → Push notification to Salesman
    └──► 4. Creates Rider Delivery Job → Dispatches to nearest rider (auto)
                │
                ▼
         Rider App (WebSocket)
                │
                ├── Rider accepts offer
                ├── Rider updates status: arrived_at_pickup → picked_up → in_transit → delivered
                │       └──► syncMarketplaceOrderStatus() auto-updates Order in DB
                └── Rider submits proof of delivery (photo)

All updates → Salesman can also manually update status via PUT /api/orders/:id/status
            → Customer sees real-time socket events on their app
```

---

## STEP 1 — Customer Places an Order

**File:** [`order.controller.js`](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/controllers/order.controller.js)  
**Route:** `POST /api/orders` → [`order.routes.js L21`](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/routes/order.routes.js#L21-L21)  
**Function:** [`createOrder` — L631](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/controllers/order.controller.js#L631-L980)

### What happens:
1. **Validates items** — Looks up product IDs in both `Product` and `CarPart` tables (`L661–L729`)
2. **Groups by seller** — If the customer bought from 2 sellers, 2 separate orders are created, each assigned to the correct salesman (`L742–L765`)
3. **Calculates pricing** — 10% service charge + delivery fee (`L768–L781`)
4. **Wallet check** — If paying by wallet, verifies balance upfront (`L786–L792`)
5. **Creates Orders in a DB transaction** (`L800–L900`):
   - Each order gets `status: 'PENDING'` (`L841`)
   - An `OrderTracking` entry is created: `"Order placed"` (`L884–L890`)
6. **If WALLET payment** — Balance is deducted immediately (`L803–L820`)

```javascript
// L841 — initial order status
status: 'PENDING',
paymentStatus: paymentMethod === 'WALLET' ? 'PAID' : 'PENDING',
```

---

## STEP 2 — Salesman Gets Notified (Dual Channel)

Still in `createOrder`, **after** the DB transaction commits:

### Channel A — Socket.IO (instant, in-app)
**File:** [`order.controller.js L932–L948`](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/controllers/order.controller.js#L932-L948)

```javascript
// L946 — emits 'newOrder' event to salesman's socket room
io.to(`user:${order.salesmanId}`).emit('newOrder', orderPayload);
```

The salesman's dashboard is listening on the `newOrder` socket event. Their order list updates **instantly without refreshing**.

### Channel B — OneSignal Push Notification (even if app is closed)
**File:** [`order.controller.js L951–L961`](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/controllers/order.controller.js#L951-L961)

```javascript
// L954 — fires OneSignal push to salesman's device
sendNewOrderNotificationToSalesman({ salesmanId, orderId, orderNumber, total })
```

This is **non-blocking** — it won't slow down the customer's response if OneSignal is slow.

---

## STEP 3 — Rider Job is Automatically Created & Dispatched

**File:** [`riderDeliveryJobFactory.js`](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/services/riderDeliveryJobFactory.js)  
**Called from:** [`order.controller.js L963`](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/controllers/order.controller.js#L963-L965)

```javascript
// L963 — non-blocking call, won't fail the order if rider system is down
createRiderJobsForMarketplaceOrders(createdOrders).catch(...)
```

### Inside `createRiderJobFromMarketplaceOrder` (L24–L112):
1. Fetches full order details (customer, salesman/store, address, items)
2. Checks if a rider job **already exists** for this order (prevents duplicates, L43–L48)
3. Checks for configured pickup/dropoff coordinates from `.env` (L50–L58)
4. **Inserts a `rider_delivery_jobs` record** with status `'pending'` (L66–L108)
5. Immediately calls `dispatchJobToNextEligibleDriver(job.id)` (L110)

### Inside `dispatchJobToNextEligibleDriver` (L215–L294 of `riderRealtimeDispatch.js`):
1. Locks the job row with `FOR UPDATE`
2. Finds the **nearest online rider** within the configured radius (default: 2km) — `pickNearestEligiblePartner` (L171–L213)
   - Rider must be `status = 'online'`
   - Must not have an active job
   - Must not already have a pending offer
3. Creates a `rider_delivery_request_offers` record (30-second window by default)
4. **Sends the offer via WebSocket** to the rider's app: event type `incoming_order_request` (L286)
5. Starts a **countdown timer** — if the rider doesn't respond in 30 seconds, the offer expires and the next nearest rider is tried (L94–L101)

---

## STEP 4 — Rider Accepts or Declines

**File:** [`riderJobs.controller.js`](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/controllers/riderJobs.controller.js)  
**Routes:** [`riderJobs.routes.js`](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/routes/riderJobs.routes.js)

### Rider Accepts via Offer (preferred path):
**Route:** `POST /rider/jobs/request-offers/:offerId/accept` → `L27`  
**Function:** [`acceptRiderRequestOffer` — L167](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/controllers/riderJobs.controller.js#L167-L188)  
→ Calls `resolveOffer()` in `riderRealtimeDispatch.js L321`

Inside `resolveOffer` when `action === 'accepted'` (L356–L440):
- Marks the offer as `'accepted'`
- Sets the job: `partner_id = rider`, `status = 'assigned'`
- Sets rider status to `'busy'`
- Emits `order_request_resolved` back to the rider (L434)

### Rider Declines / Timer Expires:
→ Calls `resolveOffer()` with `action: 'declined'` or `'expired'`  
→ Immediately calls `dispatchJobToNextEligibleDriver()` again to try the **next nearest rider** (L460)

### Rider Also Manually Accept from Available Jobs Pool:
**Route:** `POST /rider/jobs/:id/accept` → `L30`  
**Function:** [`acceptRiderJob` — L228](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/controllers/riderJobs.controller.js#L228-L302)

---

## STEP 5 — Rider Updates Delivery Status

**Route:** `PUT /rider/jobs/:id/status` → [`riderJobs.routes.js L32`](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/routes/riderJobs.routes.js#L32)  
**Function:** [`updateRiderJobStatus` — L379](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/controllers/riderJobs.controller.js#L379-L482)

### Allowed Status Transitions (enforced, L408–L415):
```
assigned → accepted → arrived_at_pickup → picked_up → in_transit → arrived_at_dropoff → delivered
                                                                                        └── failed (any stage)
```

Each step:
1. Updates `rider_delivery_jobs.status` (L433–L439)
2. Logs to `rider_job_status_logs` (L441–L445)
3. Records GPS location if provided (L447–L461)
4. **Calls `syncMarketplaceOrderStatus()`** (L470) ← **KEY: this syncs back to customer's order**

### `syncMarketplaceOrderStatus`:

The rider's progress **automatically** drives the customer-facing order status — the
seller/manager no longer has to manually mark the order SHIPPED. The rider's detailed
steps collapse onto the simple 5-step user flow:

```javascript
// Rider step → user-facing Order status
const userFacingStatusMap = {
  accepted:           'PROCESSING', // heading to shop
  arrived_at_pickup:  'PROCESSING', // collecting
  picked_up:          'SHIPPED',    // ← auto-advances to SHIPPED (was manual before)
  in_transit:         'SHIPPED',
  arrived_at_dropoff: 'SHIPPED',
  delivered:          'DELIVERED',
  failed:             'FAILED',
};
```

The update is **forward-only** (rank-guarded): a late/out-of-order rider event can never
downgrade a more advanced status (e.g. an `in_transit` arriving after `DELIVERED`). It then:

1. Updates the main `Order` table (only if it moves the status forward)
2. Writes an `OrderTracking` row with the detailed rider step for the audit timeline
3. Emits `orderStatusUpdated` over Socket.IO to the **customer** and **every shop member**
   (manager + all salesmen), and fires OneSignal pushes to both

> **This is the bridge** — every rider status change is automatically written to the main
> `Order` table and `OrderTracking` **and** pushed live to the customer, salesman (mobile +
> web) and manager, with no manual step in between.

---

## STEP 6 — Rider Submits Proof of Delivery (Photo)

**Route:** `POST /rider/jobs/:id/proof` → [`riderJobs.routes.js L34`](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/routes/riderJobs.routes.js#L34)  
**Function:** [`submitRiderProof` — L519](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/controllers/riderJobs.controller.js#L519-L652)

1. Accepts photo upload, signature, recipient name (L529–L567)
2. Inserts into `rider_proof_of_delivery` table (L591–L605)
3. If job not yet marked `delivered`, auto-marks it now (L609–L614)
4. Calls `syncMarketplaceOrderStatus(client, jobId, 'delivered')` (L627) — **triggers DELIVERED on the main order**
5. Frees the rider back to `'online'` status (L622–L625)
6. Dispatches next available jobs (L631)

---

## STEP 7 — Salesman Manually Updates Status (Alternative Path)

**Route:** `PUT /api/orders/:id/status` → [`order.routes.js L34`](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/routes/order.routes.js#L34)  
**Function:** [`updateOrderStatus` — L410](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/controllers/order.controller.js#L410-L550)

The salesman can push the order through statuses manually from their dashboard. On update:
1. Updates `Order.status` in DB (L434–L454)
2. Creates `OrderTracking` entry (L457–L463)
3. **If status → DELIVERED**: Wallet funds released from Admin → Salesman (L469–L488)
4. **If status → REFUNDED**: Wallet funds released from Admin → Customer (L494–L513)
5. **Socket.IO emit to BOTH customer and salesman** (L519–L535):

```javascript
// L521 — customer's app gets updated instantly
io.to(`user:${updatedOrder.customerId}`).emit('orderStatusUpdated', { orderId, orderNumber, status, updatedAt });

// L528 — salesman also gets confirmed update
io.to(`user:${salesmanId}`).emit('orderStatusUpdated', { ... });
```

---

## STEP 8 — Customer Requests Cancellation

**Route:** `POST /api/orders/:id/cancel` → [`order.routes.js L24`](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/routes/order.routes.js#L24)  
**Function:** [`requestCancellation` — L1089](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/controllers/order.controller.js#L1089-L1206)

- Only works on `PENDING`, `CONFIRMED`, or `DELIVERED` orders (L1115)
- Sets status to `REFUND_REQUESTED` (L1127)
- Notifies **all admins** via socket event `cancellationRequested` (L1144)
- Sends OneSignal push to admin (L1191)

### Admin Approves:
**Route:** `POST /api/orders/:id/approve-cancel`  
**Function:** [`approveCancellation` — L1213`](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/controllers/order.controller.js#L1213-L1283)
- Sets status → `CANCELLED`
- Notifies **salesman** (stop processing) + **customer** (refund confirmed) via socket (L1262–L1263)
- Sends OneSignal push to salesman (L1269)

### Admin Rejects:
**Route:** `POST /api/orders/:id/reject-cancel`  
**Function:** [`rejectCancellation` — L1290`](file:///e:/Mobile-apps/Digifix/digifix-car-marketplace/backend/src/controllers/order.controller.js#L1290-L1351)
- Reverts order to `PENDING`
- Notifies customer via socket event `cancellationRejected` (L1333)

---

## Summary Table

| Step | Who Does It | Where in Code | Real-time Update Method |
|------|------------|--------------|------------------------|
| Place order | Customer | `createOrder` L631 | — |
| Salesman notified | System | `createOrder` L932–L961 | Socket.IO + OneSignal push |
| Rider job created | System | `createRiderJobsForMarketplaceOrders` L963 | — |
| Rider offered job | System | `dispatchJobToNextEligibleDriver` L215 | WebSocket `incoming_order_request` |
| Rider accepts | Rider | `acceptRiderRequestOffer` L167 | WebSocket `order_request_resolved` |
| Rider declines/expires | Rider/Timer | `resolveOffer` L321 | Next rider tried automatically |
| Rider updates status | Rider | `updateRiderJobStatus` L379 | `syncMarketplaceOrderStatus` L470 → DB update |
| Rider submits proof | Rider | `submitRiderProof` L519 | `syncMarketplaceOrderStatus` L627 → DELIVERED |
| Salesman updates status | Salesman | `updateOrderStatus` L410 | Socket.IO to customer + salesman L519–L535 |
| Customer cancels | Customer | `requestCancellation` L1089 | Socket.IO to admins |
| Admin approves cancel | Admin | `approveCancellation` L1213 | Socket.IO to customer + salesman |

---

## Key Design Decisions

> [!NOTE]
> **Two separate databases**: The main marketplace uses Prisma + PostgreSQL (`Order`, `OrderTracking`). The rider system uses a **separate Supabase database** (`rider_delivery_jobs`, `rider_delivery_request_offers`). `syncMarketplaceOrderStatus()` is the bridge between them.

> [!TIP]
> **Rider dispatch is automatic** — you don't need the salesman to manually assign a rider. The system picks the nearest online rider within 2km. If they decline or don't respond within 30 seconds, it moves to the next one.

> [!IMPORTANT]
> **Salesman CAN still update status manually** (via `PUT /api/orders/:id/status`) even when a rider is assigned. This lets them override or correct status if needed.

> [!NOTE]
> **Wallet funds are NOT released to the salesman until the order is DELIVERED** — either the salesman marks it delivered or the rider's proof triggers it via `syncMarketplaceOrderStatus`. This protects both the customer and the platform.
