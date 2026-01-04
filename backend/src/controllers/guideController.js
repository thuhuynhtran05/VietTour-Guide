// backend/src/controllers/guideController.js - VERSION 2 (Better Error Handling)
const User = require('../models/User');

// Import models - sử dụng try-catch để tránh lỗi nếu model không tồn tại
let GuideProfile = null;
let Guide = null;

try {
  GuideProfile = require('../models/GuideProfile');
} catch (err) {
  console.log('⚠️ GuideProfile model not found');
}

try {
  Guide = require('../models/Guide');
} catch (err) {
  console.log('⚠️ Guide model not found');
}

// ===== GET ALL GUIDES =====
exports.getGuides = async (req, res, next) => {
  try {
    const { locationId } = req.query;
    
    if (!GuideProfile) {
      // Fallback: Lấy từ Users với role='guide'
      const users = await User.find({ 
        role: 'guide',
        ...(locationId && { locations: locationId })
      }).select('name email phoneNumber languages bio rating');
      
      return res.json(users);
    }
    
    const filter = locationId ? { locations: locationId } : {};
    const guides = await GuideProfile.find(filter)
      .populate('user', 'name email phoneNumber');
    
    res.json(guides);
  } catch (err) {
    next(err);
  }
};

// ===== GET GUIDES BY LOCATION =====
exports.getGuidesByLocation = async (req, res, next) => {
  try {
    const { locationId } = req.query;
    if (!locationId) {
      return res.status(400).json({ message: 'Thiếu locationId' });
    }
    
    if (!GuideProfile) {
      // Fallback
      const users = await User.find({ 
        role: 'guide',
        locations: locationId
      }).select('name email phoneNumber languages bio');
      
      return res.json(users);
    }
    
    const guides = await GuideProfile.find({ locations: locationId })
      .populate('user', 'name email phoneNumber')
      .populate('locations', 'name');
    
    res.json(guides);
  } catch (err) {
    next(err);
  }
};

// ===== GET GUIDE BY ID - VERSION 2 =====
exports.getGuideById = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('🔍 GET /api/guides/' + id);

    let responseData = null;

    // ===== STRATEGY 1: Tìm theo GuideProfile ID =====
    if (GuideProfile) {
      try {
        console.log('🔄 Try 1: Finding by GuideProfile ID...');
        const guide = await GuideProfile.findById(id)
          .populate('user', 'name email phoneNumber')
          .populate('locations', 'name');
        
        if (guide) {
          console.log('✅ Found via GuideProfile ID');
          
          responseData = {
            _id: guide._id,
            user: {
              _id: guide.user._id,
              name: guide.user.name,
              email: guide.user.email,
              phoneNumber: guide.user.phoneNumber || 'Chưa cập nhật'
            },
            languages: guide.languages || [],
            bio: guide.bio || 'Chưa có thông tin giới thiệu',
            certifications: guide.certifications || [],
            pricePerDay: guide.pricePerDay || 0,
            experience: guide.experience || 0,
            rating: guide.rating || 5.0,
            locations: guide.locations || [],
            createdAt: guide.createdAt,
            updatedAt: guide.updatedAt
          };
          
          return res.json(responseData);
        }
        console.log('⚠️ Not found by GuideProfile ID');
      } catch (err) {
        console.log('⚠️ Error finding by GuideProfile ID:', err.message);
      }
    }

    // ===== STRATEGY 2: Tìm theo User ID =====
    try {
      console.log('🔄 Try 2: Finding by User ID...');
      const user = await User.findById(id);
      
      if (!user) {
        console.log('⚠️ User not found with ID:', id);
      } else if (user.role !== 'guide') {
        console.log('⚠️ User found but role is not "guide":', user.role);
      } else {
        console.log('✅ Found User with role=guide:', user.name);
        
        // Thử tìm GuideProfile tương ứng
        let guide = null;
        if (GuideProfile) {
          try {
            console.log('🔄 Searching for GuideProfile with user:', id);
            guide = await GuideProfile.findOne({ user: id })
              .populate('user', 'name email phoneNumber')
              .populate('locations', 'name');
            
            if (guide) {
              console.log('✅ Found associated GuideProfile');
            } else {
              console.log('⚠️ No GuideProfile found for this user');
            }
          } catch (err) {
            console.log('⚠️ Error finding GuideProfile:', err.message);
          }
        }
        
        if (guide) {
          // Có GuideProfile → trả về full data
          responseData = {
            _id: guide._id,
            user: {
              _id: guide.user._id,
              name: guide.user.name,
              email: guide.user.email,
              phoneNumber: guide.user.phoneNumber || 'Chưa cập nhật'
            },
            languages: guide.languages || [],
            bio: guide.bio || 'Chưa có thông tin giới thiệu',
            certifications: guide.certifications || [],
            pricePerDay: guide.pricePerDay || 0,
            experience: guide.experience || 0,
            rating: guide.rating || 5.0,
            locations: guide.locations || [],
            createdAt: guide.createdAt,
            updatedAt: guide.updatedAt
          };
        } else {
          // Không có GuideProfile → tạo response từ User
          console.log('ℹ️ Creating response from User data only');
          responseData = {
            _id: user._id,
            user: {
              _id: user._id,
              name: user.name,
              email: user.email,
              phoneNumber: user.phoneNumber || 'Chưa cập nhật'
            },
            languages: user.languages || ['Tiếng Việt'],
            bio: user.bio || 'Hướng dẫn viên chuyên nghiệp với nhiều năm kinh nghiệm.',
            certifications: user.certifications || [],
            pricePerDay: 500000,
            experience: 0,
            rating: user.rating || 5.0,
            locations: user.locations || [],
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          };
        }
        
        return res.json(responseData);
      }
    } catch (err) {
      console.log('⚠️ Error finding by User ID:', err.message);
    }

    // ===== STRATEGY 3: Tìm trong Guide model =====
    if (Guide) {
      try {
        console.log('🔄 Try 3: Finding by Guide model...');
        const guideDoc = await Guide.findById(id)
          .populate('user', 'name email phoneNumber');
        
        if (guideDoc) {
          console.log('✅ Found via Guide model');
          
          responseData = {
            _id: guideDoc._id,
            user: {
              _id: guideDoc.user._id,
              name: guideDoc.user.name,
              email: guideDoc.user.email,
              phoneNumber: guideDoc.user.phoneNumber || 'Chưa cập nhật'
            },
            languages: guideDoc.languages || [],
            bio: guideDoc.bio || 'Chưa có thông tin giới thiệu',
            certifications: guideDoc.certifications || [],
            pricePerDay: guideDoc.pricePerDay || 0,
            experience: 0,
            rating: guideDoc.rating || 5.0,
            status: guideDoc.status,
            locations: [],
            createdAt: guideDoc.createdAt,
            updatedAt: guideDoc.updatedAt
          };
          
          return res.json(responseData);
        }
        console.log('⚠️ Not found in Guide model');
      } catch (err) {
        console.log('⚠️ Error finding in Guide model:', err.message);
      }
    }

    // ===== NOT FOUND =====
    console.log('❌ Guide not found with ID:', id);
    return res.status(404).json({ 
      success: false,
      message: 'Không tìm thấy hướng dẫn viên' 
    });

  } catch (err) {
    console.error('❌ Unexpected error in getGuideById:', err);
    next(err);
  }
};

