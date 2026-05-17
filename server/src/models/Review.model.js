import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true, // One review per order
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CookProfile',
      required: true,
    },
    menuItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Menu',
      },
    ],

    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5'],
    },
    foodRating: { type: Number, min: 1, max: 5 },
    packagingRating: { type: Number, min: 1, max: 5 },
    deliveryRating: { type: Number, min: 1, max: 5 },

    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
    },
    images: [{ type: String }],

    isVerifiedPurchase: { type: Boolean, default: true },
    helpfulCount: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },

    // Cook response
    cookReply: {
      text: { type: String, trim: true, maxlength: 500 },
      repliedAt: Date,
    },
  },
  { timestamps: true }
);

// order index auto-created via unique:true
ReviewSchema.index({ cook: 1, createdAt: -1 });
ReviewSchema.index({ customer: 1 });
ReviewSchema.index({ rating: -1 });

// Post-save: update cook's averageRating
ReviewSchema.post('save', async function () {
  const CookProfile = mongoose.model('CookProfile');
  const stats = await mongoose.model('Review').aggregate([
    { $match: { cook: this.cook, isVisible: true } },
    {
      $group: {
        _id: '$cook',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await CookProfile.findByIdAndUpdate(this.cook, {
      averageRating: Math.round(stats[0].avgRating * 10) / 10,
      totalReviews: stats[0].count,
    });
  }
});

const Review = mongoose.model('Review', ReviewSchema);
export default Review;
