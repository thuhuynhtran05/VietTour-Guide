// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // 1. Lấy token từ header
    const authHeader = req.headers.authorization;
    
    console.log('🔐 Auth middleware - Header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Chưa đăng nhập - Không tìm thấy token' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Token không hợp lệ' 
      });
    }
    
    console.log('🎫 Token:', token.substring(0, 30) + '...');
    
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret');
    console.log('✅ Decoded token:', decoded);
    
    // 3. Tìm user trong database
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User không tồn tại' 
      });
    }
    
    console.log('✅ User found:', user._id, user.email);
    
    // 4. Kiểm tra user có bị khóa không
    if (user.isActive === false) {
      return res.status(403).json({ 
        success: false,
        message: 'Tài khoản đã bị khóa' 
      });
    }
    
    // 5. ✅ FIX: Gắn user FULL OBJECT vào request (giữ nguyên Mongoose document)
    req.user = user;
    
    console.log('✅ Auth middleware: User authenticated:', req.user._id);
    
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    
    // Xử lý các loại lỗi JWT cụ thể
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token không hợp lệ' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token đã hết hạn, vui lòng đăng nhập lại' 
      });
    }
    
    // Lỗi khác
    res.status(500).json({ 
      success: false,
      message: 'Lỗi xác thực: ' + error.message 
    });
  }
};