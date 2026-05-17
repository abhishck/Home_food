import crypto from 'crypto';
import User from '../models/User.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { generateTokenPair, verifyRefreshToken } from '../utils/token.js';
import { generateResetToken, hashToken } from '../utils/crypto.js';
import { sendEmail, emailTemplates } from '../utils/email.js';
import { COOKIE_OPTIONS } from '../constants/index.js';

const sendTokenResponse = (res, user, statusCode = 200, message = 'Success') => {
  const payload = { id: user._id, role: user.role };
  const { accessToken, refreshToken } = generateTokenPair(payload);

  // Store refresh token hash in DB (async, non-blocking)
  User.findByIdAndUpdate(user._id, { refreshToken }).exec();

  res
    .cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 })
    .cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  return res.status(statusCode).json({
    success: true,
    message,
    data: {
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
    },
  });
};

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  const existing = await User.findOne({ email }).setOptions({ skipFilter: true });
  if (existing) throw ApiError.conflict('Email already registered');

  const user = await User.create({ name, email, phone, password, role });

  // Welcome email (non-blocking)
  const tmpl = emailTemplates.welcomeEmail(name);
  sendEmail({ to: email, ...tmpl }).catch(() => {});

  return sendTokenResponse(res, user, 201, 'Registration successful');
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('Account deactivated. Contact support.');

  return sendTokenResponse(res, user, 200, 'Login successful');
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.clearCookie('accessToken').clearCookie('refreshToken');
  return ApiResponse.success(res, null, 'Logged out successfully');
});

// POST /api/auth/refresh-token
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  if (!token) throw ApiError.unauthorized('Refresh token missing');

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw ApiError.unauthorized('Refresh token reuse detected or invalid');
  }

  return sendTokenResponse(res, user, 200, 'Token refreshed');
});

// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always return success to prevent email enumeration
  if (!user) {
    return ApiResponse.success(res, null, 'If that email is registered, a reset link has been sent.');
  }

  const { rawToken, hashedToken } = generateResetToken();
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 min
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;
  const tmpl = emailTemplates.passwordReset(resetUrl, user.name);

  try {
    await sendEmail({ to: email, ...tmpl });
  } catch {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw ApiError.internal('Failed to send reset email. Please try again.');
  }

  return ApiResponse.success(res, null, 'Password reset link sent to your email.');
});

// PATCH /api/auth/reset-password/:token
export const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = hashToken(req.params.token);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) throw ApiError.badRequest('Reset token is invalid or has expired');

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken = undefined; // Invalidate all sessions
  await user.save();

  return ApiResponse.success(res, null, 'Password reset successful. Please log in again.');
});

// PATCH /api/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  user.password = newPassword;
  user.refreshToken = undefined;
  await user.save();

  return ApiResponse.success(res, null, 'Password changed. Please log in again.');
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('cookProfile');
  return ApiResponse.success(res, user.toSafeObject(), 'Profile fetched');
});
