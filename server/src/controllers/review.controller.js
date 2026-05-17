import Review from '../models/Review.model.js';
import Order from '../models/Order.model.js';
import CookProfile from '../models/CookProfile.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginate, getPaginationOptions } from '../utils/paginate.js';
import { ORDER_STATUS } from '../constants/index.js';

// POST /api/reviews
export const createReview = asyncHandler(async (req, res) => {
  const { orderId, rating, foodRating, packagingRating, deliveryRating, comment } = req.body;

  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.customer.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Not your order');
  }
  if (order.status !== ORDER_STATUS.DELIVERED) {
    throw ApiError.badRequest('You can only review delivered orders');
  }
  if (order.isReviewed) {
    throw ApiError.conflict('You have already reviewed this order');
  }

  const review = await Review.create({
    order: orderId,
    customer: req.user._id,
    cook: order.cook,
    menuItems: order.items.map((i) => i.menuItem),
    rating,
    foodRating,
    packagingRating,
    deliveryRating,
    comment,
    isVerifiedPurchase: true,
  });

  // Mark order as reviewed
  await Order.findByIdAndUpdate(orderId, { isReviewed: true });

  return ApiResponse.created(res, review, 'Review submitted');
});

// GET /api/reviews/cook/:cookId
export const getCookReviews = asyncHandler(async (req, res) => {
  const { cookId } = req.params;
  const { docs, meta } = await paginate(
    Review,
    { cook: cookId, isVisible: true },
    {
      ...getPaginationOptions(req.query),
      populate: [{ path: 'customer', select: 'name avatar' }],
    }
  );
  return ApiResponse.success(res, docs, 'Reviews fetched', 200, meta);
});

// POST /api/reviews/:reviewId/reply — cook replies
export const replyCookReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) throw ApiError.notFound('Review not found');

  const cookProfile = await CookProfile.findOne({ user: req.user._id });
  if (!cookProfile || cookProfile._id.toString() !== review.cook.toString()) {
    throw ApiError.forbidden('Not your review');
  }
  if (review.cookReply?.text) {
    throw ApiError.conflict('You have already replied to this review');
  }

  review.cookReply = { text: req.body.text, repliedAt: new Date() };
  await review.save();

  return ApiResponse.success(res, review, 'Reply posted');
});

// GET /api/reviews/my
export const getMyReviews = asyncHandler(async (req, res) => {
  const { docs, meta } = await paginate(
    Review,
    { customer: req.user._id },
    { ...getPaginationOptions(req.query), populate: [{ path: 'cook', select: 'kitchenName' }] }
  );
  return ApiResponse.success(res, docs, 'My reviews', 200, meta);
});
