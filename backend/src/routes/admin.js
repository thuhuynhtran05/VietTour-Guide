// backend/src/routes/admin.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

// Middleware kiểm tra admin
const requireAdmin = (req, res, next) => {
  console.log('🔐 Checking admin access...');
  console.log('User role:', req.user?.role);
  
  if (!req.user || req.user.role !== 'admin') {
    console.log('❌ Access denied - not admin');
    return res.status(403).json({ 
      success: false, 
      message: 'Chỉ admin mới có quyền truy cập' 
    });
  }
  
  console.log('✅ Admin access granted');
  next();
};

// Apply auth middleware cho tất cả routes
router.use(authMiddleware);
router.use(requireAdmin);

// ===== GUIDES MANAGEMENT =====
// 🆕 GET thống kê guide applications
router.get('/guides/my-applications/statistics', adminController.getGuideApplicationStatistics);

// 🆕 GET danh sách guide applications
router.get('/guides/my-applications', adminController.getGuideApplications);

// GET danh sách HDV chờ duyệt
router.get('/guides/pending', adminController.getPendingGuides);

// PUT duyệt HDV (endpoint mới - ưu tiên)
router.put('/guides/:id/approve', adminController.approveGuide);

// PUT từ chối HDV (endpoint mới - ưu tiên)
router.put('/guides/:id/reject', adminController.rejectGuide);

// PATCH duyệt HDV (endpoint cũ - giữ lại để backward compatible)
router.patch('/guides/approve/:id', adminController.approveGuide);

// PATCH từ chối HDV (endpoint cũ - giữ lại để backward compatible)
router.patch('/guides/reject/:id', adminController.rejectGuide);

// ===== BOOKINGS MANAGEMENT =====
// GET danh sách booking chờ duyệt
router.get('/bookings/pending', adminController.getPendingBookings);

// PUT cập nhật trạng thái booking
router.put('/bookings/:id', adminController.updateBookingStatus);

// ===== STATISTICS & ANALYTICS =====
// GET thống kê tổng quan
router.get('/statistics', adminController.getStatistics);

// GET dữ liệu biểu đồ
router.get('/chart', adminController.getChartData);

module.exports = router;