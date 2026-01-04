// middleware/roleMiddleware.js

// Kiểm tra role
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Bạn chưa đăng nhập' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'Bạn không có quyền truy cập',
        requiredRole: allowedRoles,
        yourRole: req.user.role
      });
    }

    next();
  };
};

// Shortcuts
const isAdmin = checkRole('admin');
const isGuide = checkRole('guide', 'admin');
const isTourist = checkRole('tourist', 'guide', 'admin');

// Kiểm tra owner
const isGuideOwner = async (req, res, next) => {
  try {
    const guideId = req.params.id || req.params.guideId;
    
    if (req.user.role === 'admin') {
      return next();
    }

    if (req.user.role === 'guide' && req.user._id.toString() === guideId) {
      return next();
    }

    return res.status(403).json({ 
      success: false,
      message: 'Bạn chỉ có thể thao tác trên tài khoản của mình' 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

const isBookingOwner = async (req, res, next) => {
  try {
    const Booking = require('../models/Booking');
    const bookingId = req.params.id;
    
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy booking' 
      });
    }

    if (req.user.role === 'admin' ||
        booking.touristId.toString() === req.user._id.toString() ||
        booking.guideId.toString() === req.user._id.toString()) {
      req.booking = booking; // Gắn vào req để controller dùng
      return next();
    }

    return res.status(403).json({ 
      success: false,
      message: 'Bạn không có quyền truy cập booking này' 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

module.exports = {
  checkRole,
  isAdmin,
  isGuide,
  isTourist,
  isGuideOwner,
  isBookingOwner
};