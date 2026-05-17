import { Router } from 'express';
import {
  createReview, getCookReviews, replyCookReview, getMyReviews,
} from '../controllers/review.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createReviewSchema, cookReplySchema } from '../validators/review.validator.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Public
router.get('/cook/:cookId', getCookReviews);

// Authenticated
router.use(authenticate);
router.get('/my', getMyReviews);
router.post('/', authorize(ROLES.CUSTOMER), validate(createReviewSchema), createReview);
router.post('/:reviewId/reply', authorize(ROLES.COOK), validate(cookReplySchema), replyCookReview);

export default router;
