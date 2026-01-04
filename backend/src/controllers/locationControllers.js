// backend/src/controllers/locationController.js
const Location = require('../models/Location');
const mongoose = require('mongoose');
const Guide = require('../models/Guide'); // 👈 BẮT BUỘC

// Lấy danh sách tất cả location
exports.getLocations = async (req, res, next) => {
    try {
        const locations = await Location.find();
        res.json(locations); // ✅ TRẢ TRỰC TIẾP ARRAY (để frontend locations.html hoạt động)
    } catch (err) {
        next(err);
    }
};

// Lấy chi tiết một location theo ID
exports.getLocationById = async (req, res, next) => {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID không hợp lệ' });
    }

    try {
        const location = await Location.findById(id).populate({
            path: 'guides',
            select: 'user languages certifications bio',
            populate: {
                path: 'user',
                select: 'name email'
            }
        });

        if (!location) {
            return res.status(404).json({ message: 'Không tìm thấy địa điểm' });
        }

        // ✅ CHỈ DÒNG NÀY
        res.json({ location });

    } catch (err) {
        console.error('Lỗi lấy location:', err);
        res.status(500).json({ message: 'Lỗi server nội bộ' });
    }
};

// Tạo mới một location (cần login)
exports.createLocation = async (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
            success: false,
            error: "Thiếu dữ liệu trong request body"
        });
    }

    const { name } = req.body;

    // Kiểm tra trường bắt buộc
    if (!name || name.trim() === "") {
        return res.status(400).json({
            success: false,
            error: "Tên địa điểm là bắt buộc"
        });
    }

    try {
        const { name, description, category, price } = req.body;
        const images = req.files.map(f => `/uploads/${f.filename}`);

        // Validate
        if (!name) {
            return res.status(400).json({ message: 'Tên địa điểm bắt buộc' });
        }

        if (images && (!Array.isArray(images) || images.length > 10)) {
            return res.status(400).json({ message: 'imageUrls phải là mảng tối đa 10 phần tử' });
        }

        const loc = await Location.create({
            name,
            description,
            category,
            price,
            images: images || [],
            guides: [] // ✅ Khởi tạo guides rỗng
        });

        res.status(201).json(loc);
    } catch (err) {
        next(err);
    }
};

// ============ ✅ FUNCTION MỚI ============
/**
 * @desc    Gán hướng dẫn viên vào địa điểm
 * @route   PUT /api/locations/:id/guides
 * @access  Private/Admin
 */
exports.assignGuidesToLocation = async (req, res, next) => {
    try {
        const { guides } = req.body;
        const locationId = req.params.id;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(locationId)) {
            return res.status(400).json({
                success: false,
                message: 'ID địa điểm không hợp lệ'
            });
        }

        // Validate guides array
        if (!guides || !Array.isArray(guides)) {
            return res.status(400).json({
                success: false,
                message: 'guides phải là một array'
            });
        }

        // Validate guide IDs
        for (const guideId of guides) {
            if (!mongoose.Types.ObjectId.isValid(guideId)) {
                return res.status(400).json({
                    success: false,
                    message: `ID hướng dẫn viên không hợp lệ: ${guideId}`
                });
            }
        }

        // Find location
        const location = await Location.findById(locationId);

        if (!location) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy địa điểm'
            });
        }

        // Update guides
        location.guides = guides;
        await location.save();

        // Populate guides for detailed response
        await location.populate({
            path: 'guides',
            select: 'user languages certifications bio',
            populate: {
                path: 'user',
                select: 'name email'
            }
        });

        res.json({
            success: true,
            message: `Đã gán ${guides.length} hướng dẫn viên vào địa điểm "${location.name}" thành công`,
            location
        });

    } catch (error) {
        console.error('Error in assignGuidesToLocation:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi gán hướng dẫn viên',
            error: error.message
        });
    }
};