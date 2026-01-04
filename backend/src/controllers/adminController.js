const User = require('../models/User');
const GuideProfile = require('../models/GuideProfile');
const Location = require('../models/Location');
const Booking = require('../models/Booking');

/* ======================================================
   GET /api/admin/guides/pending
   Lấy danh sách hướng dẫn viên chờ duyệt
====================================================== */
exports.getPendingGuides = async function (req, res) {
  try {
    // ✅ Tìm GUIDE với status = pending
    const guides = await User.find({ 
      role: 'guide', 
      status: 'pending' 
    }).select('name email phone languages bio createdAt');

    return res.json({
      success: true,
      guides: guides.map(function (g) {
        return {
          id: g._id,  // ✅ Trả về User._id
          name: g.name,
          email: g.email,
          phone: g.phone,
          languages: g.languages || [],
          bio: g.bio || '',
          createdAt: g.createdAt
        };
      })
    });

  } catch (err) {
    console.error('Get pending guides error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách HDV'
    });
  }
};

/* ======================================================
   PATCH /api/admin/guides/approve/:id
   Duyệt hướng dẫn viên
====================================================== */
exports.approveGuide = async function (req, res) {
  try {
    const userId = req.params.id;  // ✅ Nhận User._id

    // 1. Tìm User
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    // 2. Kiểm tra role
    if (user.role !== 'guide') {
      return res.status(400).json({
        success: false,
        message: 'Người dùng không phải là hướng dẫn viên'
      });
    }

    // 3. Cập nhật status → active
    user.status = 'active';
    user.approvedAt = new Date();
    user.approvedBy = req.user.id;  // Admin ID từ middleware
    await user.save();

    // 4. Cập nhật GuideProfile (nếu có)
    await GuideProfile.findOneAndUpdate(
      { user: userId },
      { approved: true },
      { new: true }
    );

    console.log('✅ Guide approved:', userId);

    return res.json({
      success: true,
      message: 'Đã duyệt hướng dẫn viên thành công'
    });

  } catch (err) {
    console.error('Approve guide error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi duyệt HDV'
    });
  }
};

/* ======================================================
   PATCH /api/admin/guides/reject/:id
   Từ chối hướng dẫn viên
====================================================== */
exports.rejectGuide = async function (req, res) {
  try {
    const userId = req.params.id;  // ✅ Nhận User._id
    const { reason } = req.body;  // Lý do từ chối (optional)

    // 1. Tìm User
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    // 2. Kiểm tra role
    if (user.role !== 'guide') {
      return res.status(400).json({
        success: false,
        message: 'Người dùng không phải là hướng dẫn viên'
      });
    }

    // 3. Cập nhật status → rejected
    user.status = 'rejected';
    user.role = 'user';  // ✅ Đổi về user
    user.rejectedAt = new Date();
    user.rejectedBy = req.user.id;  // Admin ID
    user.rejectionReason = reason || 'Không đạt yêu cầu';
    await user.save();

    // 4. Xóa GuideProfile (nếu có)
    await GuideProfile.findOneAndDelete({ user: userId });

    console.log('✅ Guide rejected:', userId);

    return res.json({
      success: true,
      message: 'Đã từ chối hướng dẫn viên'
    });

  } catch (err) {
    console.error('Reject guide error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi từ chối HDV'
    });
  }
};

/* ======================================================
   GET /api/admin/bookings/pending
   Lấy booking chờ duyệt
====================================================== */
exports.getPendingBookings = async function (req, res) {
  try {
    const list = await Booking.find({ status: 'pending' })
      .populate('user', 'name email phone')
      .populate({
        path: 'guide',
        populate: { path: 'user', select: 'name email' }
      })
      .populate('location', 'name price')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      bookings: list
    });

  } catch (err) {
    console.error('Get pending bookings error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách booking'
    });
  }
};

/* ======================================================
   PUT /api/admin/bookings/:id
   Cập nhật trạng thái booking
====================================================== */
exports.updateBookingStatus = async function (req, res) {
  try {
    const id = req.params.id;
    const status = req.body.status;

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (validStatuses.indexOf(status) === -1) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ'
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      id,
      { status: status },
      { new: true }
    ).populate('user', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy booking'
      });
    }

    return res.json({
      success: true,
      message: 'Đã cập nhật trạng thái booking',
      booking: booking
    });

  } catch (err) {
    console.error('Update booking status error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật booking'
    });
  }
};

