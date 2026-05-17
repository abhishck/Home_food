import { Router } from 'express';
import {
  register, login, logout, refreshToken,
  forgotPassword, resetPassword, changePassword, getMe,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  registerSchema, loginSchema, forgotPasswordSchema,
  resetPasswordSchema, changePasswordSchema, refreshTokenSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.patch('/reset-password/:token', validate(resetPasswordSchema), resetPassword);
router.patch('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.get('/me', authenticate, getMe);

export default router;
