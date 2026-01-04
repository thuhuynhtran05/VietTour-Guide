// backend/src/models/Chat.js
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true // ✅ Index để query nhanh
  },
  senderId: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 5000 // Giới hạn độ dài tin nhắn
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // ✅ Index để sort nhanh
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // Tự động tạo createdAt, updatedAt
});

// ✅ Compound index cho query roomId + timestamp
chatSchema.index({ roomId: 1, timestamp: 1 });

module.exports = mongoose.model('Chat', chatSchema);