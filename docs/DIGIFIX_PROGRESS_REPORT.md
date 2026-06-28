# Digifix — Project Progress Report

**Prepared for:** Digifix
**Project:** Digifix Car Parts Marketplace Platform
**Report Date:** 27 June 2026
**Status:** Active Development — Core platform operational

---

## 1. Executive Summary

This document outlines the progress completed to date on the **Digifix** platform — an
end-to-end online marketplace for automotive parts and accessories, complete with its own
delivery network.

The platform is built as a connected ecosystem of **four products** that share a single
backend:

1. **Customer Mobile App** — where customers browse, search, and buy car parts.
2. **Seller / Salesman tools** — for shops and salesmen to list products and manage sales.
3. **Rider (Delivery) Mobile App** — for delivery partners to accept and complete jobs.
4. **Web Admin & Management Dashboard** — for administrators and shop managers to oversee
   the whole operation.

All four are powered by a central backend API with a single secure database. The majority
of the core features are now built and functioning, and the platform is in the
testing-and-refinement stage.

> _[Image Placeholder 1.1 — Overall platform / system overview diagram]_

---

## 2. Platform Architecture (Completed)

We have established the full technical foundation that everything else is built on.

| Layer | Technology | Status |
|-------|-----------|--------|
| Customer & Rider Apps | React Native (Expo) — Android & iOS | ✅ Built |
| Web Dashboard | Next.js (React) | ✅ Built |
| Backend API | Node.js / Express | ✅ Built |
| Database | PostgreSQL (Supabase) with Prisma | ✅ Built |
| Payments | Stripe + In-app Wallet | ✅ Built |
| Authentication | Email/Password + Google Sign-In | ✅ Built |

**Key achievements:**

- A single shared backend serves all apps, so data stays consistent everywhere.
- Secure user accounts with multiple roles (Customer, Salesman, Shop Manager, Admin, Rider).
- Cloud-hosted database with proper indexing for fast search and scalability.

> _[Image Placeholder 2.1 — Architecture / tech-stack diagram]_

---

## 3. Customer Mobile App (Completed)

The customer-facing app allows shoppers to find and purchase car parts with a smooth,
modern experience.

**Completed features:**

- **Sign Up & Login** — email/password and Google sign-in, plus password reset via OTP.
- **Browse by Category** — products and parts organised into categories.
- **Product & Car Part Listings** — images, prices, discounts, stock, and ratings.
- **Vehicle Compatibility** — parts can be matched to specific car makes, models, and years.
- **Search** — find products and parts quickly.
- **Shopping Cart** — add, update, and remove items.
- **Wishlist** — save items for later.
- **Checkout** — place orders with delivery address selection.
- **Multiple Delivery Addresses** — save and manage addresses.
- **Order History & Tracking** — view past orders and their current status.
- **Reviews & Ratings** — rate and review purchased products and sellers.
- **Profile Management** — edit profile, view account details.
- **Help & Support / About Us** — in-app information pages.

> _[Image Placeholder 3.1 — Customer app: Home / category screen]_
>
> _[Image Placeholder 3.2 — Customer app: Product details screen]_
>
> _[Image Placeholder 3.3 — Customer app: Cart & checkout]_
>
> _[Image Placeholder 3.4 — Customer app: Order tracking / history]_

---

## 4. Seller / Salesman Tools (Completed)

Sellers and salesmen can run their store directly from the app.

**Completed features:**

- **Add Products** — create new product listings with images, pricing, and stock.
- **Add Car Parts** — list car parts linked to specific vehicles.
- **Manage Listings** — view and update existing products.
- **Order Management** — view and process incoming customer orders.
- **Seller Wallet** — track earnings from sales.
- **Seller Profile & Store** — manage store details.
- **Review Replies** — respond to customer reviews.
- **Approval Workflow** — new listings go through an approval status (Pending → Approved /
  Rejected) before going live.

> _[Image Placeholder 4.1 — Seller: Add product / car part screen]_
>
> _[Image Placeholder 4.2 — Seller: My products / listings]_
>
> _[Image Placeholder 4.3 — Seller: Orders & wallet]_

---

## 5. Rider (Delivery) Mobile App (Completed)

A dedicated app for delivery partners, fully integrated with the order system.

**Completed features:**

- **Rider Sign Up & Login** — with profile, vehicle details, and emergency contacts.
- **Availability Toggle** — riders go online/offline to receive jobs.
- **Available Jobs** — view nearby delivery jobs.
- **Smart Dispatch** — jobs are automatically offered to the closest available riders in
  real time, with offer expiry.
