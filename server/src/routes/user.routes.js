import { Router } from 'express';
import {
  getProfile, updateProfile, uploadAvatar,
  getAddresses, addAddress, updateAddress, deleteAddress,
  deleteAccount,
} from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { uploadProfileImage } from '../utils/upload.js';

const router = Router();
router.use(authenticate);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.post('/avatar', uploadProfileImage.single('avatar'), uploadAvatar);

router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.patch('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', deleteAddress);

router.delete('/account', deleteAccount);

export default router;
