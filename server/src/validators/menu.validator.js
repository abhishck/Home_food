import Joi from 'joi';
import { FOOD_TYPE, MENU_CATEGORY } from '../constants/index.js';

export const createMenuSchema = {
  body: Joi.object({
    title: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).allow('', null).optional(),
    category: Joi.string().valid(...Object.values(MENU_CATEGORY)).required(),
    foodType: Joi.string().valid(...Object.values(FOOD_TYPE)).required(),
    price: Joi.alternatives().try(Joi.number().min(1).max(10000), Joi.string()).required(),
    discountedPrice: Joi.alternatives().try(Joi.number().min(0), Joi.string()).allow(null, '').optional(),
    quantity: Joi.alternatives().try(Joi.number().integer().min(0), Joi.string()).required(),
    preparationTimeMinutes: Joi.number().integer().min(5).default(30),
    ingredients: Joi.array().items(Joi.string().trim()).optional(),
    allergens: Joi.array().items(Joi.string().trim()).optional(),
    isAvailable: Joi.alternatives().try(Joi.boolean(), Joi.string()).default(true),
  }),
};

export const updateMenuSchema = {
  body: Joi.object({
    title: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).allow('', null).optional(),
    category: Joi.string().valid(...Object.values(MENU_CATEGORY)).optional(),
    foodType: Joi.string().valid(...Object.values(FOOD_TYPE)).optional(),
    price: Joi.alternatives().try(Joi.number().min(1).max(10000), Joi.string()).optional(),
    discountedPrice: Joi.alternatives().try(Joi.number().min(0), Joi.string()).allow(null, '').optional(),
    quantity: Joi.alternatives().try(Joi.number().integer().min(0), Joi.string()).optional(),
    preparationTimeMinutes: Joi.number().integer().min(5).optional(),
    ingredients: Joi.array().items(Joi.string().trim()).optional(),
    allergens: Joi.array().items(Joi.string().trim()).optional(),
    isAvailable: Joi.alternatives().try(Joi.boolean(), Joi.string()).optional(),
    isFeatured: Joi.boolean().optional(),
  }),
  params: Joi.object({ id: Joi.string().hex().length(24).required() }),
};

export const menuQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    category: Joi.string().valid(...Object.values(MENU_CATEGORY)).optional(),
    foodType: Joi.string().valid(...Object.values(FOOD_TYPE)).optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    isAvailable: Joi.boolean().optional(),
    sort: Joi.string().optional(),
    search: Joi.string().optional(),
    q: Joi.string().optional(),         // frontend uses ?q=
    cookId: Joi.string().hex().length(24).optional(),
  }),
};
