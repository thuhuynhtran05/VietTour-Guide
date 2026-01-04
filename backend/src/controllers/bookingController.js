const Booking = require('../models/Booking');
const GuideProfile = require('../models/GuideProfile');
const Location = require('../models/Location');
const User = require('../models/User');

/* ======================================================
   POST /api/bookings
   Tạo booking mới (không qua payment)
====================================================== */
exports.createBooking = async (req, res, next) => {
  try {
    const userId = req.user._id;           
    const { 
      guideId, 
      locationId, 
      date, 
      timeSlot,
      guests,
      phone,
      notes 
    } = req.body;

    // Validate required fields
    if (!guideId || !locationId || !date || !timeSlot) {
      res.status(400);
      throw new Error('Thiếu thông tin guideId, locationId, date hoặc timeSlot');
    }

    // Check location exists
    const location = await Location.findById(locationId);
    if (!location) {
      res.status(404);
      throw new Error('Không tìm thấy địa điểm');
    }

    // Check guide exists
    const guide = await GuideProfile.findById(guideId);
    if (!guide) {
      res.status(404);
      throw new Error('Không tìm thấy hướng dẫn viên');
    }

    // Calculate total price
    const numberOfGuests = guests || 1;
    const totalPrice = location.price * numberOfGuests;

    // Create booking
    const booking = await Booking.create({
      user: userId,
      guide: guideId,
      location: locationId,
      date: new Date(date),
      timeSlot,
      guests: numberOfGuests,
      phone: phone || '',
      notes: notes || '',
      price: totalPrice,
      status: 'pending' // Chờ admin duyệt
    });

    // Populate để trả về đầy đủ thông tin
    await booking.populate([
      {
        path: 'guide',
        select: '_id locations approved',  
        populate: {
          path: 'userId',
          model: 'User',
          select: 'name email'
        }
      },
      { path: 'location', select: 'name category price' },
      { path: 'user', select: 'name email phone' }
    ]);

    console.log('✅ Booking created:', booking._id);

    // 🔥 FIX: EMIT SOCKET.IO EVENT TO GUIDE
    try {
      const io = req.app.get('io');
      if (io && guide.userId) {
        const guideUserId = guide.userId.toString();
        console.log('📡 Emitting newBooking to guide user:', guideUserId);
        
        // Emit to specific guide's room
        io.to(`guide_${guideUserId}`).emit('newBooking', {
          bookingId: booking._id,
          customer: {
            name: booking.user?.name || 'Khách hàng',
            email: booking.user?.email || '',
            phone: booking.user?.phone || phone || ''
          },
          location: {
            name: booking.location?.name || location.name,
            category: booking.location?.category || location.category
          },
          date: booking.date,
          timeSlot: booking.timeSlot,
          guests: booking.guests,
          total: booking.price,
          status: booking.status,
          createdAt: booking.createdAt
        });

        console.log('✅ Socket notification sent to guide:', guideUserId);
      } else {
        console.warn('⚠️ Socket.io not available or guide has no userId');
      }
    } catch (socketErr) {
      console.error('❌ Socket notification error:', socketErr);
      // Không throw error để không ảnh hưởng đến booking creation
    }

    res.status(201).json({
      success: true,
      message: 'Đặt tour thành công',
      booking
    });

  } catch (err) {
    console.error('❌ createBooking error:', err);
    next(err);
  }
};

/* ======================================================
   GET /api/bookings/my
   Lấy danh sách booking của user
====================================================== */
exports.getMyBookings = async (req, res, next) => {
  console.log('🤔 getMyBookings user:', req.user);
  
  try {
    const userId = req.user._id;
    
    const bookings = await Booking.find({ user: userId })
      .populate({
        path: 'guide',
        select: '_id locations approved userId',  
        populate: {
          path: 'userId',
          model: 'User',
          select: 'name email phone'
        }
      })
      .populate('location', 'name category price images')
      .sort({ createdAt: -1 });

    console.log(`📦 Found ${bookings.length} bookings for user ${userId}`);

    // 🔥 FIX: Format response để frontend dễ dùng
    const formattedBookings = bookings.map(booking => {
      const guide = booking.guide;
      const guideUser = guide?.userId || null;
      
      return {
        _id: booking._id,
        date: booking.date,
        timeSlot: booking.timeSlot,
        guests: booking.guests,
        price: booking.price,
        total: booking.price, // Alias cho frontend
        status: booking.status,
        phone: booking.phone,
        notes: booking.notes,
        createdAt: booking.createdAt,
        location: booking.location ? {
          _id: booking.location._id,
          name: booking.location.name,
          category: booking.location.category,
          price: booking.location.price,
          images: booking.location.images
        } : null,
        // 🔥 FIX: Format guide để frontend access dễ
        guide: guideUser ? {
          _id: guide._id,
          name: guideUser.name,
          email: guideUser.email,
          phone: guideUser.phone || 'N/A',
          user: {
            name: guideUser.name,
            email: guideUser.email,
            phone: guideUser.phone || 'N/A'
          }
        } : {
          name: 'Chưa có',
          email: 'N/A',
          phone: 'N/A'
        }
      };
    });

    res.json({
      success: true,
      count: formattedBookings.length,
      bookings: formattedBookings
    });

  } catch (err) {
    console.error('❌ getMyBookings error:', err);
    next(err);
  }
};

