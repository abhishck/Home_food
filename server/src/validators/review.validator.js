import Joi from 'joi';

export const createReviewSchema = {
  body: Joi.object({
    orderId: Joi.string().hex().length(24).required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    foodRating: Joi.number().integer().min(1).max(5).optional(),
    packagingRating: Joi.number().integer().min(1).max(5).optional(),
    deliveryRating: Joi.number().integer().min(1).max(5).optional(),
    comment: Joi.string().max(1000).optional(),
  }),
};

export const cookReplySchema = {
  body: Joi.object({
    text: Joi.string().min(2).max(500).required(),
  }),
  params: Joi.object({
    reviewId: Joi.string().hex().length(24).required(),
  }),
};
