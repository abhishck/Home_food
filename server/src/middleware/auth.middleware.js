import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { verifyAccessToken, extractBearerToken } from '../utils/token.js';
import User from '../models/User.model.js';
import { ROLES } from '../constants/index.js';

/**
 * Verifies JWT and attaches user to req.user.
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) throw ApiError.unauthorized('Authentication token missing');

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    throw ApiError.unauthorized(
      err.name === 'TokenExpiredError'
        ? 'Access token expired. Please refresh.'
        : 'Invalid access token'
    );
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (!user.isActive) throw ApiError.forbidden('Account has been deactivated');

  req.user = user;
  next();
});

/**
 * Authorize by role(s).
 * Usage: authorize(ROLES.ADMIN, ROLES.COOK)
 */
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized();
  if (!roles.includes(req.user.role)) {
    throw ApiError.forbidden(
      `Role '${req.user.role}' is not authorized for this action`
    );
  }
  next();
};

/**
 * Optional auth — attaches user if token present, continues if not.
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    if (user?.isActive) req.user = user;
  } catch {
    // Silently ignore
  }
  next();
});

/**
 * Ensures the cook is approved before allowing access.
 */
export const requireApprovedCook = asyncHandler(async (req, res, next) => {
  if (req.user.role !== ROLES.COOK) return next();

  const CookProfile = (await import('../models/CookProfile.model.js')).default;
  const profile = await CookProfile.findOne({ user: req.user._id });

  if (!profile) throw ApiError.forbidden('Cook profile not found');
  if (profile.status !== 'approved') {
    throw ApiError.forbidden(
      `Cook account is currently '${profile.status}'. Only approved cooks can perform this action.`
    );
  }

  req.cookProfile = profile;
  next();
});