/* ======================================================
   GET /api/bookings/guide
   Lấy danh sách booking của guide (ĐÃ FIX)
====================================================== */
exports.getGuideBookings = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    console.log('🔍 Getting bookings for guide user:', userId);

    // Check if user is guide
    if (req.user.role !== 'guide') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ hướng dẫn viên mới có quyền truy cập'
      });
    }

    // ✅ FIX: Dùng userId thay vì user
    const guideProfile = await GuideProfile.findOne({ userId: userId });
    
    if (!guideProfile) {
      console.log('❌ Guide profile not found for user:', userId);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy profile hướng dẫn viên'
      });
    }

    console.log('✅ Found guide profile:', guideProfile._id);

    // ✅ CHỈ LẤY BOOKING ĐÃ THANH TOÁN (status = confirmed)
    const bookings = await Booking.find({ 
      guide: guideProfile._id,
      status: 'confirmed'  // ← CHỈ LẤY ĐÃ THANH TOÁN
    })
      .populate('user', 'name email phone')
      .populate('location', 'name category price images')
      .sort({ date: -1 });  // Sắp xếp mới nhất trước

    console.log(`📋 Found ${bookings.length} confirmed bookings for guide ${guideProfile._id}`);

    res.json({
      success: true,
      count: bookings.length,
      bookings
    });

  } catch (err) {
    console.error('❌ getGuideBookings error:', err);
    next(err);
  }
};

/* ======================================================
   GET /api/bookings/:id
   Lấy chi tiết một booking
====================================================== */
exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate({
        path: 'guide',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      })
      .populate('location', 'name description imageUrl category price images');

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy booking' 
      });
    }

    // Check ownership (user hoặc guide hoặc admin)
    const userId = req.user._id.toString();
    const bookingUserId = booking.user._id.toString();
    const isOwner = userId === bookingUserId;
    const isAdmin = req.user.role === 'admin';
    
    // Kiểm tra nếu là guide
    let isGuide = false;
    if (booking.guide && booking.guide.userId) {
      isGuide = userId === booking.guide.userId._id.toString();
    }

    if (!isOwner && !isGuide && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem booking này'
      });
    }

    res.json({
      success: true,
      booking
    });

  } catch (err) {
    console.error('❌ getBookingById error:', err);
    next(err);
  }
};

/* ======================================================
   GET /api/bookings/pending
   Lấy danh sách booking chờ duyệt (Admin only)
====================================================== */
exports.getPendingBookings = async (req, res, next) => {
  try {
    // Check if admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có quyền truy cập'
      });
    }

    const bookings = await Booking.find({ status: 'pending' })
      .populate('user', 'name email phone')
      .populate({
        path: 'guide',
        populate: { 
          path: 'userId', 
          select: 'name email' 
        }
      })
      .populate('location', 'name category price')
      .sort({ createdAt: -1 });

    console.log(`📋 Found ${bookings.length} pending bookings`);

    res.json({
      success: true,
      count: bookings.length,
      bookings
    });

  } catch (err) {
    console.error('❌ getPendingBookings error:', err);
    next(err);
  }
};

/* ======================================================
   PUT /api/bookings/:id/status
   Cập nhật trạng thái booking (Admin hoặc Guide)
====================================================== */
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Status không hợp lệ. Chỉ chấp nhận: ' + validStatuses.join(', ')
      });
    }

    // Find booking
    const booking = await Booking.findById(id)
      .populate({
        path: 'guide',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .populate('user', 'name email phone')
      .populate('location', 'name category price');

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy booking' 
      });
    }

    // Update booking
    const oldStatus = booking.status;
    booking.status = status;

    if (status === 'confirmed') {
      booking.approvedBy = req.user._id;
      booking.approvedAt = new Date();
    }

    if (status === 'cancelled') {
      booking.cancelledAt = new Date();
      booking.cancelReason = reason || 'Không có lý do';
    }

    await booking.save();

    console.log(`✅ Booking ${id} status updated: ${oldStatus} → ${status}`);

    // 🔥 EMIT SOCKET EVENT TO GUIDE IF STATUS CHANGED
    try {
      const io = req.app.get('io');
      if (io && booking.guide && booking.guide.userId) {
        const guideUserId = booking.guide.userId._id.toString();
        
        io.to(`guide_${guideUserId}`).emit('bookingStatusChanged', {
          bookingId: booking._id,
          oldStatus,
          newStatus: status,
          customer: {
            name: booking.user?.name || 'Khách hàng'
          },
          location: {
            name: booking.location?.name || 'N/A'
          }
        });

        console.log('📡 Status change notification sent to guide:', guideUserId);
      }
    } catch (socketErr) {
      console.error('❌ Socket notification error:', socketErr);
    }

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái thành ${status}`,
      booking
    });

  } catch (err) {
    console.error('❌ updateBookingStatus error:', err);
    next(err);
  }
};