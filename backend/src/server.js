// backend/src/server.js
const dotenv = require('dotenv');
const path = require('path');

// ✅ LOAD .ENV TRƯỚC HẾT - TRƯỚC KHI REQUIRE BẤT CỨ THỨ GÌ
dotenv.config({ path: path.join(__dirname, '../.env') });

// Debug
console.log('========== ENV CHECK ==========');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Loaded' : '❌ Not found');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Loaded' : '❌ Not found');
console.log('PORT:', process.env.PORT || 4000);
console.log('CLIENT_URL:', process.env.CLIENT_URL || 'Not set');
console.log('===============================\n');

// Giờ mới require các file khác
const http = require('http');
const express = require('express');
const app = require('./app');
const connectDB = require('./config/db');

// Kết nối MongoDB
connectDB();

// Serve static uploads (phải đặt TRƯỚC tạo server)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Tạo HTTP server
const server = http.createServer(app);

// Socket.io setup
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:63342', // WebStorm default
      '*' // ⚠️ Cho phép tất cả (chỉ dùng development)
    ],
    methods: ['GET', 'POST'],
    credentials: false
  },
  transports: ['websocket', 'polling']
});

// ===== SOCKET.IO EVENT HANDLERS =====

// Import Chat model
let Chat;
try {
  Chat = require('./models/Chat');
  console.log('✅ Chat model loaded');
} catch (err) {
  console.log('⚠️ Chat model not found, trying ChatMessage...');
  try {
    Chat = require('./models/ChatMessage');
    console.log('✅ ChatMessage model loaded');
  } catch (err2) {
    console.error('❌ No chat model found!');
  }
}

io.on('connection', (socket) => {
  console.log('🔌 New socket connection:', socket.id);
  
  // ===== JOIN ROOM =====
  socket.on('joinRoom', ({ roomId }) => {
    socket.join(roomId);
    console.log(`📥 Socket ${socket.id} joined room: ${roomId}`);
    
    // Confirm join
    socket.emit('joinedRoom', { roomId, socketId: socket.id });
  });

  // ===== CHAT MESSAGE (Frontend uses this) =====
  socket.on('chatMessage', async ({ roomId, senderId, senderName, message }) => {
    console.log('💬 chatMessage received:');
    console.log('  Room:', roomId);
    console.log('  Sender:', senderName);
    console.log('  Message:', message);

    if (!Chat) {
      console.error('❌ Chat model not available');
      socket.emit('chatError', { message: 'Chat service unavailable' });
      return;
    }

    try {
      // ✅ SAVE TO DB
      const chatMessage = await Chat.create({
        roomId,
        senderId,
        senderName: senderName || 'Unknown',
        message,
        timestamp: new Date()
      });

      console.log('✅ Message saved to DB:', chatMessage._id);

      // ✅ BROADCAST TO ROOM (including sender)
      const broadcastData = {
        senderId: chatMessage.senderId,
        senderName: chatMessage.senderName,
        message: chatMessage.message,
        timestamp: chatMessage.timestamp,
        _id: chatMessage._id
      };

      io.to(roomId).emit('chatMessage', broadcastData);
      console.log('✅ Message broadcasted to room:', roomId);

    } catch (error) {
      console.error('❌ Error saving message:', error);
      socket.emit('chatError', {
        message: 'Không thể lưu tin nhắn',
        error: error.message
      });
    }
  });

  // ===== LEGACY: message:send (backward compatibility) =====
  socket.on('message:send', async ({ roomId, senderId, senderName, message }) => {
    console.log('💬 message:send (legacy) received');
    
    if (!Chat) {
      socket.emit('error', { message: 'Chat unavailable' });
      return;
    }

    try {
      const chat = await Chat.create({ 
        roomId, 
        senderId, 
        senderName, 
        message,
        timestamp: new Date()
      });
      
      io.to(roomId).emit('message:new', {
        roomId,
        message: {
          _id: chat._id,
          roomId: chat.roomId,
          senderId: chat.senderId,
          senderName: chat.senderName,
          message: chat.message,
          timestamp: chat.timestamp
        }
      });
      
      console.log(`✅ Legacy message sent in room ${roomId}`);
    } catch (error) {
      console.error('❌ Legacy message error:', error);
      socket.emit('error', { message: 'Không thể gửi tin nhắn' });
    }
  });

  // ===== GUIDE JOIN =====
  socket.on('guide:join', ({ guideId }) => {
    socket.join(`guide_${guideId}`);
    console.log(`👨‍🏫 Guide ${guideId} joined`);
  });
  
  // ===== ROOM JOIN (alternative name) =====
  socket.on('room:join', ({ roomId }) => {
    socket.join(roomId);
    console.log(`👤 Socket ${socket.id} joined room: ${roomId}`);
  });
  
  // ===== TYPING INDICATOR =====
  socket.on('typing', ({ roomId, userName }) => {
    socket.to(roomId).emit('typing', { roomId, userName });
  });

  socket.on('room:typing', ({ roomId, userName }) => {
    socket.to(roomId).emit('room:typing', { roomId, userName });
  });
  
  // ===== MARK AS READ =====
  socket.on('markRead', ({ roomId, userId }) => {
    console.log(`✓ Room ${roomId} marked as read by ${userId}`);
  });

  socket.on('room:markRead', ({ roomId, userId }) => {
    console.log(`✓ Room ${roomId} marked as read by ${userId}`);
  });
  
  // ===== LEAVE ROOM =====
  socket.on('leaveRoom', ({ roomId }) => {
    socket.leave(roomId);
    console.log(`👋 Socket ${socket.id} left room: ${roomId}`);
  });

  socket.on('room:leave', ({ roomId }) => {
    socket.leave(roomId);
    console.log(`👋 Socket ${socket.id} left room: ${roomId}`);
  });
  
  // ===== DISCONNECT =====
  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
  });

  // ===== ERROR HANDLING =====
  socket.on('error', (err) => {
    console.error('❌ Socket error:', err);
  });
});

// Make io accessible to routes (nếu cần)
app.set('io', io);

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Socket.IO ready for connections`);
  console.log(`💬 Chat model: ${Chat ? Chat.modelName : 'Not available'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️ SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle unhandled errors
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

module.exports = server;