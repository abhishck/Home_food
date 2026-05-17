import User from '../models/User.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { deleteFromCloudinary } from '../utils/upload.js';
import { paginate, getPaginationOptions } from '../utils/paginate.js';

// GET /api/users/profile
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('cookProfile');
  return ApiResponse.success(res, user.toSafeObject());
});

// PATCH /api/users/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'phone'];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });
  return ApiResponse.success(res, user.toSafeObject(), 'Profile updated');
});

// POST /api/users/avatar
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image file provided');

  const user = await User.findById(req.user._id).select('+avatarPublicId');
  if (user.avatarPublicId) {
    await deleteFromCloudinary(user.avatarPublicId);
  }

  user.avatar = req.file.path;
  user.avatarPublicId = req.file.filename;
  await user.save({ validateBeforeSave: false });

  return ApiResponse.success(res, { avatar: user.avatar }, 'Avatar updated');
});

// GET /api/users/addresses
export const getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('addresses');
  return ApiResponse.success(res, user.addresses);
});

// POST /api/users/addresses
export const addAddress = asyncHandler(async (req, res) => {
  const { label, line1, line2, city, state, pincode, latitude, longitude, isDefault } = req.body;

  const user = await User.findById(req.user._id);

  if (isDefault) {
    user.addresses.forEach((a) => (a.isDefault = false));
  }

  user.addresses.push({
    label,
    line1,
    line2,
    city,
    state,
    pincode,
    location: { type: 'Point', coordinates: [longitude, latitude] },
    isDefault: isDefault || user.addresses.length === 0,
  });

  await user.save();
  return ApiResponse.created(res, user.addresses, 'Address added');
});

// PATCH /api/users/addresses/:addressId
export const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found');

  const { label, line1, line2, city, state, pincode, latitude, longitude, isDefault } = req.body;

  if (label !== undefined) address.label = label;
  if (line1 !== undefined) address.line1 = line1;
  if (line2 !== undefined) address.line2 = line2;
  if (city !== undefined) address.city = city;
  if (state !== undefined) address.state = state;
  if (pincode !== undefined) address.pincode = pincode;
  if (latitude !== undefined && longitude !== undefined) {
    address.location = { type: 'Point', coordinates: [longitude, latitude] };
  }
  if (isDefault) {
    user.addresses.forEach((a) => (a.isDefault = false));
    address.isDefault = true;
  }

  await user.save();
  return ApiResponse.success(res, user.addresses, 'Address updated');
});

// DELETE /api/users/addresses/:addressId
export const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found');

  address.deleteOne();
  await user.save();
  return ApiResponse.success(res, null, 'Address deleted');
});

// GET /api/users/orders — order history (delegated to order controller)
// Defined in order routes for better cohesion.

// DELETE /api/users/account
export const deleteAccount = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { deletedAt: new Date(), isActive: false });
  return ApiResponse.success(res, null, 'Account deleted');
});
