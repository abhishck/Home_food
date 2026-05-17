import { ORDER_STATUS } from '../constants/index.js';

/**
 * Valid status transitions for orders.
 * Cook drives most transitions; customer can only cancel early.
 */
export const ORDER_TRANSITIONS = {
  [ORDER_STATUS.PLACED]:           [ORDER_STATUS.ACCEPTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ACCEPTED]:         [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]:        [ORDER_STATUS.OUT_FOR_DELIVERY],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]:        [],
  [ORDER_STATUS.CANCELLED]:        [],
};

/**
 * Returns true when transitioning from `current` → `next` is valid.
 */
export const isValidTransition = (current, next) =>
  (ORDER_TRANSITIONS[current] || []).includes(next);

/**
 * Statuses that are considered "active" (order is in-progress).
 */
export const ACTIVE_STATUSES = [
  ORDER_STATUS.PLACED,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.OUT_FOR_DELIVERY,
];

/**
 * Statuses in which a customer may cancel an order.
 */
export const CANCELLABLE_BY_CUSTOMER = [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED];

/**
 * Calculate order pricing.
 * @param {Array} items  - [{ price, quantity }]
 * @param {Number} deliveryFee
 * @param {Number} taxRate  - decimal, e.g. 0.05 for 5%
 * @param {Number} discount
 */
export const calculateOrderTotal = (items, deliveryFee = 30, taxRate = 0.05, discount = 0) => {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const totalAmount = Math.max(0, subtotal + taxAmount + deliveryFee - discount);
  return { subtotal, taxAmount, deliveryFee, discount, totalAmount };
};
