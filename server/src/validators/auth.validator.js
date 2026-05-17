import Joi from 'joi';
import { ROLES } from '../constants/index.js';

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .message(
    'Password must be at least 8 characters and contain uppercase, lowercase, and a number'
  )
  .required();

export const registerSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(60).required(),
    email: Joi.string().email().lowercase().required(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
    password: passwordSchema,
    role: Joi.string()
      .valid(ROLES.CUSTOMER, ROLES.COOK)
      .default(ROLES.CUSTOMER),
  }),
};

export const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().required(),
  }),
};

export const forgotPasswordSchema = {
  body: Joi.object({
    email: Joi.string().email().lowercase().required(),
  }),
};

export const resetPasswordSchema = {
  body: Joi.object({
    password: passwordSchema,
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({ 'any.only': 'Passwords do not match' }),
  }),
  params: Joi.object({
    token: Joi.string().hex().length(64).required(),
  }),
};

export const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: passwordSchema,
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({ 'any.only': 'Passwords do not match' }),
  }),
};

export const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};
