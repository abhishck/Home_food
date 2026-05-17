import { Router } from 'express';
import {
  createOrder, updateOrderStatus, cancelOrder,
  getMyOrders, getOrderById,
} from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createOrderSchema, updateOrderStatusSchema,
  cancelOrderSchema, orderQuerySchema,
} from '../validators/order.validator.js';
import { ROLES } from '../constants/index.js';

const router = Router();
router.use(authenticate);

// Customer routes
router.post('/', authorize(ROLES.CUSTOMER), validate(createOrderSchema), createOrder);
router.post('/:id/cancel', authorize(ROLES.CUSTOMER), validate(cancelOrderSchema), cancelOrder);

// Cook routes
router.patch('/:id/status', authorize(ROLES.COOK), validate(updateOrderStatusSchema), updateOrderStatus);

// Shared
router.get('/', validate(orderQuerySchema), getMyOrders);
router.get('/:id', getOrderById);

export default router;
