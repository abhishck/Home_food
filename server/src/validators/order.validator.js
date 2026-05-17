import Joi from 'joi';
import { ORDER_STATUS } from '../constants/index.js';

const objectIdSchema = Joi.string().hex().length(24);

export const createOrderSchema = {
  body: Joi.object({
    cookId: objectIdSchema.required(),
    items: Joi.array()
      .items(
        Joi.object({
          menuItemId: objectIdSchema.required(),
          quantity: Joi.number().integer().min(1).max(20).required(),
        })
      )
      .min(1)
      .required(),
    deliveryAddressId: objectIdSchema.required(),
    cookInstructions: Joi.string().max(300).optional(),
  }),
};

export const updateOrderStatusSchema = {
  body: Joi.object({
    status: Joi.string()
      .valid(
        ORDER_STATUS.ACCEPTED,
        ORDER_STATUS.PREPARING,
        ORDER_STATUS.OUT_FOR_DELIVERY,
        ORDER_STATUS.DELIVERED,
        ORDER_STATUS.CANCELLED
      )
      .required(),
    note: Joi.string().max(200).optional(),
  }),
  params: Joi.object({ id: objectIdSchema.required() }),
};

export const cancelOrderSchema = {
  body: Joi.object({
    reason: Joi.string().min(5).max(300).required(),
  }),
  params: Joi.object({ id: objectIdSchema.required() }),
};

export const orderQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(...Object.values(ORDER_STATUS)).optional(),
    sort: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  }),
};
