# Digifix — Authentication Module Report

**Prepared for:** Digifix
**Project:** Digifix Car Parts Marketplace Platform
**Module:** Authentication & Account Security
**Report Date:** 28 June 2026
**Status:** ✅ Completed

---

## 1. Overview

Authentication is the secure front door to the entire Digifix platform. Because all four
products — the Customer app, the Rider app, the Seller tools, and the Web Admin dashboard —
share a single backend, the authentication module is responsible for proving *who* a user
is and *what* they are allowed to do, consistently across every app.

This module is **complete and operational**. It supports multiple sign-in methods, multiple
user roles, secure password handling, and a full self-service password recovery flow.

> _[Image Placeholder 1.1 — Sign-in / Sign-up screens across apps]_

---

## 2. Sign-In Methods (Completed)

| Method | Where it's used | Status |
|--------|-----------------|--------|
| Email & Password | All apps | ✅ Built |
| Google Sign-In | Customer & Seller (via Clerk) | ✅ Built |
| Password Reset via Email OTP | All apps | ✅ Built |

**Highlights:**

- **Email/Password** — the standard sign-up and login for every user type.
- **Google Sign-In** — one-tap sign-in using a Google account, working on both mobile
  (Expo) and web, with the identity securely verified on the backend.
- **OTP Password Reset** — users who forget their password receive a one-time code by email
  to safely set a new one.

> _[Image Placeholder 2.1 — Google sign-in flow]_

---

## 3. User Roles & Access Control (Completed)

Every account is assigned a **role** that controls what the user can see and do. Roles are
enforced on the backend, so permissions cannot be bypassed from the app.

| Role | Purpose | Access |
|------|---------|--------|
| Customer | Shop and buy parts | Mobile app only |
| Salesman | Operate a store under a manager | Mobile & web |
| Shop Manager | Owns the store, catalog & wallet; manages salesmen | Web only |
| Admin | Oversees the whole platform | Web only |
| Delivery Partner (Rider) | Accept and complete deliveries | Rider app |

**Access rules enforced at login:**

- **Admins** can only register and log in from the web application.
- **Shop Managers** are web-only.
- **Customers** must use the mobile app (blocked from the web dashboard).
- A maximum of **3 Admin accounts** can exist on the platform.

> _[Image Placeholder 3.1 — Role-based dashboards]_

---

## 4. Account Registration (Completed)

When a new account is created, the system does much more than store a username and password
— it sets up everything that role needs to start working immediately.

**What happens on registration:**

- **Input validation** — email and password are required and checked.
- **Strong password policy** — minimum 8 characters with at least one uppercase letter,
  one lowercase letter, one number, and one symbol.
- **Duplicate protection** — prevents two accounts from sharing the same email.
- **Secure password storage** — passwords are hashed (never stored as plain text).
- **Automatic setup by role:**
  - *Shop Manager* — gets their own store, catalog, wallet, and a Stripe payout account.
  - *Salesman under a manager* — added as staff (no separate store or wallet).
  - *Rider* — registered with vehicle details and synced into the central user directory.
- **Instant access** — a secure session token is issued so the user is logged in right away.

> _[Image Placeholder 4.1 — Registration screen & password rules]_

---

## 5. Password Recovery — Forgot Password (Completed)

A complete, secure, self-service flow lets users recover access without contacting support.

**The three-step flow:**

1. **Request a code** — the user enters their email and receives a **6-digit OTP** by email
   (valid for 10 minutes).
2. **Verify the code** — the user enters the OTP; once verified, a short-lived (15-minute)
   secure reset token is issued.
3. **Set a new password** — the new password is validated against the strong-password policy
   and saved securely.

**Security measures built in:**

- OTP codes are **hashed** in the database and can only be used once.
- The system **does not reveal** whether an email is registered (prevents account probing).
- Codes and reset tokens **expire automatically**.
- **Rate limiting** in production blocks repeated abuse (limited OTP requests, verification
  attempts, and reset attempts per time window).

> _[Image Placeholder 5.1 — Forgot password: request OTP]_
>
> _[Image Placeholder 5.2 — Enter OTP & set new password]_

---

## 6. Session & Token Security (Completed)

Once signed in, users stay securely authenticated as they move through the app.

**Completed features:**

- **JWT session tokens** — every login issues a signed token used to authorise requests.
- **Bearer-token protection** — protected routes (e.g. profile) require a valid token.
- **Rider refresh tokens** — riders get an access token plus a refresh token, so their
  session can be renewed without re-entering credentials; tokens can be revoked on logout.
- **Role embedded in token** — the backend reads the user's role from the verified token to
  enforce permissions on every request.
- **Cross-table identity sync** — riders are synced into the central user directory so a
  single identity works across reviews, dashboards, and all shared features.

> _[Image Placeholder 6.1 — Authenticated session / profile screen]_

---

## 7. Profile Management (Completed)

- **View profile** — securely fetch account details (name, email, phone, avatar, role,
  verification status, plus order/wishlist/address counts).
- **Update profile** — edit name, phone, and avatar.
- **Resilient design** — the profile screen still works gracefully even if optional data is
  unavailable.

> _[Image Placeholder 7.1 — Profile view & edit]_

---

## 8. Summary of Authentication Capabilities

| # | Capability | Status |
|---|------------|--------|
| 1 | Email/password registration & login | ✅ Complete |
| 2 | Google Sign-In (mobile & web) | ✅ Complete |
| 3 | Multi-role accounts & access rules | ✅ Complete |
| 4 | Strong password policy & secure hashing | ✅ Complete |
| 5 | Forgot-password OTP recovery flow | ✅ Complete |
| 6 | JWT sessions & rider refresh tokens | ✅ Complete |
| 7 | Rate limiting & anti-abuse protections | ✅ Complete |
| 8 | Profile view & update | ✅ Complete |

---

_This report covers the authentication module as of 28 June 2026. Screenshots will be
inserted at the marked placeholders._

**— Digifix Development Team**
