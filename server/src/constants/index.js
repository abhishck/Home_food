// =============================================
//   GLOBAL CONSTANTS
// =============================================

export const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  COOK: 'cook',
  ADMIN: 'admin',
});

export const COOK_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
});

export const ORDER_STATUS = Object.freeze({
  PLACED: 'placed',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
});

export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
});

export const FOOD_TYPE = Object.freeze({
  VEG: 'veg',
  NON_VEG: 'non_veg',
  EGG: 'egg',
});

export const MENU_CATEGORY = Object.freeze({
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACKS: 'snacks',
  DESSERTS: 'desserts',
  BEVERAGES: 'beverages',
  THALI: 'thali',
  OTHER: 'other',
});

export const NOTIFICATION_TYPE = Object.freeze({
  ORDER_PLACED: 'order_placed',
  ORDER_ACCEPTED: 'order_accepted',
  ORDER_PREPARING: 'order_preparing',
  ORDER_OUT_FOR_DELIVERY: 'order_out_for_delivery',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  COOK_APPROVED: 'cook_approved',
  COOK_REJECTED: 'cook_rejected',
  COOK_SUSPENDED: 'cook_suspended',
  NEW_REVIEW: 'new_review',
  GENERAL: 'general',
});

export const UPLOAD_FOLDERS = Object.freeze({
  PROFILE: 'homefood/profiles',
  KITCHEN: 'homefood/kitchens',
  FOOD: 'homefood/foods',
  VERIFICATION: 'homefood/verifications',
});

export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
