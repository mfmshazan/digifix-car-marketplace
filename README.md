# 🚗 DigiFix — Car Spare Parts Marketplace

> A real-time digital marketplace that connects **customers, spare-part shops, salesmen, delivery riders, and admins** into one ecosystem — so finding the right car part no longer means calling around or driving shop to shop.

Built as a 2nd-year software engineering project at the **University of Moratuwa**, DigiFix spans **two Android apps and a full web platform** backed by a single Node.js API.

---

## ✨ What it does

Finding a car part usually means guesswork — will it even fit your vehicle? DigiFix turns that into **vehicle-aware search** (by type, brand, model, or number plate), real-time ordering, and live delivery tracking, with role-based dashboards for everyone in the supply chain.

---

## 📦 The three applications

DigiFix is one backend serving three front-ends. Each is built for a specific group of users, and together they cover the full journey of a spare part — from a customer's search to a rider handing it over at the door.

---

### 🛒 DigiFix Customer app (Android · React Native / Expo)

The main consumer app. It's **role-aware**, so the same app serves two very different users:

**For customers** — the shopping experience:
- **Vehicle-aware search** — find parts by vehicle **type → brand → model**, or straight from a **number plate**, so you only see parts that actually fit.
- **Browse & discover** — categories, featured products, recent searches, and history-based recommendations.
- **Cart & checkout** — add items, pick a delivery address (with a map pin), and pay by **card (Stripe)** or **wallet**.
- **Live delivery fee** — the delivery charge is calculated from the distance between each shop and the customer, and the vehicle needed to carry the parts.
- **Order tracking** — follow each order through its stages, with live rider location once it's out for delivery.
- **Wallet, wishlist, reviews** — top-up balance, save items, and rate what you buy.
- **Shop contact** — tap to call the shop directly from a product.

**For salesmen** — the same app doubles as a seller tool:
- A **seller dashboard** to view and fulfil orders placed with their shop.
- Advance an order's status step-by-step and dispatch a rider.
- **View-only catalog** — salesmen can't add or edit products (that's the manager's job), matching the web rules.

---

### 🏍️ DigiFix Rider app (Android · React Native / Expo)

The delivery partner app, built for people on the move:
- **Online/offline toggle** — go online to start receiving delivery jobs.
- **Real-time job dispatch** — new delivery requests arrive instantly via Socket.IO, with pickup, drop-off, distance, and pay.
- **Live GPS tracking** — the rider's location streams to the customer and the shop as they move.
- **Turn-by-turn route map** — navigate from the shop to the customer.
- **Delivery control** — step through the flow (accepted → at shop → picked up → in transit → delivered) with **proof of delivery**.
- **Earnings & performance dashboard** — track completed deliveries and income.
- **Offline support** — if signal drops mid-delivery, updates are **queued locally** and sync automatically once the connection returns.

---

### 💻 Web console (Next.js)

The management platform, with role-based dashboards:

**Shop Manager**
- Own the **product catalog** — add, edit, and delete products and car parts (with the required delivery-vehicle type).
- **Fulfil orders** — confirm, process, ship, and deliver, with the sequence enforced (no skipping steps).
- **Dispatch riders** — assign a delivery, with the rider's pay set to the order's delivery fee.
- **Sales history & finances**, store **reviews**, and a **manager → salesman** approval hierarchy.

**Admin (Master Control Panel)**
- **Platform overview** and KPIs.
- **User management** across all roles.
- **System finances** and a **platform wallet** (internal ledger + live Stripe balance).
- **Catalog moderation** (approve/reject shop listings).
- **Review moderation** and **receipt reviews**.

---

## 🔄 How it all works together

A typical order flows across all three apps in real time:

1. **Customer** searches by number plate → adds parts to the cart → sees the live delivery fee → checks out and pays.
2. The **backend** splits the order per shop, records it, decrements stock, and notifies the shop.
3. **Manager / Salesman** confirms and processes the order, then **dispatches a rider**.
4. **Rider** accepts the job, navigates to the shop, picks up, and delivers — streaming live GPS the whole way.
5. **Customer** watches the rider approach on their tracking screen; the **shop** sees pickup progress.
6. On delivery, funds are released to the shop's wallet, and the customer can leave a **review** — or raise a **refund request** if something's wrong.

Every status change and rider movement is pushed live over **Socket.IO** and as an **OneSignal** notification, so all parties stay in sync — even when the rider briefly loses signal.

---

## ⚙️ Tech stack

| Layer | Tech |
|-------|------|
| Mobile | React Native (Expo), Expo Router |
| Web | Next.js (App Router), TanStack Query, Tailwind CSS |
| Backend | Node.js / Express |
| Realtime | Socket.IO (live dispatch + tracking) |
| Database | PostgreSQL + Prisma ORM |
| Payments | Stripe |
| Auth | Clerk + Google OAuth, JWT |
| Notifications | OneSignal (push) |
| Infra | Docker, Coolify |

---

## 🗂️ Monorepo structure

```
digifix/
├── backend/        # Node.js/Express API + Prisma (24 API modules, 5 roles)
├── apps/
│   ├── web/        # Next.js admin + manager console
│   ├── mobile/     # Customer + Salesman Android app (Expo)
│   └── rider/      # Rider/delivery Android app (Expo)
└── docker-compose.yml
```

Each app has its **own** `package.json` and dependencies (install per app).

---

## 🚀 Getting started

### Prerequisites
- **Node.js 20+** (backend) / **Node 22** (mobile builds)
- **Expo Go** app on an Android phone (for mobile/rider dev)
- A **PostgreSQL** database (e.g. Supabase)

### 1. Clone
```bash
git clone <repo-url>
cd digifix
```

### 2. Environment variables
Each app reads its own `.env`. Copy the examples and fill in your own values:
```bash
cp backend/.env.example backend/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
# apps/rider/.env — see EXPO_PUBLIC_* keys below
```
> ⚠️ **Never commit real secrets.** All `.env` files are gitignored. Backend needs `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, Stripe/Clerk/OneSignal keys. The apps only use `EXPO_PUBLIC_*` / `NEXT_PUBLIC_*` (public) keys.

### 3. Backend
```bash
cd backend
npm install
npx prisma generate
npm run dev            # http://localhost:3000
```

### 4. Web console
```bash
cd apps/web
npm install
npm run dev            # http://localhost:3001
```

### 5. Mobile & Rider (Expo Go)
```bash
cd apps/mobile         # (and apps/rider)
npm install
npm start              # scan the QR with Expo Go
```
Point each app's `EXPO_PUBLIC_API_URL` at your backend (your PC's LAN IP for local, or the deployed URL). The apps talk to the backend API — they never connect to the database directly.

---

## 🧩 The interesting problem

Keeping data in sync **live across three platforms**: when a rider moves, their GPS streams to the customer's tracking screen and the shop at the same time — and still works when the rider loses signal. Solved with **Socket.IO real-time dispatch** plus an **offline queue** in the rider app that syncs the moment connectivity returns.

---

## 👥 Roles

`CUSTOMER` · `SALESMAN` · `SHOP_MANAGER` · `RIDER` · `ADMIN`

Managers own the catalog and approve salesmen; salesmen fulfil orders; riders deliver; admins moderate the platform and handle finances.

---

## 🙏 Acknowledgements

Built by a five-person team for **DigiFix**, under the guidance of **Ms. A. Pirapaharan** and the **Faculty of Information Technology, University of Moratuwa**.

---

## 📄 License

This is client work for DigiFix. Please contact the maintainers before reuse or distribution.
