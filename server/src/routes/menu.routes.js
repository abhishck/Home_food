import { Router } from 'express';
import {
  createMenuItem, getMyMenu, getCookMenu, getMenuItemById,
  updateMenuItem, deleteMenuItem, toggleAvailability, searchMenu,
} from '../controllers/menu.controller.js';
import { authenticate, authorize, requireApprovedCook } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createMenuSchema, updateMenuSchema, menuQuerySchema } from '../validators/menu.validator.js';
import { uploadFoodImage } from '../utils/upload.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Public
router.get('/search', validate(menuQuerySchema), searchMenu);
router.get('/cook/:cookId', validate(menuQuerySchema), getCookMenu);
router.get('/:id', getMenuItemById);

// Cook protected
router.use(authenticate, authorize(ROLES.COOK), requireApprovedCook);

router.post('/', uploadFoodImage.single('image'), validate(createMenuSchema), createMenuItem);
router.get('/my', getMyMenu);
router.patch('/:id', uploadFoodImage.single('image'), validate(updateMenuSchema), updateMenuItem);
router.delete('/:id', deleteMenuItem);
router.patch('/:id/toggle', toggleAvailability);

export default router;
