import Joi from 'joi';

export const createCookProfileSchema = {
  body: Joi.object({
    kitchenName: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).allow('', null).optional(),
    // Accept either array or comma-separated string
    specialties: Joi.alternatives()
      .try(
        Joi.array().items(Joi.string().trim().max(50)).max(10),
        Joi.string().max(500)
      )
      .optional(),
    address: Joi.object({
      line1: Joi.string().required(),
      line2: Joi.string().allow('', null).optional(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      pincode: Joi.string().pattern(/^\d{6}$/).required(),
    }).required(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
    }).required(),
    maxDailyOrders: Joi.number().integer().min(1).max(200).default(20),
  }),
};

export const updateCookProfileSchema = {
  body: Joi.object({
    kitchenName: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).allow('', null).optional(),
    specialties: Joi.alternatives()
      .try(
        Joi.array().items(Joi.string().trim()).max(10),
        Joi.string().max(500)
      )
      .optional(),
    maxDailyOrders: Joi.number().integer().min(1).max(200).optional(),
    address: Joi.object({
      line1: Joi.string().optional(),
      line2: Joi.string().allow('', null).optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      pincode: Joi.string().pattern(/^\d{6}$/).optional(),
    }).optional(),
    availabilitySchedule: Joi.object().optional(),
  }),
};

export const nearbyKitchenSchema = {
  query: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(0.5).max(100).default(10),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    foodType: Joi.string().valid('veg', 'non_veg', 'egg').optional(),
  }),
};

export const verifyCookSchema = {
  body: Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'suspended').required(),
    adminNote: Joi.string().max(500).allow('', null).optional(),
  }),
  params: Joi.object({
    cookId: Joi.string().hex().length(24).required(),
  }),
};
