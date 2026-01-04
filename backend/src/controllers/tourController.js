const Booking = require('../models/Booking');
const mongoose = require('mongoose');
const GuideProfile = require('../models/GuideProfile');


exports.getAllBookingsToday = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const guideProfile = await GuideProfile.findOne({ user: userId });
    if (!guideProfile) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ hướng dẫn viên' });
    }
    
    const bookings = await Booking.find({ guide: guideProfile._id})
    .populate('user', 'name')
    .populate('location', 'name');
    
    res.json(bookings);
  } catch (err) {
      next(err);
  }
};

exports.getPendingBookings = async (req, res, next) => {
    try {
      const userId = req.user.id;

      const guideProfile = await GuideProfile.findOne({ user: userId });
      if (!guideProfile) {
        return res.status(404).json({ message: 'Không tìm thấy hồ sơ hướng dẫn viên' });
      }
      
      const bookings = await Booking.find({ guide: guideProfile._id, status: 'pending' })
      .populate('user', 'name')
      .populate('location', 'name');
      
      res.json(bookings);
    } catch (err) {
        next(err);
    }
};  

exports.updateBookingStatus = async (req, res, next) => {
    try {
      const { id }     = req.params;
      const { status } = req.body;
      if (!['confirmed','cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Status không hợp lệ' });
      }
      const booking = await Booking.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      if (!booking) {
        return res.status(404).json({ message: 'Không tìm thấy booking' });
      }
      res.json(booking);
    } catch (err) {
      next(err);
    }
  };