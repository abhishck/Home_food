import mongoose from 'mongoose';
import { COOK_STATUS } from '../constants/index.js';

const CookProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    kitchenName: {
      type: String,
      required: [true, 'Kitchen name is required'],
      trim: true,
      maxlength: [100, 'Kitchen name too long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description too long'],
    },
    specialties: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],

    // Location
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: {
      line1: { type: String, required: true, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, match: /^\d{6}$/ },
    },

    // Media
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
        caption: { type: String, trim: true },
      },
    ],

    // Verification
    status: {
      type: String,
      enum: Object.values(COOK_STATUS),
      default: COOK_STATUS.PENDING,
    },
    verificationDocs: [
      {
        type: { type: String, enum: ['aadhaar', 'pan', 'fssai', 'other'] },
        url: String,
        publicId: { type: String, select: false },
      },
    ],
    adminNote: { type: String }, // Admin note on approval/rejection
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Availability
    isAvailable: { type: Boolean, default: false },
    availabilitySchedule: {
      monday: { open: Boolean, from: String, to: String },
      tuesday: { open: Boolean, from: String, to: String },
      wednesday: { open: Boolean, from: String, to: String },
      thursday: { open: Boolean, from: String, to: String },
      friday: { open: Boolean, from: String, to: String },
      saturday: { open: Boolean, from: String, to: String },
      sunday: { open: Boolean, from: String, to: String },
    },

    // Stats
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    maxDailyOrders: { type: Number, default: 20 },
    currentDayOrders: { type: Number, default: 0 },

    // Bank / payout details (encrypted in production)
    bankAccount: {
      accountNumber: { type: String, select: false },
      ifsc: { type: String, select: false },
      accountHolderName: { type: String, select: false },
      upiId: { type: String, select: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Geospatial index for nearby search
CookProfileSchema.index({ location: '2dsphere' });
CookProfileSchema.index({ status: 1 });
CookProfileSchema.index({ isAvailable: 1 });
CookProfileSchema.index({ 'address.city': 1 });
CookProfileSchema.index({ averageRating: -1 });

// Virtual: menu items count
CookProfileSchema.virtual('menuItemsCount', {
  ref: 'Menu',
  localField: '_id',
  foreignField: 'cook',
  count: true,
});

// Helper: is cook active and approved
CookProfileSchema.virtual('isActive').get(function () {
  return this.status === COOK_STATUS.APPROVED && this.isAvailable;
});

const CookProfile = mongoose.model('CookProfile', CookProfileSchema);
export default CookProfile;
