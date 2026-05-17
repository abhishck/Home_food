# 🍽️ HomeFood Backend

> **Hyper-local homemade food delivery marketplace** — production-ready Node.js + Express + MongoDB REST API.

---

## ✨ Features

| Category | Details |
|----------|---------|
| **Auth** | JWT access + refresh tokens, bcrypt, forgot/reset password, role-based access |
| **Roles** | `customer`, `cook`, `admin` — each with isolated permissions |
| **Cook System** | Profile, kitchen images, specialties, availability toggle, verification flow |
| **Cook Verification** | `pending → approved / rejected / suspended` — admin-controlled |
| **Menu CRUD** | Full item management with images (Cloudinary), veg/non-veg, categories |
| **Location** | MongoDB geospatial index, nearby kitchen search by lat/lng + radius |
| **Orders** | Full lifecycle `placed → accepted → preparing → out_for_delivery → delivered → cancelled` |
| **Payments** | Razorpay integration — create order, verify HMAC signature, auto-refund on cancel |
| **Reviews** | Verified-purchase-only reviews with cook reply support |
| **Notifications** | Persistent DB notifications with unread count |
| **Admin** | Dashboard stats, user/cook/order/payment management |
| **Uploads** | Multer + Cloudinary for profile, kitchen, food & verification docs |
| **Security** | Helmet, CORS, rate limiting, mongo-sanitize, XSS-clean, centralized error handler |
| **Logging** | Winston + Morgan with rotating log files |

---

## 🏗️ Project Structure

```
homefood-backend/
├── server.js                    # Entry point — HTTP server + graceful shutdown
├── .env.example                 # Environment variable template
├── .gitignore
├── package.json
└── src/
    ├── app.js                   # Express app factory (middleware, routes, error handler)
    ├── config/
    │   ├── index.js             # Centralised env config
    │   ├── cloudinary.js        # Cloudinary SDK init
    │   └── razorpay.js          # Razorpay SDK init
    ├── constants/
    │   └── index.js             # ROLES, ORDER_STATUS, COOK_STATUS, etc.
    ├── database/
    │   └── connect.js           # Mongoose connect with retry logic
    ├── models/
    │   ├── User.model.js
    │   ├── CookProfile.model.js
    │   ├── Menu.model.js
    │   ├── Order.model.js
    │   ├── Payment.model.js
    │   ├── Review.model.js
    │   └── Notification.model.js
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── user.controller.js
    │   ├── cook.controller.js
    │   ├── menu.controller.js
    │   ├── order.controller.js
    │   ├── payment.controller.js
    │   ├── review.controller.js
    │   ├── notification.controller.js
    │   └── admin.controller.js
    ├── routes/
    │   ├── index.js             # Aggregator
    │   ├── auth.routes.js
    │   ├── user.routes.js
    │   ├── cook.routes.js
    │   ├── menu.routes.js
    │   ├── order.routes.js
    │   ├── payment.routes.js
    │   ├── review.routes.js
    │   ├── notification.routes.js
    │   └── admin.routes.js
    ├── middleware/
    │   ├── auth.middleware.js   # authenticate, authorize, optionalAuth, requireApprovedCook
    │   ├── error.middleware.js  # Centralized error handler
    │   ├── logger.middleware.js # Morgan → Winston stream
    │   └── validate.middleware.js # Joi schema validator factory
    ├── services/
    │   ├── notification.service.js
    │   └── payment.service.js
    ├── utils/
    │   ├── ApiError.js          # Custom error class with static factory methods
    │   ├── ApiResponse.js       # Standardised JSON response
    │   ├── asyncHandler.js      # try/catch wrapper for controllers
    │   ├── crypto.js            # Reset token generation/hashing
    │   ├── email.js             # Nodemailer + email templates
    │   ├── logger.js            # Winston logger
    │   ├── paginate.js          # Reusable pagination utility
    │   ├── token.js             # JWT generate/verify helpers
    │   └── upload.js            # Multer + Cloudinary storage builders
    ├── validators/
    │   ├── auth.validator.js
    │   ├── cook.validator.js
    │   ├── menu.validator.js
    │   ├── order.validator.js
    │   └── review.validator.js
    ├── helpers/
    │   ├── orderHelpers.js      # Status transitions, pricing calculator
    │   ├── cookHelpers.js       # Permission checks, daily reset
    │   ├── geoHelpers.js        # Haversine, nearSphere filter builder
    │   └── responseHelpers.js   # cleanObject, buildUpdatePayload, etc.
    ├── docs/
    │   ├── API_DOCS.md          # Full API reference
    │   └── postman_collection.json
    └── uploads/                 # Temp storage (Cloudinary is primary)
```

---

## 🚀 Quick Start

### 1. Prerequisites

- Node.js ≥ 18.x
- MongoDB (local or Atlas)
- Cloudinary account
- Razorpay account (test keys work)
- Gmail app password (or any SMTP)

### 2. Clone & install