// ===== ASSIGN LOCATION TO GUIDE =====
exports.assignLocation = async (req, res, next) => {
  try {
    const guideId = req.params.id;
    const { locationId } = req.body;

    if (!locationId) {
      return res.status(400).json({ message: 'Thiếu locationId' });
    }

    if (!GuideProfile) {
      return res.status(500).json({ message: 'GuideProfile model not available' });
    }

    const guide = await GuideProfile.findById(guideId);
    if (!guide) {
      return res.status(404).json({ message: 'Guide không tồn tại' });
    }

    if (!guide.locations.includes(locationId)) {
      guide.locations.push(locationId);
      await guide.save();
      console.log(`✅ Gán location ${locationId} cho guide ${guideId}`);
    }

    res.json({ message: 'Gán thành công', guide });
  } catch (err) {
    console.error('❌ Lỗi assignLocation:', err);
    next(err);
  }
};

// ===== GET PENDING BOOKINGS =====
exports.getPendingBookings = async (req, res, next) => {
  try {
    const Booking = require('../models/Booking');
    
    const list = await Booking.find({ status: 'pending' })
      .populate('user', 'name')
      .populate({
        path: 'guide',
        populate: { path: 'user', select: 'name' }
      })
      .populate('location', 'name');
    
    res.json(list);
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   🆕 GET /api/guides/my-bookings
   Lấy tất cả bookings của Guide hiện tại
   🔥 FIX: Query đúng theo GuideProfile ID
====================================================== */
exports.getMyBookings = async (req, res, next) => {
  try {
    const Booking = require('../models/Booking');
    const userId = req.user.id; // Lấy từ auth middleware
    
    console.log('📋 Getting bookings for guide user:', userId);

    // 🔥 FIX: Tìm GuideProfile trước
    if (!GuideProfile) {
      return res.status(500).json({
        success: false,
        message: 'GuideProfile model not available'
      });
    }

    const guideProfile = await GuideProfile.findOne({ user: userId });
    
    if (!guideProfile) {
      console.log('⚠️ No GuideProfile found for user:', userId);
      return res.json({
        success: true,
        bookings: []
      });
    }

    console.log('✅ Found GuideProfile:', guideProfile._id);

    // 🔥 FIX: Lấy booking đã thanh toán HOẶC không có paymentStatus (để tương thích bookings cũ)
    const bookings = await Booking.find({ 
      guide: guideProfile._id,
      $or: [
        { paymentStatus: 'paid' },
        { paymentStatus: { $exists: false } } // Tương thích bookings cũ
      ]
    })
      .populate('user', 'name email phone')
      .populate('location', 'name category price')
      .sort({ createdAt: -1 });

    console.log('✅ Found paid bookings:', bookings.length);

    // Debug: Log first booking to check data
    if (bookings.length > 0) {
      console.log('📋 Sample booking data:', {
        guests: bookings[0].guests,
        total: bookings[0].total,
        price: bookings[0].price,
        paymentStatus: bookings[0].paymentStatus
      });
    }

    // Format response
    const formattedBookings = bookings.map(b => {
      const guests = b.guests || 1; // Default to 1 if not set
      
      return {
        _id: b._id,
        customer: {
          name: b.user?.name || 'N/A',
          email: b.user?.email || 'N/A',
          phone: b.user?.phone || b.phone || 'N/A'
        },
        location: {
          name: b.location?.name || 'N/A',
          category: b.location?.category || 'N/A'
        },
        date: b.date,
        timeSlot: b.timeSlot,
        guests: guests, // ✅ Use variable with default
        total: b.total || b.price || 0, // Support both field names
        phone: b.phone,
        notes: b.notes,
        paymentMethod: b.paymentMethod || 'N/A',
        paymentStatus: b.paymentStatus || 'paid', // Default paid for old bookings
        status: b.status,
        createdAt: b.createdAt
      };
    });

    res.json({
      success: true,
      bookings: formattedBookings
    });

  } catch (err) {
    console.error('❌ Get my bookings error:', err);
    next(err);
  }
};

/* ======================================================
   🆕 GET /api/guides/my-bookings/statistics
   Thống kê bookings của Guide hiện tại
   🔥 FIX: Query đúng theo GuideProfile ID
====================================================== */
exports.getMyBookingStatistics = async (req, res, next) => {
  try {
    const Booking = require('../models/Booking');
    const userId = req.user.id;

    console.log('📊 Getting statistics for guide user:', userId);

    // 🔥 FIX: Tìm GuideProfile trước
    if (!GuideProfile) {
      return res.status(500).json({
        success: false,
        message: 'GuideProfile model not available'
      });
    }

    const guideProfile = await GuideProfile.findOne({ user: userId });
    
    if (!guideProfile) {
      console.log('⚠️ No GuideProfile found for user:', userId);
      return res.json({
        success: true,
        statistics: {
          total: 0,
          pending: 0,
          confirmed: 0,
          completed: 0,
          revenue: 0
        }
      });
    }

    console.log('✅ Found GuideProfile:', guideProfile._id);

    // 🔥 FIX: Query theo GuideProfile._id
    const guideId = guideProfile._id;
    
    // 🔥 FIX: Đếm booking đã thanh toán HOẶC không có paymentStatus (bookings cũ)
    const totalBookings = await Booking.countDocuments({ 
      guide: guideId,
      $or: [
        { paymentStatus: 'paid' },
        { paymentStatus: { $exists: false } }
      ]
    });
    
    const pendingBookings = await Booking.countDocuments({ 
      guide: guideId, 
      status: 'pending',
      $or: [
        { paymentStatus: 'paid' },
        { paymentStatus: { $exists: false } }
      ]
    });
    
    const confirmedBookings = await Booking.countDocuments({ 
      guide: guideId, 
      status: 'confirmed',
      $or: [
        { paymentStatus: 'paid' },
        { paymentStatus: { $exists: false } }
      ]
    });
    
    const completedBookings = await Booking.countDocuments({ 
      guide: guideId, 
      status: 'completed',
      $or: [
        { paymentStatus: 'paid' },
        { paymentStatus: { $exists: false } }
      ]
    });

    // Tính tổng thu nhập (booking đã thanh toán HOẶC bookings cũ)
    const paidBookings = await Booking.find({ 
      guide: guideId,
      $or: [
        { paymentStatus: 'paid' },
        { paymentStatus: { $exists: false } }
      ]
    });
    
    const totalRevenue = paidBookings.reduce((sum, booking) => {
      return sum + (booking.total || booking.price || 0);
    }, 0);

    console.log('✅ Statistics calculated:', {
      total: totalBookings,
      pending: pendingBookings,
      confirmed: confirmedBookings,
      completed: completedBookings,
      revenue: totalRevenue
    });

    res.json({
      success: true,
      statistics: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
        revenue: totalRevenue
      }
    });

  } catch (err) {
    console.error('❌ Get my booking statistics error:', err);
    next(err);
  }
};