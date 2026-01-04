const express = require('express');
const router = express.Router();
const {
  getGuides,
  getGuidesByLocation,
  getGuideById,
  assignLocation,
  getMyBookings,
  getMyBookingStatistics
} = require('../controllers/guideController');
const authMiddleware = require('../middleware/authMiddleware');
const bodyParser = require('body-parser');

router.use(bodyParser.json());

// ⚠️ QUAN TRỌNG: Đặt các route CỤ THỂ TRƯỚC route động /:id

// ✅ Route lấy guides đã duyệt
router.get('/approved', async (req, res) => {
  console.log('📥 GET /approved called');
  
  try {
    const User = require('../models/User');
    console.log('✅ User model loaded');
    
    let guides = await User.find({ 
      role: 'guide',
      status: 'active'
    })
    .select('name email phone languages bio location rating reviews experience')
    .lean();
    
    // ✅ MAP _id → id để frontend dùng
    guides = guides.map(g => ({
      ...g,
      id: g._id.toString()
    }));
    
    console.log('✅ Found guides:', guides.length);
    console.log('📦 Guides data:', guides);
    
    res.json({
      success: true,
      guides: guides
    });
  } catch (error) {
    console.error('❌ Get approved guides error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ✅ Route để Guide xem thống kê bookings của mình
router.get('/my-bookings/statistics', authMiddleware, getMyBookingStatistics);

// ✅ Route để Guide xem tất cả bookings của mình
router.get('/my-bookings', authMiddleware, getMyBookings);

// Route với query locationId
router.get('/', (req, res, next) => {
  if (req.query.locationId) {
    return getGuidesByLocation(req, res, next);
  }
  return getGuides(req, res, next);
});

// ⚠️ Chi tiết 1 guide - ĐẶT CUỐI CÙNG vì nó match mọi /:id
router.get('/:id', getGuideById);

router.put('/:id/assign-location', authMiddleware, assignLocation);

module.exports = router;