- **Accept / Reject Jobs** — riders choose which deliveries to take.
- **Active Delivery Flow** — step-by-step status: assigned → arrived at pickup → picked up
  → in transit → delivered.
- **Live Location Tracking** — rider location updates during delivery.
- **Proof of Delivery** — capture recipient name, signature, photo, and notes.
- **Job History** — completed deliveries record.
- **Rider Wallet** — track delivery earnings.
- **Performance Dashboard** — ratings, total deliveries, and statistics.

> _[Image Placeholder 5.1 — Rider app: Available jobs screen]_
>
> _[Image Placeholder 5.2 — Rider app: Active delivery / map tracking]_
>
> _[Image Placeholder 5.3 — Rider app: Proof of delivery]_
>
> _[Image Placeholder 5.4 — Rider app: Performance dashboard & wallet]_

---

## 6. Web Admin & Management Dashboard (Completed)

A web portal for administrators and shop managers to oversee the entire platform.

**Completed features:**

- **Admin Dashboard** — full overview of users, products, orders, and platform activity.
- **Shop Manager Dashboard** — managers oversee their team of salesmen, shared catalog,
  and wallet.
- **Salesman Web Access** — salesmen can also operate from the web.
- **Role Management** — assign and manage user roles.
- **Product / Listing Approvals** — review and approve or reject seller listings.
- **Review Moderation** — flagging system for low-rated reviews (ratings below 3 are
  highlighted for attention).
- **User Management** — activate, deactivate, or suspend accounts.

> _[Image Placeholder 6.1 — Admin dashboard overview]_
>
> _[Image Placeholder 6.2 — Manager dashboard]_
>
> _[Image Placeholder 6.3 — Listing approvals / review moderation]_

---

## 7. Payments & Wallet System (Completed)

A complete financial system underpins the marketplace.

**Completed features:**

- **In-App Wallet** — every user has a wallet with balance tracking.
- **Stripe Integration** — secure online card payments.
- **Cash on Delivery (COD)** — with a dedicated settlement-tracking system.
- **Transaction Ledger** — every payment, earning, fee, payout, and refund is recorded
  (deposits, purchases, sale earnings, platform fees, delivery fees, refunds, COD
  remittance).
- **Automated Splits** — order payments are distributed between sellers, riders, and the
  platform.
- **Refunds** — refund requests and settlement handling.

> _[Image Placeholder 7.1 — Wallet & transaction history]_
>
> _[Image Placeholder 7.2 — Checkout / payment screen]_

---

## 8. Order & Delivery Lifecycle (Completed)

Orders flow seamlessly from purchase to doorstep delivery.

**The complete journey now works end-to-end:**

1. Customer places an order and pays (online or COD).
2. Seller receives and confirms the order.
3. The order is automatically published as a delivery job.
4. Nearby riders are offered the job in real time.
5. A rider accepts, picks up, and delivers — with live tracking.
6. Proof of delivery is captured and the order is marked complete.
7. Earnings are settled to the seller and rider wallets.

> _[Image Placeholder 8.1 — Order lifecycle / flow diagram]_

---

## 9. Reviews, Ratings & Quality Control (Completed)

- Customers can review products, sellers, and delivery partners.
- Sellers can reply to reviews.
- Ratings feed into seller, product, and rider scores automatically.
- Low ratings are flagged for management review to maintain quality.

> _[Image Placeholder 9.1 — Reviews & ratings screen]_

---

## 10. Summary of Completed Modules

| # | Module | Status |
|---|--------|--------|
| 1 | Platform architecture & database | ✅ Complete |
| 2 | User accounts & multi-role system | ✅ Complete |
| 3 | Customer mobile app | ✅ Complete |
| 4 | Seller / salesman tools | ✅ Complete |
| 5 | Rider delivery app | ✅ Complete |
| 6 | Web admin & manager dashboard | ✅ Complete |
| 7 | Payments, wallet & Stripe | ✅ Complete |
| 8 | Order & delivery lifecycle | ✅ Complete |
| 9 | Reviews, ratings & moderation | ✅ Complete |
| 10 | Real-time rider dispatch & tracking | ✅ Complete |

---

## 11. Next Steps

The core platform is operational. Upcoming work focuses on:

- Final end-to-end testing across all apps.
- Performance tuning and bug fixes from testing feedback.
- Polishing the user interface and experience.
- Preparing for production launch (app store submission and deployment).

> _[Image Placeholder 11.1 — Roadmap / timeline (optional)]_

---

_This report reflects development progress as of 27 June 2026. Screenshots and images will
be inserted at the marked placeholders._

**— Digifix Development Team**
