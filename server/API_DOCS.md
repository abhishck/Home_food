# HomeFood API Documentation
**Version:** 1.0.0  
**Base URL:** `http://localhost:5000/api/v1`  
**Auth:** Bearer JWT in `Authorization: Bearer <token>` header (or `accessToken` cookie)

---

## Auth Flow

```
1. POST /auth/register  → returns { accessToken, refreshToken, user }
2. POST /auth/login     → returns { accessToken, refreshToken, user }
3. GET  /auth/me        → returns current user (requires accessToken)
4. POST /auth/refresh-token → send refreshToken → returns new accessToken + refreshToken
5. POST /auth/logout    → clears tokens
```

Tokens:
- `accessToken` — short-lived (15 min), used in every protected request
- `refreshToken` — long-lived (7 days), used only to get new access token

---

## 🔐 Auth Endpoints

### POST `/auth/register`
**Auth:** None

**Request Body:**
```json
{
  "name": "Ravi Kumar",
  "email": "ravi@example.com",
  "phone": "9876543210",
  "password": "Password@123",
  "role": "customer"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { "_id": "...", "name": "Ravi Kumar", "email": "ravi@example.com", "role": "customer" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Errors:**
- `409` — Email already registered

---

### POST `/auth/login`
**Auth:** None

**Request Body:**
```json
{ "email": "ravi@example.com", "password": "Password@123" }
```

**Response 200:**
```json
{
  "success": true,
  "data": { "user": {...}, "accessToken": "eyJ...", "refreshToken": "eyJ..." }
}
```

**Errors:**
- `401` — Invalid email or password
- `403` — Account deactivated

---

### POST `/auth/logout`
**Auth:** Required

**Response 200:**
```json
{ "success": true, "message": "Logged out successfully", "data": null }
```

---

### POST `/auth/refresh-token`
**Auth:** None

**Request Body:**
```json
{ "refreshToken": "eyJ..." }
```

**Response 200:** New `accessToken` + `refreshToken`

**Errors:**
- `401` — Token invalid, expired, or reuse detected

---

### POST `/auth/forgot-password`
**Auth:** None | Rate-limited

**Request Body:**
```json
{ "email": "ravi@example.com" }
```

**Response 200:** Always returns success (prevents email enumeration).  
A reset link is sent to the email valid for **15 minutes**.

---

### PATCH `/auth/reset-password/:token`
**Auth:** None

**Request Body:**
```json
{
  "password": "NewPassword@123",
  "confirmPassword": "NewPassword@123"
}
```

**Errors:**
- `400` — Token expired or invalid

---

### PATCH `/auth/change-password`
**Auth:** Required

**Request Body:**
```json
{
  "currentPassword": "OldPassword@123",
  "newPassword": "NewPassword@456",
  "confirmPassword": "NewPassword@456"
}
```

---

### GET `/auth/me`
**Auth:** Required  
**Response 200:** Full user profile including cookProfile (if applicable).

---

## 👤 User Endpoints

### GET `/users/profile`
**Auth:** Required  
Returns the logged-in user's profile.

---

### PATCH `/users/profile`
**Auth:** Required

**Request Body (any subset):**
```json
{ "name": "Updated Name", "phone": "9876543211" }
```

---

### POST `/users/avatar`
**Auth:** Required | `multipart/form-data`

**Field:** `avatar` (image/jpeg, image/png, image/webp — max 5MB)

**Response 200:**
```json
{ "data": { "avatar": "https://res.cloudinary.com/..." } }
```

---

### GET `/users/addresses`
**Auth:** Required  
Returns array of saved delivery addresses.

---

### POST `/users/addresses`
**Auth:** Required

**Request Body:**
```json
{
  "label": "home",
  "line1": "12 MG Road",
  "line2": "Near City Mall",
  "city": "Lucknow",
  "state": "Uttar Pradesh",
  "pincode": "226001",
  "latitude": 26.8467,
  "longitude": 80.9462,
  "isDefault": true
}
```

---

### PATCH `/users/addresses/:addressId`
**Auth:** Required — partial update of any address field.

---

### DELETE `/users/addresses/:addressId`
**Auth:** Required

---

### DELETE `/users/account`
**Auth:** Required — soft-deletes the account.

---

## 🍳 Cook Endpoints

### POST `/cooks/profile`
**Auth:** Required (role: cook)

**Request Body:**
```json
{
  "kitchenName": "Sunita's Kitchen",
  "description": "Authentic UP home food",
  "specialties": ["Dal Baati", "Kachori"],
  "address": {
    "line1": "45 Hazratganj",
    "city": "Lucknow",
    "state": "Uttar Pradesh",
    "pincode": "226001"
  },
  "coordinates": { "latitude": 26.8467, "longitude": 80.9462 },
  "maxDailyOrders": 30
}
```

**Response 201:** Cook profile with `status: "pending"`.

---

### GET `/cooks/profile/me`
**Auth:** Required (role: cook)

---

### PATCH `/cooks/profile`
**Auth:** Required (role: cook) — update kitchen name, description, specialties, maxDailyOrders.

---

### PATCH `/cooks/availability`
**Auth:** Required (role: cook, status: approved)  
Toggles `isAvailable` on/off.

---

### POST `/cooks/images`
**Auth:** Required (role: cook) | `multipart/form-data`

**Field:** `images[]` — up to 8 images total.

---

### DELETE `/cooks/images/:imageId`
**Auth:** Required (role: cook) — deletes image from Cloudinary + profile.

---

### POST `/cooks/verification-docs`
**Auth:** Required (role: cook) | `multipart/form-data`

**Fields:** `document` (file), `docType` (aadhaar | pan | fssai | other)

---

### GET `/cooks/nearby`
**Auth:** None

**Query Params:**
| Param | Type | Required | Default |
|-------|------|----------|---------|
| latitude | number | ✅ | — |
| longitude | number | ✅ | — |
| radius | number (km) | ❌ | 10 |
| page | number | ❌ | 1 |
| limit | number | ❌ | 20 |
| foodType | veg\|non_veg\|egg | ❌ | — |

**Response 200:**
```json
{
  "data": [ { "_id": "...", "kitchenName": "...", "averageRating": 4.5, "distance": "...", "isAvailable": true } ],
  "meta": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### GET `/cooks/:id`
**Auth:** None — public kitchen detail page.

---

## 🍱 Menu Endpoints

### POST `/menu`
**Auth:** Required (role: cook, status: approved) | `multipart/form-data`

**Fields:**
| Field | Type | Required |
|-------|------|----------|
| title | string | ✅ |
| description | string | ❌ |
| category | breakfast\|lunch\|dinner\|snacks\|desserts\|beverages\|thali\|other | ✅ |
| foodType | veg\|non_veg\|egg | ✅ |
| price | number | ✅ |
| discountedPrice | number | ❌ |
| quantity | number | ✅ |
| preparationTimeMinutes | number | ❌ |
| ingredients | string[] | ❌ |
| image | file | ❌ |

---

### GET `/menu/my`
**Auth:** Required (role: cook) — returns all own menu items (including unavailable).

---

### GET `/menu/cook/:cookId`
**Auth:** None — returns only `isAvailable: true` items for that kitchen.

**Query:** `category`, `foodType`, `page`, `limit`

---

### GET `/menu/:id`
**Auth:** None

---

### PATCH `/menu/:id`
**Auth:** Required (role: cook, owner) | `multipart/form-data` (optional new image)

---

### PATCH `/menu/:id/toggle`
**Auth:** Required (role: cook, owner) — toggles `isAvailable`.

---

### DELETE `/menu/:id`
**Auth:** Required (role: cook, owner) — also deletes image from Cloudinary.

---

### GET `/menu/search`
**Auth:** None

**Query Params:** `q`, `category`, `foodType`, `minPrice`, `maxPrice`, `cookId`, `page`, `limit`

---

## 📦 Order Endpoints

### POST `/orders`
**Auth:** Required (role: customer)

**Request Body:**
```json
{
  "cookId": "COOK_PROFILE_ID",
  "items": [
    { "menuItemId": "MENU_ID", "quantity": 2 }
  ],
  "deliveryAddressId": "ADDRESS_ID",
  "cookInstructions": "Less spicy please"
}
```

**Validations:**
- Cook must be `approved` + `isAvailable`
- Cook must not have reached `maxDailyOrders`
- All menu items must belong to that cook and be `isAvailable`
- Quantities must not exceed available stock
- Duplicate order guard (same cook + customer within 2 minutes)

**Response 201:** Full order object with `orderNumber`, `subtotal`, `taxAmount`, `deliveryFee`, `totalAmount`.

---

### GET `/orders`
**Auth:** Required (customer gets their orders; cook gets kitchen's orders)

**Query:** `status`, `page`, `limit`, `startDate`, `endDate`

---

### GET `/orders/:id`
**Auth:** Required (customer, cook, or admin)

---

### PATCH `/orders/:id/status`
**Auth:** Required (role: cook, owner)

**Request Body:**
```json
{ "status": "accepted", "note": "On it!" }
```

**Valid transitions:**
```
placed → accepted → preparing → out_for_delivery → delivered
placed → cancelled
accepted → cancelled
```

**Errors:**
- `400` — Invalid status transition
- `403` — Not your order

---

### POST `/orders/:id/cancel`
**Auth:** Required (role: customer, owner)

**Request Body:**
```json
{ "reason": "Changed my mind" }
```

Cancellable only in `placed` or `accepted` status.  
If order was paid, refund is automatically initiated.

---

## 💳 Payment Endpoints

### POST `/payments/create-order`
**Auth:** Required (role: customer)

**Request Body:**
```json
{ "orderId": "ORDER_ID" }
```

**Response 201:**
```json
{
  "data": {
    "razorpayOrderId": "order_XXXXXXX",
    "amount": 19000,
    "currency": "INR",
    "keyId": "rzp_test_XXXXX"
  }
}
```

> Use `razorpayOrderId` + `keyId` with Razorpay SDK on frontend.

---

### POST `/payments/verify`
**Auth:** Required (role: customer)

**Request Body:**
```json
{
  "razorpayOrderId": "order_XXXXXXX",
  "razorpayPaymentId": "pay_XXXXXXX",
  "razorpaySignature": "HMAC_SIGNATURE"
}
```

**Response 200:** Payment record with `status: "paid"`.  
**Errors:** `400` — Invalid signature.

---

### GET `/payments/history`
**Auth:** Required (role: customer)

---

### GET `/payments/:id`
**Auth:** Required (role: customer, owner)

---

## ⭐ Review Endpoints

### POST `/reviews`
**Auth:** Required (role: customer)

**Request Body:**
```json
{
  "orderId": "ORDER_ID",
  "rating": 5,
  "foodRating": 5,
  "packagingRating": 4,
  "deliveryRating": 5,
  "comment": "Absolutely delicious!"
}
```

**Validations:**
- Order must be `delivered`
- Customer must be the order owner
- One review per order (idempotent)

---

### GET `/reviews/cook/:cookId`
**Auth:** None — paginated public reviews for a kitchen.

---

### GET `/reviews/my`
**Auth:** Required — customer's own review history.

---

### POST `/reviews/:reviewId/reply`
**Auth:** Required (role: cook, profile owner)

**Request Body:**
```json
{ "text": "Thank you so much! 🙏" }
```

Only one reply per review.

---

## 🔔 Notification Endpoints

### GET `/notifications`
**Auth:** Required

**Response:**
```json
{
  "data": {
    "notifications": [...],
    "unreadCount": 3
  },
  "meta": { "total": 15, "page": 1 }
}
```

---

### PATCH `/notifications/read`
**Auth:** Required

**Request Body (mark all):** `{}`  
**Request Body (mark specific):** `{ "ids": ["ID1", "ID2"] }`

---

### DELETE `/notifications/:id`
**Auth:** Required

---

## 🛡️ Admin Endpoints

All admin routes require **`role: admin`**.

### GET `/admin/dashboard`
Returns aggregate stats: users, cooks, orders, revenue (daily breakdown for last 7 days).

---

### GET `/admin/users`
**Query:** `role`, `search`, `page`, `limit`

---

### PATCH `/admin/users/:id/toggle-status`
Activate / deactivate a user account.

---

### GET `/admin/cooks`
**Query:** `status` (pending | approved | rejected | suspended), `page`, `limit`

---

### PATCH `/admin/cooks/:cookId/verify`
**Request Body:**
```json
{
  "status": "approved",
  "adminNote": "All documents verified."
}
```

Triggers notification + email to cook.

---

### GET `/admin/orders`
**Query:** `status`, `page`, `limit`

---

### DELETE `/admin/reviews/:id`
Hides a review (sets `isVisible: false`).

---

### GET `/admin/payments`
**Query:** `status`, `page`, `limit`

---

## Standard Error Response

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["'email' must be a valid email", "'password' length must be at least 8 characters"]
}
```

| Status | Meaning |
|--------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (insufficient role/status) |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 429 | Rate Limited |
| 500 | Internal Server Error |

---

## Pagination Meta

All list responses include:
```json
{
  "meta": {
    "total": 100,
    "page": 2,
    "limit": 20,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": true
  }
}
```

---

## Future Scalability

The architecture supports adding:
- **Subscriptions** — weekly/monthly meal plans (new model + route)
- **Coupons** — `Coupon` model, apply at order creation
- **Analytics** — separate aggregation service or time-series collections
- **Delivery agents** — new `delivery_agent` role, `DeliveryAssignment` model
- **Real-time tracking** — Socket.IO with `socket.join(orderId)` rooms
- **Push notifications** — FCM/APNs via `NotificationService.create()`
