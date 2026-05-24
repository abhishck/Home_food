import User from '../models/User.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { generateTokenPair, verifyRefreshToken } from '../utils/token.js';
import { generateResetToken, hashToken } from '../utils/crypto.js';
import { sendEmail, emailTemplates } from '../utils/email.js';
import { COOKIE_OPTIONS } from '../constants/index.js';
import CookProfile from '../models/CookProfile.model.js';

const sendTokenResponse = async (
  res,
  user,
  statusCode = 200,
  message = 'Success'
) => {
  const payload = { id: user._id, role: user.role };

  const { accessToken, refreshToken } =
    generateTokenPair(payload);

  // IMPORTANT:
  // Wait for DB write before responding
  user.refreshToken = refreshToken;

  await user.save({ validateBeforeSave: false });

  res
    .cookie('accessToken', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    })
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

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('Email already registered');

  const user = await User.create({ name, email, phone: phone || undefined, password, role });

  // Non-blocking welcome email — never fail the request over email issues
  sendEmail({ to: email, ...emailTemplates.welcomeEmail(name) }).catch(() => {});

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
    throw ApiError.unauthorized('Invalid or expired refresh token. Please log in again.');
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw ApiError.unauthorized('Refresh token is invalid. Please log in again.');
  }
  if (!user.isActive) throw ApiError.forbidden('Account has been deactivated');

  return sendTokenResponse(res, user, 200, 'Token refreshed');
});

// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Always succeed — prevents email enumeration
  const successMessage = 'If that email is registered, a reset link has been sent.';

  const user = await User.findOne({ email });
  if (!user) return ApiResponse.success(res, null, successMessage);

  const { rawToken, hashedToken } = generateResetToken();
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${rawToken}`;
  const tmpl = emailTemplates.passwordReset(resetUrl, user.name);

  // Non-blocking email — if SMTP isn't configured, still return success
  sendEmail({ to: email, ...tmpl }).catch((err) => {
    // Reset the token if email fails so user can retry
    User.findByIdAndUpdate(user._id, {
      $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
    }).exec();
  });

  return ApiResponse.success(res, null, successMessage);
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
  user.refreshToken = undefined;
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
  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.unauthorized('User not found');

  const safeUser = user.toSafeObject();

  // Attach cook profile if user is a cook (optional — non-fatal)
  if (user.role === 'cook') {
    try {
      const cookProfile = await CookProfile.findOne({ user: user._id })
        .select('status kitchenName isAvailable _id');
      safeUser.cookProfile = cookProfile || null;
    } catch {
      safeUser.cookProfile = null;
    }
  }

  return ApiResponse.success(res, safeUser, 'Profile fetched');
});
