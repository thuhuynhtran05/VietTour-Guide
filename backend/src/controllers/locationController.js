// backend/src/controllers/locationController.js - VERSION 3 (FIX APPEND GUIDES)
const Location = require('../models/Location');
const Guide = require('../models/Guide');
const User = require('../models/User');

// ===== GET ALL LOCATIONS =====
exports.getLocations = async (req, res) => {
  try {
    console.log('🔍 GET /api/locations');

    const locations = await Location.find()
      .populate({
        path: 'guides',
        select: 'name email phoneNumber phone role'
      })
      .sort({ createdAt: -1 });

    // Thêm guideCount cho mỗi location
    const locationsWithCount = locations.map(loc => ({
      ...loc.toObject(),
      guideCount: loc.guides ? loc.guides.length : 0
    }));

    console.log(`✅ Found ${locations.length} locations`);

    return res.json(locationsWithCount);
  } catch (error) {
    console.error('❌ Error fetching locations:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách địa điểm',
      error: error.message
    });
  }
};

// ===== GET LOCATION BY ID - FIXED V2 =====
exports.getLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 GET /api/locations/' + id);

    // ✅ POPULATE USER INFO TRƯỚC
    const location = await Location.findById(id)
      .populate({
        path: 'guides',
        select: 'name email phoneNumber phone role'
      });

    if (!location) {
      console.log('❌ Location not found');
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy địa điểm'
      });
    }

    // ✅ LẤY THÊM GUIDE INFO (KHÔNG BẮT BUỘC APPROVED)
    const populatedGuides = [];
    
    if (location.guides && location.guides.length > 0) {
      for (const userDoc of location.guides) {
        if (!userDoc) continue;

        // Tìm Guide document (bỏ qua status check)
        const guideDoc = await Guide.findOne({ user: userDoc._id });

        if (guideDoc) {
          // ✅ FIX: Support cả phone và phoneNumber
          const userPhone = userDoc.phone || userDoc.phoneNumber || '';
          
          // Merge user info + guide info
          populatedGuides.push({
            _id: guideDoc._id,
            id: userDoc._id, // User ID
            name: userDoc.name,
            email: userDoc.email,
            phone: userPhone,
            phoneNumber: userPhone,
            languages: guideDoc.languages || [],
            bio: guideDoc.bio || 'Chưa có thông tin',
            certifications: guideDoc.certifications || [],
            pricePerDay: guideDoc.pricePerDay || 0,
            status: guideDoc.status
          });
        } else {
          // Nếu không có Guide doc, vẫn hiển thị User info cơ bản
          const userPhone = userDoc.phone || userDoc.phoneNumber || '';
          
          populatedGuides.push({
            _id: userDoc._id,
            id: userDoc._id,
            name: userDoc.name,
            email: userDoc.email,
            phone: userPhone,
            phoneNumber: userPhone,
            languages: [],
            bio: 'Chưa có thông tin',
            certifications: [],
            pricePerDay: 0,
            status: 'pending'
          });
        }
      }
    }

    console.log(`✅ Location found with ${populatedGuides.length} guides`);
    console.log('👥 Guides:', populatedGuides.map(g => ({ name: g.name, status: g.status })));

    return res.json({
      success: true,
      location: {
        ...location.toObject(),
        guides: populatedGuides
      }
    });

  } catch (error) {
    console.error('❌ Error fetching location:', error);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin địa điểm',
      error: error.message
    });
  }
};

// ===== CREATE LOCATION =====
exports.createLocation = async (req, res) => {
  try {
    console.log('🔍 POST /api/locations');
    console.log('Body:', req.body);
    console.log('Files:', req.files);

    const { name, description, category, price } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên và giá'
      });
    }

    const imagePaths = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const location = await Location.create({
      name,
      description,
      category,
      price: Number(price),
      images: imagePaths,
      guides: []
    });

    console.log('✅ Location created:', location._id);

    return res.status(201).json({
      success: true,
      message: 'Tạo địa điểm thành công',
      location
    });

  } catch (error) {
    console.error('❌ Error creating location:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo địa điểm',
      error: error.message
    });
  }
};

// ===== ASSIGN GUIDES TO LOCATION - FIXED V3 =====
exports.assignGuidesToLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { guides } = req.body;

    console.log('🔧 PUT /api/locations/' + id + '/guides');
    console.log('📥 Guides to assign (User IDs):', guides);

    if (!Array.isArray(guides)) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách guides phải là một mảng'
      });
    }

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy địa điểm'
      });
    }

    // ✅ KIỂM TRA USER CÓ TỒN TẠI
    const validUserIds = [];
    
    for (const userId of guides) {
      try {
        const user = await User.findById(userId);
        
        if (user) {
          validUserIds.push(userId);
          console.log(`✅ User ${userId} (${user.name}) - OK`);
          
          const guide = await Guide.findOne({ user: userId });
          if (guide) {
            console.log(`   └─ Guide status: ${guide.status}`);
          } else {
            console.log(`   └─ Chưa có Guide document`);
          }
        } else {
          console.log(`⚠️ User ${userId} không tồn tại`);
        }
      } catch (err) {
        console.log(`❌ Lỗi khi check User ${userId}:`, err.message);
      }
    }

    if (validUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có User hợp lệ trong danh sách'
      });
    }

    // ✅ FIX: THÊM VÀO thay vì ghi đè
    const currentGuides = location.guides || [];
    const currentGuideIds = currentGuides.map(g => g.toString());
    
    let addedCount = 0;
    
    // Thêm các guide mới (không trùng)
    for (const newGuideId of validUserIds) {
      if (!currentGuideIds.includes(newGuideId.toString())) {
        location.guides.push(newGuideId);
        addedCount++;
        console.log(`➕ Added guide: ${newGuideId}`);
      } else {
        console.log(`⏭️ Guide ${newGuideId} already exists`);
      }
    }

    await location.save();

    console.log(`✅ Total guides after update: ${location.guides.length}`);
    console.log(`   - Previous: ${currentGuideIds.length}`);
    console.log(`   - Added: ${addedCount}`);

    // Populate để trả về full info
    await location.populate({
      path: 'guides',
      select: 'name email phoneNumber phone role'
    });

    return res.json({
      success: true,
      message: addedCount > 0 
        ? `Đã thêm ${addedCount} hướng dẫn viên mới. Tổng: ${location.guides.length}`
        : `Không có hướng dẫn viên mới (tất cả đã tồn tại). Tổng: ${location.guides.length}`,
      location
    });

  } catch (error) {
    console.error('❌ Error assigning guides:', error);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi gán hướng dẫn viên',
      error: error.message
    });
  }
};

// ===== REMOVE GUIDE FROM LOCATION =====
exports.removeGuideFromLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { guideId } = req.body;

    console.log(`🗑️ DELETE guide from location ${id}: ${guideId}`);

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy địa điểm'
      });
    }

    const beforeCount = location.guides.length;
    location.guides = location.guides.filter(g => g.toString() !== guideId);
    const afterCount = location.guides.length;

    if (beforeCount === afterCount) {
      return res.status(404).json({
        success: false,
        message: 'Guide không có trong location này'
      });
    }

    await location.save();

    console.log(`✅ Removed guide ${guideId}. Count: ${beforeCount} → ${afterCount}`);

    return res.json({
      success: true,
      message: 'Đã xóa hướng dẫn viên khỏi địa điểm',
      location
    });

  } catch (error) {
    console.error('❌ Error removing guide:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa hướng dẫn viên',
      error: error.message
    });
  }
};