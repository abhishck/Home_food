import crypto from 'crypto';
import getRazorpay from '../config/razorpay.js';
import Payment from '../models/Payment.model.js';
import Order from '../models/Order.model.js';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import { PAYMENT_STATUS, ORDER_STATUS } from '../constants/index.js';
import notificationService from './notification.service.js';

class PaymentService {
  /**
   * Create a Razorpay order for an existing order.
   */
  async createRazorpayOrder(orderId, customerId) {
    const razorpay = getRazorpay();
    const order = await Order.findById(orderId).populate('cook');
    if (!order) throw ApiError.notFound('Order not found');
    if (order.customer.toString() !== customerId.toString()) {
      throw ApiError.forbidden('Not your order');
    }
    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      throw ApiError.conflict('Order already paid');
    }

    const amountInPaise = Math.round(order.totalAmount * 100);

    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: order.orderNumber,
      notes: {
        orderId: order._id.toString(),
        customerId: customerId.toString(),
      },
    });

    const payment = await Payment.create({
      order: order._id,
      customer: customerId,
      cook: order.cook._id,
      razorpayOrderId: rzpOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      status: PAYMENT_STATUS.PENDING,
    });

    return {
      razorpayOrderId: rzpOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: config.razorpay.keyId,
      paymentId: payment._id,
      orderNumber: order.orderNumber,
    };
  }

  /**
   * Verify Razorpay payment signature and mark order as paid.
   */
  async verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }, customerId) {
    const razorpay = getRazorpay();

    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw ApiError.badRequest('Invalid payment signature');
    }

    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment) throw ApiError.notFound('Payment record not found');

    // Fetch payment details from Razorpay
    const rzpPayment = await razorpay.payments.fetch(razorpayPaymentId);

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.status = PAYMENT_STATUS.PAID;
    payment.method = rzpPayment.method;
    await payment.save();

    // Update order payment status
    await Order.findByIdAndUpdate(payment.order, {
      paymentStatus: PAYMENT_STATUS.PAID,
      payment: payment._id,
    });

    // Notify customer
    notificationService.paymentSuccess(customerId, payment);

    return payment;
  }

  /**
   * Issue a refund via Razorpay.
   */
  async initiateRefund(orderId, reason) {
    const razorpay = getRazorpay();
    const payment = await Payment.findOne({ order: orderId, status: PAYMENT_STATUS.PAID });
    if (!payment) throw ApiError.notFound('No paid payment found for this order');

    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: payment.amount,
      notes: { reason },
    });

    payment.status = PAYMENT_STATUS.REFUNDED;
    payment.refundId = refund.id;
    payment.refundAmount = refund.amount;
    payment.refundedAt = new Date();
    await payment.save();

    return payment;
  }
}

export default new PaymentService();
