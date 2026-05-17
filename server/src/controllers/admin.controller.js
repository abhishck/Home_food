import User from '../models/User.model.js';
import CookProfile from '../models/CookProfile.model.js';
import Order from '../models/Order.model.js';
import Payment from '../models/Payment.model.js';
import Review from '../models/Review.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginate, getPaginationOptions } from '../utils/paginate.js';
import notificationService from '../services/notification.service.js';
import { sendEmail, emailTemplates } from '../utils/email.js';
import { COOK_STATUS, ORDER_STATUS } from '../constants/index.js';

// GET /api/admin/dashboard
export const getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalCooks,
    pendingCooks,
    totalOrders,
    todayOrders,
    totalRevenue,
    activeOrders,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    CookProfile.countDocuments({ status: COOK_STATUS.APPROVED }),
    CookProfile.countDocuments({ status: COOK_STATUS.PENDING }),
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: today } }),
    Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Order.countDocuments({ status: { $in: [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING] } }),
  ]);

  // Revenue by day (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dailyRevenue = await Payment.aggregate([
    { $match: { status: 'paid', createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return ApiResponse.success(res, {
    users: { total: totalUsers },
    cooks: { total: totalCooks, pending: pendingCooks },
    orders: { total: totalOrders, today: todayOrders, active: activeOrders },
    revenue: {
      total: (totalRevenue[0]?.total || 0) / 100,
      daily: dailyRevenue.map((d) => ({ date: d._id, amount: d.revenue / 100, orders: d.count })),
    },
  });
});

// GET /api/admin/users
export const getAllUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const { docs, meta } = await paginate(User, filter, getPaginationOptions(req.query));
  return ApiResponse.success(res, docs, 'Users fetched', 200, meta);
});

// PATCH /api/admin/users/:id/toggle-status
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'admin') throw ApiError.forbidden('Cannot deactivate admin');

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  return ApiResponse.success(
    res,
    { isActive: user.isActive },
    `User ${user.isActive ? 'activated' : 'deactivated'}`
  );
});

// GET /api/admin/cooks
export const getAllCooks = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const { docs, meta } = await paginate(CookProfile, filter, {
    ...getPaginationOptions(req.query),
    populate: [{ path: 'user', select: 'name email phone' }],
  });
  return ApiResponse.success(res, docs, 'Cooks fetched', 200, meta);
});

// PATCH /api/admin/cooks/:cookId/verify
export const verifyCook = asyncHandler(async (req, res) => {
  const { status, adminNote } = req.body;
  const profile = await CookProfile.findById(req.params.cookId).populate('user', 'name email');
  if (!profile) throw ApiError.notFound('Cook profile not found');

  profile.status = status;
  profile.adminNote = adminNote;
  if (status === COOK_STATUS.APPROVED) {
    profile.verifiedAt = new Date();
    profile.verifiedBy = req.user._id;
  }
  await profile.save();

  // Notify cook
  await notificationService.cookVerified(profile.user._id, status);

  // Send email
  if (status === COOK_STATUS.APPROVED) {
    const tmpl = emailTemplates.cookApproved(profile.user.name);
    sendEmail({ to: profile.user.email, ...tmpl }).catch(() => {});
  }

  return ApiResponse.success(res, profile, `Cook ${status}`);
});

// GET /api/admin/orders
export const getAllOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const { docs, meta } = await paginate(Order, filter, {
    ...getPaginationOptions(req.query),
    populate: [
      { path: 'customer', select: 'name email phone' },
      { path: 'cook', select: 'kitchenName' },
    ],
  });
  return ApiResponse.success(res, docs, 'Orders fetched', 200, meta);
});

// DELETE /api/admin/reviews/:id — hide/delete abusive reviews
export const removeReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');
  review.isVisible = false;
  await review.save();
  return ApiResponse.success(res, null, 'Review hidden');
});

// GET /api/admin/payments
export const getAllPayments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const { docs, meta } = await paginate(Payment, filter, {
    ...getPaginationOptions(req.query),
    populate: [
      { path: 'customer', select: 'name email' },
      { path: 'order', select: 'orderNumber totalAmount' },
    ],
  });
  return ApiResponse.success(res, docs, 'Payments fetched', 200, meta);
});
