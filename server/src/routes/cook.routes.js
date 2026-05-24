import { Router } from 'express';
import {
  createCookProfile, getMyCookProfile, updateCookProfile,
  toggleAvailability, uploadKitchenImages, deleteKitchenImage,
  uploadVerificationDocs, getNearbyKitchens, getCookById,
} from '../controllers/cook.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCookProfileSchema, updateCookProfileSchema, nearbyKitchenSchema,
} from '../validators/cook.validator.js';
import { uploadKitchenImages as kitchenImageUpload, uploadVerificationDoc } from '../utils/upload.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────
// IMPORTANT: specific paths must come BEFORE /:id wildcard
router.get('/nearby', validate(nearbyKitchenSchema), getNearbyKitchens);

// ── Cook-only protected routes ─────────────────────────────────────────────
// These must come BEFORE /:id to avoid "profile" being treated as an ObjectId
router.post('/profile', authenticate, authorize(ROLES.COOK), validate(createCookProfileSchema), createCookProfile);
router.get('/profile/me', authenticate, authorize(ROLES.COOK), getMyCookProfile);
router.patch('/profile', authenticate, authorize(ROLES.COOK), validate(updateCookProfileSchema), updateCookProfile);
router.patch('/availability', authenticate, authorize(ROLES.COOK), toggleAvailability);
router.post('/images', authenticate, authorize(ROLES.COOK), kitchenImageUpload.array('images', 8), uploadKitchenImages);
router.delete('/images/:imageId', authenticate, authorize(ROLES.COOK), deleteKitchenImage);
router.post('/verification-docs', authenticate, authorize(ROLES.COOK), uploadVerificationDoc.single('document'), uploadVerificationDocs);

// ── Wildcard — MUST be last ────────────────────────────────────────────────
router.get('/:id', getCookById);

export default router;
