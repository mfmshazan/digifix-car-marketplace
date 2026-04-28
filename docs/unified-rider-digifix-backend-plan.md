# Unified Rider + Digifix Backend Plan

Target backend: `digifix-car-marketplace/backend`

Source backend to rebuild: `Rider-App/backend`

Goal: one Express backend, one Supabase Postgres database, two unchanged frontends.

## Executive Architecture

The Digifix backend remains the only deployed API server. Rider backend behavior is rebuilt inside it as new ES module routes, controllers, services, and database tables. The old Rider backend runtime is treated as a behavioral reference only.

Recommended backend layout:

```text
backend/src/
  index.js
  routes/
    auth.routes.js              # Existing Digifix auth, with Rider-compatible dispatch
    riderPartner.routes.js      # Mounted at /api/partner
    riderJobs.routes.js         # Mounted at /api/jobs
    riderAdmin.routes.js        # Mounted under /api/admin without breaking existing admin routes
  controllers/
    riderAuth.controller.js
    riderPartner.controller.js
    riderJobs.controller.js
    riderAdmin.controller.js
  services/
    riderRealtimeDispatch.js
    riderDeliveryJobFactory.js
  middleware/
    riderAuth.middleware.js
  lib/
    prisma.js
    riderTokens.js
```

Runtime compatibility is achieved by adapting Rider code to Digifix's existing Node/ESM stack, Prisma client, `bcryptjs`, `jsonwebtoken`, and the existing HTTP server. Do not import or run the CommonJS Rider backend directly.

## Supabase Schema

Use namespaced Rider tables so marketplace tables stay stable:

| Rider source table | Supabase unified table | Purpose |
| --- | --- | --- |
| `delivery_partners` | `rider_delivery_partners` | Rider accounts, status, location, earnings counters |
| `refresh_tokens` | `rider_refresh_tokens` | Rider refresh token persistence |
| `delivery_jobs` | `rider_delivery_jobs` | Delivery assignments and lifecycle |
| `job_status_logs` | `rider_job_status_logs` | Delivery audit trail |
| `job_tracking` | `rider_job_tracking` | GPS breadcrumbs |
| `proof_of_delivery` | `rider_proof_of_delivery` | Photo/signature/recipient proof |
| `delivery_request_offers` | `rider_delivery_request_offers` | Realtime dispatch offer window |

The SQL artifact is in `backend/supabase/rider_delivery_schema.sql`.

Relationship strategy:

| Relationship | Implementation |
| --- | --- |
| Rider partner to delivery jobs | `rider_delivery_jobs.partner_id -> rider_delivery_partners.id` |
| Rider job to marketplace order | nullable `rider_delivery_jobs.marketplace_order_id -> "Order"(id)` |
| Pickup shop/salesman | stored denormalized in pickup fields for Rider API compatibility; optionally derive from `Order.salesmanId` |
| Dropoff customer | stored denormalized in customer/dropoff fields for Rider API compatibility; optionally derive from `Order.customerId` and `Address` |
| Marketplace order status | sync selected delivery states into existing `Order.status` enum where business rules allow |

Keep denormalized Rider job fields even when linked to marketplace orders. The Rider app expects `order_number`, `customer_name`, `pickup_address`, `pickup_latitude`, and similar snake_case fields directly.

## API Compatibility

Existing Digifix APIs must remain unchanged:

```text
/api/auth/register
/api/auth/login
/api/auth/profile
/api/users/*
/api/products/*
/api/categories/*
/api/orders/*
/api/car-parts/*
/api/cart/*
/api/admin/*
/api/wishlist/*
```

