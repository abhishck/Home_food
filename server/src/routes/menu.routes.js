import { Router } from 'express';
import {
  createMenuItem, getMyMenu, getCookMenu, getMenuItemById,
  updateMenuItem, deleteMenuItem, toggleAvailability, searchMenu,
} from '../controllers/menu.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createMenuSchema, updateMenuSchema, menuQuerySchema } from '../validators/menu.validator.js';
import { uploadFoodImage } from '../utils/upload.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────
// IMPORTANT: /search and /cook/:cookId MUST come before /:id wildcard
router.get('/search', validate(menuQuerySchema), searchMenu);
router.get('/cook/:cookId', validate(menuQuerySchema), getCookMenu);

// ── Cook protected routes ─────────────────────────────────────────────────
// /my MUST come before /:id
router.get('/my', authenticate, authorize(ROLES.COOK), getMyMenu);
router.post('/', authenticate, authorize(ROLES.COOK), uploadFoodImage.single('image'), validate(createMenuSchema), createMenuItem);
router.patch('/:id/toggle', authenticate, authorize(ROLES.COOK), toggleAvailability);
router.patch('/:id', authenticate, authorize(ROLES.COOK), uploadFoodImage.single('image'), validate(updateMenuSchema), updateMenuItem);
router.delete('/:id', authenticate, authorize(ROLES.COOK), deleteMenuItem);

// ── Wildcard — MUST be last ────────────────────────────────────────────────
router.get('/:id', getMenuItemById);

export default router;
