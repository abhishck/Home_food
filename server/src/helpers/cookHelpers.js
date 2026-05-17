import { COOK_STATUS } from '../constants/index.js';

/**
 * Returns true if a cook is allowed to create/activate menu items.
 */
export const canManageMenu = (cookProfile) =>
  cookProfile?.status === COOK_STATUS.APPROVED;

/**
 * Returns true if a cook can receive new orders right now.
 */
export const canReceiveOrders = (cookProfile) =>
  cookProfile?.status === COOK_STATUS.APPROVED &&
  cookProfile?.isAvailable === true &&
  cookProfile?.currentDayOrders < cookProfile?.maxDailyOrders;

/**
 * Human-readable label for each cook status.
 */
export const COOK_STATUS_LABELS = {
  [COOK_STATUS.PENDING]:   'Pending Verification',
  [COOK_STATUS.APPROVED]:  'Approved',
  [COOK_STATUS.REJECTED]:  'Rejected',
  [COOK_STATUS.SUSPENDED]: 'Suspended',
};

/**
 * Reset cook's daily order count (to be called by a nightly cron job).
 * @param {Model} CookProfile — Mongoose model
 */
export const resetDailyOrderCounts = async (CookProfile) => {
  await CookProfile.updateMany({}, { $set: { currentDayOrders: 0 } });
};
