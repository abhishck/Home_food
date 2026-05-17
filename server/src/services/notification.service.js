import Notification from '../models/Notification.model.js';
import { NOTIFICATION_TYPE } from '../constants/index.js';
import logger from '../utils/logger.js';

/**
 * Core notification service — creates DB notifications.
 * Extendable with push (FCM/APNs) and email channels.
 */
class NotificationService {
  /**
   * Create a single notification.
   */
  async create({ recipientId, type, title, message, data = {}, actionUrl }) {
    try {
      const notification = await Notification.create({
        recipient: recipientId,
        type,
        title,
        message,
        data,
        actionUrl,
      });
      // TODO: Extend here — push to FCM, socket.io emit, etc.
      return notification;
    } catch (err) {
      logger.error('Notification create failed:', err);
    }
  }

  /**
   * Notify customer when order is placed.
   */
  async orderPlaced(customerId, order) {
    return this.create({
      recipientId: customerId,
      type: NOTIFICATION_TYPE.ORDER_PLACED,
      title: 'Order Placed!',
      message: `Your order #${order.orderNumber} has been placed successfully.`,
      data: { orderId: order._id, orderNumber: order.orderNumber },
      actionUrl: `/orders/${order._id}`,
    });
  }

  /**
   * Notify cook when a new order arrives.
   */
  async newOrderForCook(cookUserId, order) {
    return this.create({
      recipientId: cookUserId,
      type: NOTIFICATION_TYPE.ORDER_PLACED,
      title: 'New Order Received!',
      message: `You have a new order #${order.orderNumber}. Accept it quickly!`,
      data: { orderId: order._id, orderNumber: order.orderNumber },
      actionUrl: `/cook/orders/${order._id}`,
    });
  }

  async orderStatusChanged(customerId, order, status) {
    const messages = {
      accepted: `Your order #${order.orderNumber} has been accepted by the cook.`,
      preparing: `Your order #${order.orderNumber} is being prepared.`,
      out_for_delivery: `Your order #${order.orderNumber} is on its way!`,
      delivered: `Your order #${order.orderNumber} has been delivered. Enjoy!`,
      cancelled: `Your order #${order.orderNumber} has been cancelled.`,
    };

    const typeMap = {
      accepted: NOTIFICATION_TYPE.ORDER_ACCEPTED,
      preparing: NOTIFICATION_TYPE.ORDER_PREPARING,
      out_for_delivery: NOTIFICATION_TYPE.ORDER_OUT_FOR_DELIVERY,
      delivered: NOTIFICATION_TYPE.ORDER_DELIVERED,
      cancelled: NOTIFICATION_TYPE.ORDER_CANCELLED,
    };

    return this.create({
      recipientId: customerId,
      type: typeMap[status] || NOTIFICATION_TYPE.GENERAL,
      title: `Order ${status.replace(/_/g, ' ')}`,
      message: messages[status] || `Order status updated to ${status}`,
      data: { orderId: order._id, status },
      actionUrl: `/orders/${order._id}`,
    });
  }

  async cookVerified(cookUserId, status) {
    const map = {
      approved: {
        type: NOTIFICATION_TYPE.COOK_APPROVED,
        title: 'Account Approved! 🎉',
        message: 'Your cook account has been approved. Start creating your menu!',
      },
      rejected: {
        type: NOTIFICATION_TYPE.COOK_REJECTED,
        title: 'Account Not Approved',
        message: 'Your cook account verification was not approved. Check email for details.',
      },
      suspended: {
        type: NOTIFICATION_TYPE.COOK_SUSPENDED,
        title: 'Account Suspended',
        message: 'Your cook account has been suspended. Contact support.',
      },
    };

    const info = map[status];
    if (!info) return;

    return this.create({
      recipientId: cookUserId,
      type: info.type,
      title: info.title,
      message: info.message,
      actionUrl: '/cook/profile',
    });
  }

  async paymentSuccess(customerId, payment) {
    return this.create({
      recipientId: customerId,
      type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,
      title: 'Payment Successful',
      message: `Payment of ₹${(payment.amount / 100).toFixed(2)} confirmed.`,
      data: { paymentId: payment._id },
    });
  }

  /**
   * Mark notifications as read.
   */
  async markAsRead(userId, notificationIds = []) {
    const filter = { recipient: userId };
    if (notificationIds.length > 0) filter._id = { $in: notificationIds };

    return Notification.updateMany(filter, {
      isRead: true,
      readAt: new Date(),
    });
  }

  /**
   * Get unread count for a user.
   */
  async getUnreadCount(userId) {
    return Notification.countDocuments({ recipient: userId, isRead: false });
  }
}

export default new NotificationService();
