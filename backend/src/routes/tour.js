// backend/src/routes/tour.js
const express = require('express');
const router = express.Router();
const Tour = require('../models/Tour');
const Location = require('../models/Location');
const GuideProfile = require('../models/GuideProfile');
const auth = require('../middleware/authMiddleware');


/**
 * @route   GET /api/tour/search
 * @desc    Tìm kiếm tour theo điểm đến, ngày, số người
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const { destination, startDate, endDate, numPeople } = req.query;

    console.log('🔍 Search params:', { destination, startDate, endDate, numPeople });

    const query = {};
    
    // Tìm theo destination
    if (destination) {
      const location = await Location.findOne({
        name: { $regex: destination, $options: 'i' }
      });
      
      if (location) {
        query.locationId = location._id;
        console.log('📍 Found location:', location.name);
      } else {
        console.log('⚠️ Location not found');
      }
    }

    // Filter theo ngày
    if (startDate && endDate) {
      query.availableDates = {
        $elemMatch: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    // Filter theo số người
    if (numPeople) {
      query.maxGroupSize = { $gte: parseInt(numPeople) };
    }

    console.log('🔎 Query:', JSON.stringify(query, null, 2));

    // Tìm tours
    const tours = await Tour.find(query)
      .populate('guideId', 'name email rating')
      .populate('locationId', 'name description images')
      .sort({ rating: -1 })
      .limit(20);

    console.log(`✅ Found ${tours.length} tours`);

    // Nếu không có tour, tìm guides trong location đó
    if (tours.length === 0 && destination) {
      const location = await Location.findOne({
        name: { $regex: destination, $options: 'i' }
      });
      
      if (location) {
        const guides = await GuideProfile.find({ locationId: location._id })
          .select('name email rating languages specialties')
          .limit(10);
        
        console.log(`📋 Found ${guides.length} guides as fallback`);
        
        return res.json({
          success: true,
          tours: [],
          guides,
          message: 'Không tìm thấy tour, nhưng có guides sẵn sàng tạo tour cho bạn'
        });
      }
    }

    res.json({
      success: true,
      count: tours.length,
      tours
    });

  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi tìm kiếm tour',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/tour
 * @desc    Lấy tất cả tours
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const tours = await Tour.find()
      .populate('guideId', 'name email rating')
      .populate('locationId', 'name description images')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tours.length,
      tours
    });
  } catch (error) {
    console.error('Get tours error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi lấy danh sách tour' 
    });
  }
});

/**
 * @route   GET /api/tour/:id
 * @desc    Lấy chi tiết tour
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id)
      .populate('guideId', 'name email rating languages specialties')
      .populate('locationId', 'name description images');

    if (!tour) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy tour' 
      });
    }

    res.json({
      success: true,
      tour
    });
  } catch (error) {
    console.error('Get tour error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi lấy thông tin tour' 
    });
  }
});

/**
 * @route   POST /api/tour
 * @desc    Tạo tour mới (Guide only)
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is guide
    if (req.user.role !== 'guide') {
      return res.status(403).json({ 
        success: false,
        message: 'Chỉ hướng dẫn viên mới có thể tạo tour' 
      });
    }

    const tour = new Tour({
      guideId: req.user.id,
      ...req.body
    });

    await tour.save();

    res.status(201).json({
      success: true,
      message: 'Tạo tour thành công',
      tour
    });

  } catch (error) {
    console.error('Create tour error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi tạo tour' 
    });
  }
});

/**
 * @route   PUT /api/tour/:id
 * @desc    Cập nhật tour (Guide owner only)
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy tour' 
      });
    }

    // Check ownership
    if (tour.guideId.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Bạn không có quyền chỉnh sửa tour này' 
      });
    }

    const updatedTour = await Tour.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Cập nhật tour thành công',
      tour: updatedTour
    });

  } catch (error) {
    console.error('Update tour error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi cập nhật tour' 
    });
  }
});

/**
 * @route   DELETE /api/tour/:id
 * @desc    Xóa tour (Guide owner only)
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy tour' 
      });
    }

    // Check ownership
    if (tour.guideId.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Bạn không có quyền xóa tour này' 
      });
    }

    await tour.deleteOne();

    res.json({
      success: true,
      message: 'Xóa tour thành công'
    });

  } catch (error) {
    console.error('Delete tour error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi xóa tour' 
    });
  }
});

module.exports = router;
