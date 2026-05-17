import Menu from '../models/Menu.model.js';
import CookProfile from '../models/CookProfile.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginate, getPaginationOptions } from '../utils/paginate.js';
import { deleteFromCloudinary } from '../utils/upload.js';

// POST /api/menu
export const createMenuItem = asyncHandler(async (req, res) => {
  const cookProfile = req.cookProfile || await CookProfile.findOne({ user: req.user._id });
  if (!cookProfile) throw ApiError.notFound('Cook profile not found');
  if (cookProfile.status !== 'approved') {
    throw ApiError.forbidden('Only approved cooks can create menu items');
  }

  const menuItem = await Menu.create({
    ...req.body,
    cook: cookProfile._id,
    cookUser: req.user._id,
    image: req.file?.path || null,
    imagePublicId: req.file?.filename || null,
  });

  return ApiResponse.created(res, menuItem, 'Menu item created');
});

// GET /api/menu/my — cook's own menu
export const getMyMenu = asyncHandler(async (req, res) => {
  const cookProfile = await CookProfile.findOne({ user: req.user._id });
  if (!cookProfile) throw ApiError.notFound('Cook profile not found');

  const options = getPaginationOptions(req.query);
  const filter = { cook: cookProfile._id };

  if (req.query.isAvailable !== undefined) filter.isAvailable = req.query.isAvailable === 'true';
  if (req.query.category) filter.category = req.query.category;

  const { docs, meta } = await paginate(Menu, filter, options);
  return ApiResponse.success(res, docs, 'Menu fetched', 200, meta);
});

// GET /api/menu/cook/:cookId — public menu for a kitchen
export const getCookMenu = asyncHandler(async (req, res) => {
  const { cookId } = req.params;
  const options = getPaginationOptions(req.query);

  const filter = { cook: cookId, isAvailable: true };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.foodType) filter.foodType = req.query.foodType;

  const { docs, meta } = await paginate(Menu, filter, options);
  return ApiResponse.success(res, docs, 'Menu fetched', 200, meta);
});

// GET /api/menu/:id
export const getMenuItemById = asyncHandler(async (req, res) => {
  const item = await Menu.findById(req.params.id).populate('cook', 'kitchenName averageRating');
  if (!item) throw ApiError.notFound('Menu item not found');
  return ApiResponse.success(res, item);
});

// PATCH /api/menu/:id
export const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await Menu.findOne({ _id: req.params.id, cookUser: req.user._id });
  if (!item) throw ApiError.notFound('Menu item not found or not yours');

  const updates = req.body;

  if (req.file) {
    if (item.imagePublicId) await deleteFromCloudinary(item.imagePublicId);
    updates.image = req.file.path;
    updates.imagePublicId = req.file.filename;
  }

  Object.assign(item, updates);
  await item.save();

  return ApiResponse.success(res, item, 'Menu item updated');
});

// DELETE /api/menu/:id
export const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await Menu.findOne({ _id: req.params.id, cookUser: req.user._id });
  if (!item) throw ApiError.notFound('Menu item not found or not yours');

  if (item.imagePublicId) await deleteFromCloudinary(item.imagePublicId);
  await item.deleteOne();

  return ApiResponse.success(res, null, 'Menu item deleted');
});

// PATCH /api/menu/:id/toggle
export const toggleAvailability = asyncHandler(async (req, res) => {
  const item = await Menu.findOne({ _id: req.params.id, cookUser: req.user._id });
  if (!item) throw ApiError.notFound('Menu item not found');

  item.isAvailable = !item.isAvailable;
  await item.save();

  return ApiResponse.success(
    res,
    { isAvailable: item.isAvailable },
    `Item is now ${item.isAvailable ? 'available' : 'unavailable'}`
  );
});

// GET /api/menu/search
export const searchMenu = asyncHandler(async (req, res) => {
  const { q, category, foodType, minPrice, maxPrice, cookId } = req.query;
  const filter = { isAvailable: true };

  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (foodType) filter.foodType = foodType;
  if (cookId) filter.cook = cookId;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  const options = getPaginationOptions(req.query);
  const { docs, meta } = await paginate(Menu, filter, {
    ...options,
    populate: [{ path: 'cook', select: 'kitchenName averageRating address' }],
  });

  return ApiResponse.success(res, docs, 'Search results', 200, meta);
});