```bash
git clone https://github.com/yourorg/homefood-backend.git
cd homefood-backend
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Fill in every variable in .env
```

**Minimum required for development:**

```env
MONGODB_URI=mongodb://localhost:27017/homefood
JWT_SECRET=a_long_random_secret_at_least_32_chars
JWT_REFRESH_SECRET=another_long_random_secret_32_chars
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
RAZORPAY_KEY_ID=rzp_test_XXXX
RAZORPAY_KEY_SECRET=your_secret
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
```

### 4. Start development server

```bash
npm run dev
```

The server starts at `http://localhost:5000`.  
API base: `http://localhost:5000/api/v1`

### 5. Health check

```bash
curl http://localhost:5000/api/v1/health
```

---

## 👤 Creating an Admin User

There is no public register endpoint for admins. Insert one directly:

```js
// run once via Node REPL or a seed script
import mongoose from 'mongoose';
import User from './src/models/User.model.js';

await mongoose.connect('mongodb://localhost:27017/homefood');
await User.create({
  name: 'Super Admin',
  email: 'admin@homefood.app',
  password: 'AdminPassword@123',   // will be hashed by pre-save hook
  role: 'admin',
});
```

---

## 🔑 Authentication Guide

```
Register / Login → { accessToken (15m), refreshToken (7d) }

Every request:  Authorization: Bearer <accessToken>

Token expired?  POST /auth/refresh-token  { refreshToken }
                → new { accessToken, refreshToken }

Logout:         POST /auth/logout  (invalidates refreshToken in DB)
```

---

## 📦 Order Lifecycle

```
Customer                     Cook                    Admin
   │                           │                       │
   ├─ POST /orders ────────────► (notification)        │
   │     status: placed        │                       │
   │                           ├─ PATCH status:accepted│
   │                           ├─ PATCH status:preparing
   │                           ├─ PATCH status:out_for_delivery
   │                           └─ PATCH status:delivered
   │
   ├─ POST /orders/:id/cancel (only in placed|accepted)
```

---

## 💳 Payment Flow

```
1. Customer places order       → POST /orders
2. Customer initiates payment  → POST /payments/create-order
                                 ← { razorpayOrderId, amount, keyId }
3. Frontend opens Razorpay SDK with above data
4. User pays → Razorpay SDK returns { orderId, paymentId, signature }
5. Frontend sends to backend   → POST /payments/verify
6. Backend verifies HMAC       → order.paymentStatus = "paid"
7. On order cancel (if paid)   → refund auto-initiated
```

---

## 🍳 Cook Onboarding Flow

```
1. Register with role: "cook"
2. POST /cooks/profile              → status: pending
3. POST /cooks/verification-docs    → upload Aadhaar / FSSAI
4. Admin reviews: PATCH /admin/cooks/:id/verify  { status: "approved" }
5. Cook receives email + notification
6. PATCH /cooks/availability        → toggle isAvailable
7. POST /menu                       → create menu items
8. Orders start coming in!
```

---

## 🛡️ Security

| Layer | Implementation |
|-------|---------------|
| Headers | `helmet` |
| CORS | Whitelist-based, credentials: true |
| Rate limiting | 100 req/15min global, 20 req/15min on auth |
| NoSQL injection | `express-mongo-sanitize` |
| XSS | `xss-clean` |
| Input validation | Joi schemas on every route |
| Password | bcrypt with 12 salt rounds |
| Tokens | Short-lived JWT access + rotating refresh tokens |
| File uploads | Type + size validation before Cloudinary upload |
| Errors | Centralized handler — no stack leaks in production |

---

## 📊 Pagination

All list endpoints accept:

| Param | Default | Max |
|-------|---------|-----|
| `page` | 1 | — |
| `limit` | 20 | 100 |
| `sort` | `-createdAt` | — |

Response always includes `meta.total`, `meta.totalPages`, `meta.hasNextPage`, `meta.hasPrevPage`.

---

## 🗂️ API Docs & Postman

- Full API reference: [`src/docs/API_DOCS.md`](src/docs/API_DOCS.md)
- Postman collection: [`src/docs/postman_collection.json`](src/docs/postman_collection.json)

**Import into Postman:**
1. Open Postman → Import
2. Select `src/docs/postman_collection.json`
3. Set `base_url` collection variable if needed
4. Run "Login" → tokens auto-populate

---

## 🔮 Future Roadmap

- [ ] **Coupons** — `Coupon` model, apply discount at order creation
- [ ] **Subscriptions** — weekly/monthly meal plan model
- [ ] **Delivery agents** — `delivery_agent` role + `DeliveryAssignment` model
- [ ] **Real-time tracking** — Socket.IO rooms per order
- [ ] **Push notifications** — FCM via `NotificationService`
- [ ] **Analytics dashboard** — time-series aggregation
- [ ] **Webhook support** — Razorpay webhook endpoint
- [ ] **Multi-image reviews** — S3/Cloudinary review photos

---

## 📜 License

MIT © HomeFood Dev Team
