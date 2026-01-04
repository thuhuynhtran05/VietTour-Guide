// middleware/optionalAuth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Auth không bắt buộc (cho public routes nhưng vẫn muốn biết user)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    
    req.user = user || null;
    next();
    
  } catch (err) {
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;