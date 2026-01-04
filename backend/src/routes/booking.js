// backend/src/routes/booking.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Booking = require('../models/Booking');

// ✅ GET /api/bookings/my - Lấy tất cả bookings của user hiện tại
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('📋 Getting bookings for user:', userId);

    // Lấy tất cả bookings của user
    const bookings = await Booking.find({ user: userId })
      .populate('location', 'name category price')
      .populate('guide', 'name email phone')  // ✅ guide là User ID trực tiếp
      .sort({ createdAt: -1 });

    console.log('✅ Found bookings:', bookings.length);

    // Format response
    const formattedBookings = bookings.map(b => ({
      id: b._id,
      location: {
        name: b.location?.name || 'N/A',
        category: b.location?.category || 'N/A'
      },
      guide: {
        user: {
          name: b.guide?.name || 'Chưa có',
          email: b.guide?.email || 'N/A'
        }
      },
      date: b.date,
      timeSlot: b.timeSlot,
      guests: b.guests,
      price: b.total || b.price,
      total: b.total,
      phone: b.phone,
      notes: b.notes,
      paymentMethod: b.paymentMethod,
      paymentStatus: b.paymentStatus,
      status: b.status,
      createdAt: b.createdAt
    }));

    res.json({
      success: true,
      bookings: formattedBookings
    });

  } catch (error) {
    console.error('❌ Get my bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách booking: ' + error.message
    });
  }
});

// ✅ GET /api/bookings/:id - Lấy chi tiết một booking
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findOne({ 
      _id: id,
      user: userId  // Chỉ cho phép user xem booking của mình
    })
      .populate('location', 'name category price')
      .populate('guide', 'name email phone');  // ✅ guide là User ID trực tiếp

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy booking'
      });
    }

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    console.error('❌ Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin booking'
    });
  }
});

// ✅ POST /api/bookings - Tạo booking mới (nếu chưa có)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      locationId,
      guideId,
      date,
      timeSlot,
      guests,
      total,
      phone,
      notes,
      paymentMethod
    } = req.body;

    // Validate required fields
    if (!locationId || !guideId || !date || !guests) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc'
      });
    }

    const booking = await Booking.create({
      user: userId,
      location: locationId,
      guide: guideId,
      date,
      timeSlot,
      guests,
      total,
      price: total,  // Fallback
      phone,
      notes,
      paymentMethod,
      paymentStatus: paymentMethod ? 'paid' : 'pending',
      status: 'pending'
    });

    console.log('✅ Booking created:', booking._id);

    res.status(201).json({
      success: true,
      message: 'Đặt tour thành công!',
      booking
    });

  } catch (error) {
    console.error('❌ Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo booking: ' + error.message
    });
  }
});

// ✅ PUT /api/bookings/:id/cancel - Hủy booking
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findOneAndUpdate(
      { 
        _id: id,
        user: userId,
        status: { $ne: 'cancelled' }  // Chỉ hủy nếu chưa bị hủy
      },
      { 
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: userId
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy booking hoặc booking đã bị hủy'
      });
    }

    res.json({
      success: true,
      message: 'Đã hủy booking thành công',
      booking
    });

  } catch (error) {
    console.error('❌ Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy booking'
    });
  }
});

module.exports = router;