const Review = require('../models/Review');
const Booking = require('../models/Booking');
const GuideProfile = require('../models/GuideProfile'); 

exports.createReview = async (req, res, next) => {
  try {
    const userId    = req.user._id;
    const { bookingId, rating, comment } = req.body;

    // Kiểm tra booking tồn tại và đã qua
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking không tồn tại' });
    if (new Date(booking.date) > new Date()) {
      return res.status(400).json({ message: 'Chưa đến ngày tham quan' });
    }

    const review = await Review.create({
      booking: bookingId,
      reviewer: userId,
      rating,
      comment
    });

    const guideId = booking.guide; 
    if (guideId) {
      const bookings = await Booking.find({ guide: guideId });
      const bookingIds = bookings.map(b => b._id);

      const guideReviews = await Review.find({ booking: { $in: bookingIds } });

      const avgRating =
        guideReviews.reduce((sum, r) => sum + r.rating, 0) / guideReviews.length;

      await GuideProfile.findOneAndUpdate(guideId, { rating: avgRating.toFixed(1) });
    }

    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
};

exports.getReviewsByBooking = async (req, res, next) => {
  try {
    const reviews = await Review.find({ booking: req.params.bookingId })
      .populate('reviewer', 'name');
    res.json(reviews);
  } catch (err) {
    next(err);
  }
};
