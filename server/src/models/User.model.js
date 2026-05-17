import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import { ROLES } from '../constants/index.js';

const AddressSchema = new mongoose.Schema(
  {
    label: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, match: /^\d{6}$/ },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
    },
    avatar: { type: String },
    avatarPublicId: { type: String, select: false },
    addresses: [AddressSchema],
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },

    // Tokens
    refreshToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // Soft delete
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes (email + phone indexes are created automatically via unique:true)
UserSchema.index({ role: 1 });
UserSchema.index({ 'addresses.location': '2dsphere' });

// Virtual: cookProfile
UserSchema.virtual('cookProfile', {
  ref: 'CookProfile',
  localField: '_id',
  foreignField: 'user',
  justOne: true,
});

// Pre-save: hash password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, config.bcrypt.saltRounds);
  next();
});

// Method: compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method: safe user object (strips sensitive fields)
UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.avatarPublicId;
  return obj;
};

// Query middleware: exclude deleted users by default
UserSchema.pre(/^find/, function (next) {
  this.where({ deletedAt: null });
  next();
});

const User = mongoose.model('User', UserSchema);
export default User;
