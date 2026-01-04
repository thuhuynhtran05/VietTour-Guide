const express = require('express');
const router = express.Router();
const { getPendingGuides, approveGuide, rejectGuide, updateBookingStatus, getPendingBookings, getStatistics, getChartData } = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware, (req,res,next) => {
  if (req.user.role!=='admin') return res.status(403).json({ message:'Chỉ admin' });
  next();
});

router.get('/guides/pending', getPendingGuides);
router.patch('/guides/approve/:id', approveGuide);
router.patch('/guides/reject/:id', rejectGuide);
router.put('/bookings/:id', updateBookingStatus);
router.get('/bookings/pending', getPendingBookings);
router.get('/statistics', getStatistics);
router.get('/chart', getChartData);

module.exports = router;
