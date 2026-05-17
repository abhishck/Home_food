import { Router } from 'express';
import {
  getNotifications, markAsRead, deleteNotification,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', getNotifications);
router.patch('/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
