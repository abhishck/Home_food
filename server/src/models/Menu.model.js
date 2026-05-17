import mongoose from 'mongoose';
import { FOOD_TYPE, MENU_CATEGORY } from '../constants/index.js';

const MenuSchema = new mongoose.Schema(
  {
    cook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CookProfile',
      required: true,
    },
    cookUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true,
      maxlength: [100, 'Title too long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description too long'],
    },
    category: {
      type: String,
      enum: Object.values(MENU_CATEGORY),
      required: [true, 'Category is required'],
    },
    foodType: {
      type: String,
      enum: Object.values(FOOD_TYPE),
      required: [true, 'Food type (veg/non_veg/egg) is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [1, 'Price must be at least ₹1'],
      max: [10000, 'Price cannot exceed ₹10,000'],
    },
    discountedPrice: {
      type: Number,
      min: 0,
      validate: {
        validator: function (val) {
          return !val || val < this.price;
        },
        message: 'Discounted price must be less than original price',
      },
    },
    quantity: {
      type: Number,
      required: [true, 'Available quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    preparationTimeMinutes: { type: Number, default: 30, min: 5 },

    image: { type: String },
    imagePublicId: { type: String, select: false },

    ingredients: [{ type: String, trim: true }],
    allergens: [{ type: String, trim: true }],
    nutritionInfo: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
    },

    isAvailable: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },

    // Ratings denormalized from reviews
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalOrders: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

MenuSchema.index({ cook: 1 });
MenuSchema.index({ cookUser: 1 });
MenuSchema.index({ category: 1 });
MenuSchema.index({ foodType: 1 });
MenuSchema.index({ isAvailable: 1 });
MenuSchema.index({ price: 1 });
MenuSchema.index({ title: 'text', description: 'text' });

// Effective price virtual
MenuSchema.virtual('effectivePrice').get(function () {
  return this.discountedPrice || this.price;
});

const Menu = mongoose.model('Menu', MenuSchema);
export default Menu;
