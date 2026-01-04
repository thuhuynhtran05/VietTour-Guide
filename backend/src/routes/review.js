const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const {
  createReview,
  getReviewsByBooking
} = require('../controllers/reviewController');

router.post('/', auth, createReview);

router.get('/:bookingId', auth, getReviewsByBooking);

module.exports = router;