/* ======================================================
   GET /api/admin/statistics
   Thống kê tổng quan
====================================================== */
exports.getStatistics = async function (req, res) {
  try {
    // ✅ Đếm theo User model
    const pendingGuideCount = await User.countDocuments({ 
      role: 'guide', 
      status: 'pending' 
    });
    
    const approvedGuideCount = await User.countDocuments({ 
      role: 'guide', 
      status: 'active' 
    });
    
    const totalGuideCount = await User.countDocuments({ 
      role: 'guide' 
    });

    const locationCount = await Location.countDocuments();
    const totalBookingCount = await Booking.countDocuments();
    const pendingBookingCount = await Booking.countDocuments({ status: 'pending' });
    const completedBookingCount = await Booking.countDocuments({ status: 'completed' });

    return res.json({
      success: true,
      statistics: {
        guides: {
          pending: pendingGuideCount,
          approved: approvedGuideCount,
          total: totalGuideCount
        },
        locations: {
          total: locationCount
        },
        bookings: {
          total: totalBookingCount,
          pending: pendingBookingCount,
          completed: completedBookingCount
        }
      }
    });

  } catch (err) {
    console.error('Get statistics error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê'
    });
  }
};

/* ======================================================
   GET /api/admin/chart
   Dữ liệu biểu đồ 7 ngày
====================================================== */
exports.getChartData = async function (req, res) {
  try {
    const oneWeek = new Date();
    oneWeek.setDate(oneWeek.getDate() - 7);
    oneWeek.setHours(0, 0, 0, 0);

    const bookings = await Booking.find({
      createdAt: {
        $gte: oneWeek,
        $lte: new Date()
      }
    });

    const dailyTotals = {};

    bookings.forEach(function (b) {
      const date = b.createdAt.toISOString().split('T')[0];
      if (!dailyTotals[date]) {
        dailyTotals[date] = { totalMoney: 0, bookingCount: 0 };
      }
      dailyTotals[date].totalMoney += b.price || 0;
      dailyTotals[date].bookingCount += 1;
    });

    const chartData = Object.keys(dailyTotals).map(function (date) {
      return {
        date: date,
        totalMoney: dailyTotals[date].totalMoney,
        bookingCount: dailyTotals[date].bookingCount
      };
    });

    return res.json({
      success: true,
      chartData: chartData
    });

  } catch (err) {
    console.error('Chart data error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy dữ liệu biểu đồ'
    });
  }
};

/* ======================================================
   🆕 GET /api/admin/guides/my-applications/statistics
   Thống kê guide applications (FIX CHO BUG REJECTED)
====================================================== */
exports.getGuideApplicationStatistics = async function (req, res) {
  try {
    console.log('📊 Getting guide applications statistics');
    
    // Đếm guides theo status
    const pending = await User.countDocuments({ 
      role: 'guide',
      status: 'pending'
    });
    
    const approved = await User.countDocuments({ 
      role: 'guide', 
      status: 'active'
    });
    
    // ✅ KEY FIX: Thêm rejected
    const rejected = await User.countDocuments({ 
      role: 'guide',
      status: 'rejected'
    });
    
    const total = await User.countDocuments({ 
      role: 'guide' 
    });

    console.log('✅ Statistics:', { total, pending, approved, rejected });

    return res.json({
      success: true,
      statistics: {
        total: total,
        pending: pending,
        approved: approved,
        rejected: rejected,    // ✅ FIELD MỚI - ĐÂY LÀ KEY FIX!
        totalGuides: approved
      }
    });

  } catch (err) {
    console.error('Get guide statistics error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê'
    });
  }
};

/* ======================================================
   🆕 GET /api/admin/guides/my-applications
   Danh sách guide applications
====================================================== */
exports.getGuideApplications = async function (req, res) {
  try {
    console.log('📋 Getting guide applications');
    
    const guides = await User.find({ 
      role: 'guide',
      status: { $in: ['pending', 'active', 'rejected'] }
    })
    .select('name email phone languages bio status createdAt')
    .sort({ createdAt: -1 });
    
    console.log('✅ Found guides:', guides.length);

    return res.json({
      success: true,
      guides: guides.map(function (g) {
        return {
          id: g._id.toString(),
          name: g.name,
          email: g.email,
          phone: g.phone || 'N/A',
          languages: g.languages || ['Tiếng Việt'],
          bio: g.bio || 'Chưa có mô tả',
          status: g.status,
          createdAt: g.createdAt
        };
      })
    });

  } catch (err) {
    console.error('Get guide applications error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách'
    });
  }
};