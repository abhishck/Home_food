import config from '../config/index.js';

/**
 * Builds a paginated query result.
 * @param {Model} Model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} options - { page, limit, sort, populate, select }
 * @returns {Object} { docs, meta }
 */
export const paginate = async (Model, filter = {}, options = {}) => {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(
    parseInt(options.limit, 10) || config.pagination.defaultSize,
    config.pagination.maxSize
  );
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };

  let query = Model.find(filter).sort(sort).skip(skip).limit(limit);

  if (options.select) query = query.select(options.select);
  if (options.populate) {
    const populations = Array.isArray(options.populate)
      ? options.populate
      : [options.populate];
    populations.forEach((pop) => (query = query.populate(pop)));
  }

  const [docs, total] = await Promise.all([
    query.exec(),
    Model.countDocuments(filter),
  ]);

  return {
    docs,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Extracts pagination params from request query.
 */
export const getPaginationOptions = (query) => ({
  page: query.page,
  limit: query.limit,
  sort: query.sort ? parseSortParam(query.sort) : { createdAt: -1 },
});

const parseSortParam = (sortStr) => {
  const fields = sortStr.split(',');
  return fields.reduce((acc, field) => {
    if (field.startsWith('-')) {
      acc[field.slice(1)] = -1;
    } else {
      acc[field] = 1;
    }
    return acc;
  }, {});
};
