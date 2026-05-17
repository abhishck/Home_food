import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';
import { UPLOAD_FOLDERS } from '../constants/index.js';
import ApiError from './ApiError.js';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const buildCloudinaryStorage = (folder, allowedTypes) =>
  new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
      transformation: folder === UPLOAD_FOLDERS.FOOD || folder === UPLOAD_FOLDERS.KITCHEN
        ? [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }]
        : [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }],
    }),
  });

const fileFilter = (allowedMimes) => (req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(400, `Invalid file type. Allowed: ${allowedMimes.join(', ')}`),
      false
    );
  }
};

const buildUploader = (folder, allowedTypes) =>
  multer({
    storage: buildCloudinaryStorage(folder, allowedTypes),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: fileFilter(allowedTypes),
  });

export const uploadProfileImage = buildUploader(UPLOAD_FOLDERS.PROFILE, ALLOWED_IMAGE_TYPES);
export const uploadKitchenImages = buildUploader(UPLOAD_FOLDERS.KITCHEN, ALLOWED_IMAGE_TYPES);
export const uploadFoodImage = buildUploader(UPLOAD_FOLDERS.FOOD, ALLOWED_IMAGE_TYPES);
export const uploadVerificationDoc = buildUploader(UPLOAD_FOLDERS.VERIFICATION, ALLOWED_DOC_TYPES);

/**
 * Delete a file from Cloudinary by public ID.
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    // Log but don't throw — cleanup failures shouldn't break business logic
    console.error('Cloudinary delete failed:', err.message);
  }
};

/**
 * Extract public_id from a Cloudinary URL.
 */
export const extractPublicId = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  const folder = parts[parts.length - 2];
  return `${folder}/${filename.split('.')[0]}`;
};
