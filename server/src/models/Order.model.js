import mongoose from 'mongoose';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants/index.js';

const OrderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    required: true,
  },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true },
  image: String,
  foodType: String,
});

const StatusHistorySchema = new mongoose.Schema({
  status: { type: String, enum: Object.values(ORDER_STATUS) },
  timestamp: { type: Date, default: Date.now },
  note: String,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      // generated pre-save
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
    cookUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    items: {
      type: [OrderItemSchema],
      validate: [(v) => v.length > 0, 'Order must have at least one item'],
    },

    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PLACED,
    },
    statusHistory: [StatusHistorySchema],

    // Pricing
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // Delivery address (snapshot at order time)
    deliveryAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number],
      },
    },

    // Payment
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },

    // Cook instructions
    cookInstructions: { type: String, maxlength: 300 },
    estimatedDeliveryTime: { type: Date },

    // Cancellation
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: String,
    cancelledAt: Date,

    // Review
    isReviewed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Pre-save: generate order number
OrderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `HF${Date.now().toString(36).toUpperCase()}${(count + 1)
      .toString()
      .padStart(4, '0')}`;
  }

  // Append to status history on status change
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({ status: this.status });
  }
  next();
});

// orderNumber index created automatically via unique:true
OrderSchema.index({ customer: 1, createdAt: -1 });
OrderSchema.index({ cook: 1, createdAt: -1 });
OrderSchema.index({ cookUser: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });

const Order = mongoose.model('Order', OrderSchema);
export default Order;
