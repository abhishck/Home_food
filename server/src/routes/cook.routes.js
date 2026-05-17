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

// Public routes
router.get('/nearby', validate(nearbyKitchenSchema), getNearbyKitchens);
router.get('/:id', getCookById);

// Cook-only protected routes
router.use(authenticate, authorize(ROLES.COOK));

router.post('/profile', validate(createCookProfileSchema), createCookProfile);
router.get('/profile/me', getMyCookProfile);
router.patch('/profile', validate(updateCookProfileSchema), updateCookProfile);
router.patch('/availability', toggleAvailability);
router.post('/images', kitchenImageUpload.array('images', 8), uploadKitchenImages);
router.delete('/images/:imageId', deleteKitchenImage);
router.post('/verification-docs', uploadVerificationDoc.single('document'), uploadVerificationDocs);

export default router;
