import { Router } from 'express';
import {
  getDashboardStats, getAllUsers, toggleUserStatus,
  getAllCooks, verifyCook, getAllOrders, removeReview, getAllPayments,
} from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { verifyCookSchema } from '../validators/cook.validator.js';
import { ROLES } from '../constants/index.js';

const router = Router();
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/dashboard', getDashboardStats);

// Users
router.get('/users', getAllUsers);
router.patch('/users/:id/toggle-status', toggleUserStatus);

// Cooks
router.get('/cooks', getAllCooks);
router.patch('/cooks/:cookId/verify', validate(verifyCookSchema), verifyCook);

// Orders
router.get('/orders', getAllOrders);

// Reviews
router.delete('/reviews/:id', removeReview);

// Payments
router.get('/payments', getAllPayments);

export default router;
