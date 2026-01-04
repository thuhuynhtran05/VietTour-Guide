const express = require('express');
const router = express.Router();
const { getHistory, getRooms, sendMessage } = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

// ✅ THÊM ROUTE NÀY - ĐẶT TRƯỚC /:roomId
router.post('/', authMiddleware, sendMessage);

router.get('/:roomId', authMiddleware, getHistory);
router.get('/rooms', authMiddleware, getRooms);

module.exports = router;