import { Router } from 'express';
import {
  createPaymentOrder, verifyPayment,
  getPaymentHistory, getPaymentById,
} from '../controllers/payment.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();
router.use(authenticate, authorize(ROLES.CUSTOMER));

router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);
router.get('/history', getPaymentHistory);
router.get('/:id', getPaymentById);

export default router;
