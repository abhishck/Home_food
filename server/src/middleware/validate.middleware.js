import ApiError from '../utils/ApiError.js';

/**
 * Joi schema validation middleware factory.
 * @param {Object} schema - Joi schema with optional: body, query, params
 * @param {Object} options - Joi validation options
 */
export const validate = (schema, options = {}) => (req, res, next) => {
  const joiOptions = {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
    ...options,
  };

  const errors = [];

  for (const key of ['body', 'query', 'params']) {
    if (schema[key]) {
      const { error, value } = schema[key].validate(req[key], joiOptions);
      if (error) {
        const msgs = error.details.map((d) => d.message.replace(/"/g, "'"));
        errors.push(...msgs);
      } else {
        req[key] = value; // Replace with stripped/coerced values
      }
    }
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed', errors));
  }

  next();
};
