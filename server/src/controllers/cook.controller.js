import CookProfile from '../models/CookProfile.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { paginate, getPaginationOptions } from '../utils/paginate.js';
import { deleteFromCloudinary } from '../utils/upload.js';
import notificationService from '../services/notification.service.js';
import { sendEmail, emailTemplates } from '../utils/email.js';

// POST /api/cooks/profile
export const createCookProfile = asyncHandler(async (req, res) => {
  const existing = await CookProfile.findOne({ user: req.user._id });
  if (existing) throw ApiError.conflict('Cook profile already exists');

  const { kitchenName, description, specialties, address, coordinates, maxDailyOrders } = req.body;

  if (!coordinates?.latitude || !coordinates?.longitude) {
    throw ApiError.badRequest('coordinates.latitude and coordinates.longitude are required');
  }

  const profile = await CookProfile.create({
    user: req.user._id,
    kitchenName,
    description,
    specialties: Array.isArray(specialties) ? specialties : [],
    address,
    location: {
      type: 'Point',
      coordinates: [parseFloat(coordinates.longitude), parseFloat(coordinates.latitude)],
    },
    maxDailyOrders: maxDailyOrders || 20,
  });

  return ApiResponse.created(res, profile, 'Cook profile created. Awaiting verification.');
});

// GET /api/cooks/profile/me
export const getMyCookProfile = asyncHandler(async (req, res) => {
  const profile = await CookProfile.findOne({ user: req.user._id }).populate('user', 'name email phone avatar');
  if (!profile) {
    // Return 404 that the frontend can gracefully handle
    throw ApiError.notFound('Cook profile not found');
  }
  return ApiResponse.success(res, profile);
});

// PATCH /api/cooks/profile
export const updateCookProfile = asyncHandler(async (req, res) => {
  const profile = await CookProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.notFound('Cook profile not found');

  const allowed = ['kitchenName', 'description', 'specialties', 'maxDailyOrders', 'address', 'availabilitySchedule'];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) profile[key] = req.body[key];
  });

  await profile.save();
  return ApiResponse.success(res, profile, 'Profile updated');
});

// PATCH /api/cooks/availability
export const toggleAvailability = asyncHandler(async (req, res) => {
  const profile = await CookProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.notFound('Cook profile not found');
  if (profile.status !== 'approved') {
    throw ApiError.forbidden('Only approved cooks can toggle availability');
  }

  profile.isAvailable = !profile.isAvailable;
  await profile.save();

  return ApiResponse.success(
    res,
    { isAvailable: profile.isAvailable },
    `You are now ${profile.isAvailable ? 'accepting orders' : 'offline'}`
  );
});

// POST /api/cooks/images
export const uploadKitchenImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) throw ApiError.badRequest('No images provided');

  const profile = await CookProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.notFound('Cook profile not found');

  if (profile.images.length + req.files.length > 8) {
    throw ApiError.badRequest('Maximum 8 kitchen images allowed');
  }

  const newImages = req.files.map((f) => ({
    url: f.path,
    publicId: f.filename,
    caption: '',
  }));

  profile.images.push(...newImages);
  await profile.save();

  return ApiResponse.success(res, profile.images, 'Images uploaded');
});

// DELETE /api/cooks/images/:imageId
export const deleteKitchenImage = asyncHandler(async (req, res) => {
  const profile = await CookProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.notFound('Cook profile not found');

  const image = profile.images.id(req.params.imageId);
  if (!image) throw ApiError.notFound('Image not found');

  if (image.publicId) await deleteFromCloudinary(image.publicId).catch(() => {});
  image.deleteOne();
  await profile.save();

  return ApiResponse.success(res, null, 'Image deleted');
});

// POST /api/cooks/verification-docs
export const uploadVerificationDocs = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No document provided');

  const profile = await CookProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.notFound('Cook profile not found');

  const { docType } = req.body;

  profile.verificationDocs.push({
    type: docType || 'other',
    url: req.file.path,
    publicId: req.file.filename,
  });

  await profile.save();
  return ApiResponse.success(res, profile.verificationDocs, 'Document uploaded');
});

// GET /api/cooks/nearby
export const getNearbyKitchens = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 10, foodType } = req.query;

  if (!latitude || !longitude) {
    throw ApiError.badRequest('latitude and longitude are required');
  }

  const radiusInMeters = parseFloat(radius) * 1000;

  const geoFilter = {
    location: {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        $maxDistance: radiusInMeters,
      },
    },
    status: 'approved',
  };

  if (foodType) {
    const Menu = (await import('../models/Menu.model.js')).default;
    const cookIds = await Menu.distinct('cook', { foodType, isAvailable: true });
    geoFilter._id = { $in: cookIds };
  }

  const options = getPaginationOptions(req.query);
  options.populate = [{ path: 'user', select: 'name avatar' }];
  options.select = '-verificationDocs -bankAccount';

  const { docs, meta } = await paginate(CookProfile, geoFilter, options);

  return ApiResponse.success(res, docs, 'Nearby kitchens fetched', 200, meta);
});

// GET /api/cooks/:id
export const getCookById = asyncHandler(async (req, res) => {
  const profile = await CookProfile.findById(req.params.id)
    .populate('user', 'name avatar')
    .select('-verificationDocs -bankAccount');

  if (!profile) throw ApiError.notFound('Kitchen not found');

  return ApiResponse.success(res, profile);
});