Rider APIs must also remain unchanged:

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/partner/profile
PUT    /api/partner/profile
PUT    /api/partner/push-token
DELETE /api/partner/profile
PUT    /api/partner/status
PUT    /api/partner/location
GET    /api/jobs/available
GET    /api/jobs/active
GET    /api/jobs/assigned
GET    /api/jobs/history
POST   /api/jobs/request-offers/:offerId/accept
POST   /api/jobs/request-offers/:offerId/decline
POST   /api/jobs/request-offers/:offerId/expire
POST   /api/jobs/:id/accept
POST   /api/jobs/:id/reject
PUT    /api/jobs/:id/status
POST   /api/jobs/:id/location
POST   /api/jobs/:id/proof
POST   /api/admin/jobs
GET    /api/admin/jobs
GET    /api/admin/partners
GET    /api/admin/jobs/:id/tracking
GET    /ws?token=<riderAccessToken>
```

### Auth Collision Strategy

Both apps use `/api/auth/register` and `/api/auth/login`. Preserve the path and dispatch internally.

Register dispatch:

| Request shape | Handler |
| --- | --- |
| body has `fullName`, `vehicleType`, or `vehicleNumber` | Rider registration |
| body has Digifix `name`/`role`, or no Rider-only fields | Existing Digifix registration |

Login dispatch:

1. Try existing Digifix user by email.
2. If found, keep current Digifix response: `{ data: { user, token } }`.
3. If not found, try `rider_delivery_partners`.
4. If found, return Rider response: `{ data: { partner, accessToken, refreshToken } }`.

This avoids frontend changes while preventing customer/salesman logins from accidentally receiving Rider token shapes.

Token strategy:

| Token | Payload | Secret |
| --- | --- | --- |
| Digifix token | `{ userId, role }` | existing `JWT_SECRET` |
| Rider access token | `{ id, email, type: "rider" }` | `JWT_ACCESS_SECRET` |
| Rider refresh token | `{ id, email, type: "rider" }` | `JWT_REFRESH_SECRET` |

Rider middleware must verify `JWT_ACCESS_SECRET` and set `req.user.id`. Existing Digifix middleware must remain untouched.

## Delivery Job Creation From Marketplace Orders

The marketplace currently creates `Order` records but does not create Rider jobs. Add an internal service after order creation:

```text
createOrder()
  -> create Digifix Order records
  -> for each order that needs delivery:
       riderDeliveryJobFactory.createFromMarketplaceOrder(order.id)
       riderRealtimeDispatch.dispatchJobToNextEligibleDriver(job.id)
  -> return the existing Digifix response unchanged
