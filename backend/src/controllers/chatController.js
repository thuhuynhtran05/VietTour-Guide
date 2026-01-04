// backend/src/controllers/chatController.js
const Chat = require('../models/Chat');

// ===== GET CHAT HISTORY =====
exports.getHistory = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    console.log('📜 GET /api/chat/' + roomId);

    // Tìm tất cả messages trong room, sắp xếp theo thời gian
    const messages = await Chat.find({ roomId })
      .sort({ timestamp: 1 }) // Cũ → mới
      .limit(100); // Giới hạn 100 tin nhắn gần nhất

    console.log(`✅ Found ${messages.length} messages in room ${roomId}`);

    return res.json({
      success: true,
      roomId,
      messages: messages.map(msg => ({
        senderId: msg.senderId,
        senderName: msg.senderName,
        message: msg.message,
        timestamp: msg.timestamp,
        _id: msg._id
      }))
    });

  } catch (error) {
    console.error('❌ Error getting chat history:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử chat',
      error: error.message
    });
  }
};

// ===== SEND MESSAGE (called by Socket.IO or REST API) =====
exports.sendMessage = async (req, res) => {
  try {
    const { roomId, senderId, senderName, message } = req.body;

    console.log('💬 POST /api/chat - Save message');
    console.log('  Room:', roomId);
    console.log('  Sender:', senderName);

    if (!roomId || !senderId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin: roomId, senderId, message'
      });
    }

    // Lưu tin nhắn vào DB
    const chatMessage = await Chat.create({
      roomId,
      senderId,
      senderName: senderName || 'Unknown',
      message,
      timestamp: new Date()
    });

    console.log('✅ Message saved:', chatMessage._id);

    return res.status(201).json({
      success: true,
      message: 'Tin nhắn đã được lưu',
      data: chatMessage
    });

  } catch (error) {
    console.error('❌ Error sending message:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lưu tin nhắn',
      error: error.message
    });
  }
};

// ===== GET ALL ROOMS FOR USER (optional) =====
exports.getRooms = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware

    console.log('🏠 GET /api/chat/rooms for user:', userId);

    // Tìm tất cả rooms mà user tham gia
    const rooms = await Chat.distinct('roomId', {
      $or: [
        { senderId: userId },
        { roomId: new RegExp(`user_${userId}_`) }
      ]
    });

    console.log(`✅ Found ${rooms.length} rooms`);

    // Lấy tin nhắn cuối cùng của mỗi room
    const roomsWithLastMessage = await Promise.all(
      rooms.map(async (roomId) => {
        const lastMessage = await Chat.findOne({ roomId })
          .sort({ timestamp: -1 })
          .limit(1);

        return {
          roomId,
          lastMessage: lastMessage ? {
            message: lastMessage.message,
            timestamp: lastMessage.timestamp,
            senderName: lastMessage.senderName
          } : null
        };
      })
    );

    return res.json({
      success: true,
      rooms: roomsWithLastMessage
    });

  } catch (error) {
    console.error('❌ Error getting rooms:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách phòng chat',
      error: error.message
    });
  }
};