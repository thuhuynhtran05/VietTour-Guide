const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Location = require('../models/Location');
const GuideProfile = require('../models/GuideProfile');
const User = require('../models/User');

/**
 * POST /api/payment
 * Tạo booking + payment (từ payment.html)
 * 🔥 FIX: Thêm paymentStatus và paymentMethod vào booking
 */
exports.createPayment = async (req, res, next) => {
  try {
    const {
      locationId,
      guideId,
      date,
      timeSlot,
      guests,
      phone,
      notes,
      method,
      total
    } = req.body;

    console.log('💳 Creating payment:', req.body);

    // Validate required fields
    if (!locationId || !guideId || !date || !timeSlot || !method || !total) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: locationId, guideId, date, timeSlot, method, total'
      });
    }

    // Kiểm tra location tồn tại
    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy địa điểm'
      });
    }

    // ✅ FIX: Tìm GuideProfile linh hoạt (có thể nhận GuideProfile ID hoặc User ID)
    let guideProfile;
    
    // Thử tìm theo GuideProfile ID trước
    guideProfile = await GuideProfile.findById(guideId);
    
    // Nếu không tìm thấy, thử tìm theo User ID
    if (!guideProfile) {
      console.log('⚠️ Not found by GuideProfile ID, trying User ID...');
      guideProfile = await GuideProfile.findOne({ user: guideId });
    }

    if (!guideProfile) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hướng dẫn viên'
      });
    }

    console.log('✅ Found GuideProfile:', guideProfile._id);

    // 🔥 FIX: Tạo Booking với paymentStatus và paymentMethod
    const booking = new Booking({
      user: req.user._id,
      guide: guideProfile._id, // ✅ Luôn dùng GuideProfile._id
      location: locationId,
      date: new Date(date),
      timeSlot,
      price: total,
      total: total, // 🔥 FIX: Thêm field total
      status: 'pending',
      paymentStatus: 'paid', // 🔥 FIX: Set paymentStatus = paid
      paymentMethod: method, // 🔥 FIX: Lưu payment method
      guests: guests || 1,
      phone: phone || '',
      notes: notes || ''
    });

    await booking.save();
    console.log('✅ Booking created:', booking._id);

    // 2. Tạo Payment
    const payment = new Payment({
      user: req.user._id,
      booking: booking._id,
      method,
      amount: total,
      status: 'paid'
    });

    await payment.save();
    console.log('✅ Payment created:', payment._id);

    // 3. Populate để trả về đầy đủ thông tin
    await booking.populate([
      { path: 'user', select: 'name email phone' },
      { 
        path: 'guide',
        select: '_id locations approved',
        populate: {
          path: 'user',
          select: 'name email'
        }
      },
      { path: 'location', select: 'name category price images' }
    ]);

    return res.status(201).json({
      success: true,
      message: 'Đặt tour thành công! Vui lòng chờ admin xác nhận.',
      booking,
      payment
    });

  } catch (error) {
    console.error('❌ Payment error:', error);
    next(error);
  }
};

/**
 * GET /api/payment/my
 * Lấy lịch sử thanh toán của user
 */
exports.getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate({
        path: 'booking',
        populate: [
          { path: 'location', select: 'name category images price' },
          { 
            path: 'guide',
            select: '_id',
            populate: {
              path: 'user',
              select: 'name email'
            }
          }
        ]
      })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: payments.length,
      payments
    });

  } catch (error) {
    console.error('❌ Get payments error:', error);
    next(error);
  }
};