```

No frontend response fields should be added unless they are ignored-safe. The safest first version is to keep the existing response exactly as-is.

Mapping:

| Marketplace source | Rider job field |
| --- | --- |
| `Order.orderNumber` | `order_number` |
| `Order.id` | `marketplace_order_id` |
| `Order.customer.name` | `customer_name` |
| `Order.customer.phone` | `customer_phone` |
| seller `Store.address` or salesman address | `pickup_address` |
| shop coordinates, if later added | `pickup_latitude`, `pickup_longitude` |
| `Address` | `dropoff_address` |
| address coordinates, if later added | `dropoff_latitude`, `dropoff_longitude` |
| order item names and quantities | `items_description` |
| `Order.deliveryFee` or configured fallback | `payment_amount` |
| `Order.notes` | `special_instructions` |

Current blocker: Digifix `Address` and `Store` models do not include latitude/longitude. Since Rider job creation requires coordinates, add nullable coordinate columns to address/store or configure safe defaults per shop during migration. Do not fake production coordinates silently.

## Realtime Compatibility

Rider uses raw WebSocket on `/ws?token=...`; Digifix already uses Socket.io for marketplace events. Run both on the same HTTP server:

```text
const httpServer = createServer(app)
const io = new Server(httpServer, ...)
initializeRiderRealtimeDispatch(httpServer)
```

Keep Socket.io paths/events for Digifix unchanged. Add the Rider `ws` server at `/ws`.

Rider WebSocket message types to preserve:

```text
realtime_connected
incoming_order_request
order_request_resolved
```

## Status Mapping

Rider delivery status stays lowercase in Rider tables and API responses. Marketplace order status stays uppercase Prisma enum.

| Rider status | Marketplace status |
| --- | --- |
| `available` | `AVAILABLE` or leave marketplace order `PENDING` until assigned |
| `assigned` | `ASSIGNED` |
| `accepted` | `ACCEPTED` |
| `arrived_at_pickup` | `ARRIVED_AT_PICKUP` |
| `picked_up` | `PICKED_UP` |
| `in_transit` | `IN_TRANSIT` |
| `arrived_at_dropoff` | `ARRIVED_AT_DROPOFF` |
| `delivered` | `DELIVERED` |
| `failed` | `FAILED` |
| `cancelled` | `CANCELLED` |

Write an order tracking row whenever a Rider job changes a linked marketplace order status.

## Implementation Steps

1. Add Supabase schema.
   Apply `backend/supabase/rider_delivery_schema.sql` to Supabase, or convert it to a Prisma migration if Prisma remains the only migration path.

2. Add Prisma models.
   Mirror the namespaced tables with `@@map("rider_*")`, keep snake_case column maps, then run `npx prisma generate`.

3. Add Rider token utilities.
   Implement `riderTokens.js` with the old access/refresh expiry semantics.

4. Add Rider auth controller.
   Rebuild register/login/refresh/logout using Prisma and `bcryptjs`, preserving response JSON exactly.

5. Adapt `/api/auth` dispatch.
   Route Rider-shaped registration to Rider auth. Login should try Digifix first, then Rider.

6. Add Rider protected routes.
   Mount `/api/partner` and `/api/jobs` with Rider auth middleware. Keep response field names snake_case.

7. Add Rider admin compatibility under `/api/admin`.
   Existing Digifix admin routes already use `/api/admin`; add Rider admin endpoints carefully so route paths do not shadow existing Digifix admin behavior. `POST /api/admin/jobs`, `GET /api/admin/jobs`, `GET /api/admin/partners`, and `GET /api/admin/jobs/:id/tracking` use `x-api-key`.

8. Port realtime dispatch.
   Convert `services/realtimeDispatch.js` from CommonJS/pg to ESM/Prisma transactions plus the `ws` package. Preserve nearest-driver selection, offer timers, and response windows.

9. Integrate marketplace order creation.
   After Digifix order creation, create one Rider job per seller order if delivery data is complete. If coordinates are missing, mark the order as needing delivery setup rather than returning bad Rider jobs.

10. Backfill data.
    Move existing Rider local Postgres rows into namespaced Supabase tables. Preserve integer IDs if the Rider app has local references to job IDs.

11. Run compatibility tests.
    Execute Rider app flows against the Digifix backend URL without changing any app code. Then run existing Digifix mobile/web order/auth flows.

12. Cut over.
    Point deployment DNS/IP to the unified backend. Keep old Rider DB read-only until the new backend has processed real deliveries successfully.

## Migration Procedure

1. Freeze Rider writes for the migration window.
2. Export Rider local Postgres:

```bash
pg_dump --data-only --column-inserts --table=delivery_partners --table=refresh_tokens --table=delivery_jobs --table=job_status_logs --table=job_tracking --table=proof_of_delivery --table=delivery_request_offers rider_db > rider_data.sql
```

3. Transform table names to `rider_*`.
4. Apply schema to Supabase.
5. Import transformed data into Supabase.
6. Reset sequences:

```sql
SELECT setval(pg_get_serial_sequence('rider_delivery_partners','id'), COALESCE(MAX(id), 1)) FROM rider_delivery_partners;
SELECT setval(pg_get_serial_sequence('rider_delivery_jobs','id'), COALESCE(MAX(id), 1)) FROM rider_delivery_jobs;
SELECT setval(pg_get_serial_sequence('rider_refresh_tokens','id'), COALESCE(MAX(id), 1)) FROM rider_refresh_tokens;
SELECT setval(pg_get_serial_sequence('rider_job_status_logs','id'), COALESCE(MAX(id), 1)) FROM rider_job_status_logs;
SELECT setval(pg_get_serial_sequence('rider_job_tracking','id'), COALESCE(MAX(id), 1)) FROM rider_job_tracking;
SELECT setval(pg_get_serial_sequence('rider_proof_of_delivery','id'), COALESCE(MAX(id), 1)) FROM rider_proof_of_delivery;
SELECT setval(pg_get_serial_sequence('rider_delivery_request_offers','id'), COALESCE(MAX(id), 1)) FROM rider_delivery_request_offers;
```

7. Validate row counts against local Postgres.
8. Start unified backend.
9. Log into Rider app with an existing rider and verify profile, status, location, assigned jobs, proof upload, and realtime offers.
10. Place a Digifix order and verify customer/salesman/admin flows still work.

## Risk Analysis

| Risk | Impact | Mitigation |
| --- | --- | --- |
| `/api/auth/login` collision | One app receives the wrong response shape | Dispatch by existing Digifix user first, Rider second; preserve exact JSON |
| Different token payloads | Authenticated Rider routes fail | Use separate Rider middleware and secrets |
| Missing pickup/dropoff coordinates in Digifix | Cannot create valid Rider jobs | Add coordinate fields or shop configuration before auto-dispatch |
| Existing `/api/admin` route collision | Admin dashboard or Rider testing endpoints break | Add exact Rider admin endpoints without replacing existing router |
| Prisma enum casing vs Rider lowercase statuses | Invalid status writes | Keep Rider statuses as text/check constraints in Rider tables; map only when syncing to `Order` |
| Realtime protocol mismatch | Rider app misses incoming requests | Keep raw `ws` `/ws` alongside Socket.io |
| Supabase connection pooling | Long transactions or timers fail under PgBouncer | Use `DIRECT_URL` for migrations and Prisma transactions; keep `DATABASE_URL` pooler-compatible |
| Sequence/id changes | Rider cached job IDs fail | Preserve integer IDs during import and reset sequences |
| Silent behavior drift | Apps appear functional but edge cases fail | Add contract tests from Rider API docs and run both app smoke tests |

## Acceptance Checklist

- Rider app logs in without frontend changes.
- Rider app receives `{ partner, accessToken, refreshToken }`.
- Digifix app still receives `{ user, token }`.
- Rider `/api/partner/*` endpoints work with Rider tokens only.
- Rider `/api/jobs/*` endpoints return the same snake_case response fields.
- Digifix `/api/orders/*` endpoints keep existing response shapes.
- New marketplace orders create Rider jobs only when complete delivery data exists.
- Rider `/ws` realtime requests work.
- Existing Socket.io marketplace events still work.
- All Rider data is in Supabase, not local Postgres.

