import mongoose from 'mongoose';
import { PAYMENT_STATUS } from '../constants/index.js';

const PaymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CookProfile',
      required: true,
    },

    // Razorpay fields
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, sparse: true },
    razorpaySignature: { type: String, select: false },

    amount: { type: Number, required: true }, // in paise (INR * 100)
    currency: { type: String, default: 'INR' },

    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },

    method: { type: String }, // upi, card, netbanking, etc.
    refundId: { type: String },
    refundAmount: { type: Number },
    refundedAt: { type: Date },

    metadata: { type: Map, of: String },
  },
  { timestamps: true }
);

// razorpayOrderId + razorpayPaymentId indexes created via unique/sparse declarations
PaymentSchema.index({ order: 1 });
PaymentSchema.index({ customer: 1 });
PaymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', PaymentSchema);
export default Payment;
