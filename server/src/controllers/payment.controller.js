import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import paymentService from '../services/payment.service.js';
import Payment from '../models/Payment.model.js';
import { paginate, getPaginationOptions } from '../utils/paginate.js';

// POST /api/payments/create-order
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const result = await paymentService.createRazorpayOrder(
    req.body.orderId,
    req.user._id
  );
  return ApiResponse.created(res, result, 'Razorpay order created');
});

// POST /api/payments/verify
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const payment = await paymentService.verifyPayment(
    { razorpayOrderId, razorpayPaymentId, razorpaySignature },
    req.user._id
  );
  return ApiResponse.success(res, payment, 'Payment verified successfully');
});

// GET /api/payments/history
export const getPaymentHistory = asyncHandler(async (req, res) => {
  const { docs, meta } = await paginate(
    Payment,
    { customer: req.user._id },
    { ...getPaginationOptions(req.query), populate: [{ path: 'order', select: 'orderNumber totalAmount' }] }
  );
  return ApiResponse.success(res, docs, 'Payment history', 200, meta);
});

// GET /api/payments/:id
export const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    _id: req.params.id,
    customer: req.user._id,
  }).populate('order');
  if (!payment) {
    const { ApiError } = await import('../utils/ApiError.js');
    throw ApiError.notFound('Payment not found');
  }
  return ApiResponse.success(res, payment);
});
