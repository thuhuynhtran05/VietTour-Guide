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
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('🔌 New socket connection:', socket.id);
  
  // ✅ Guide join (khi guide login)
  socket.on('guide:join', ({ guideId }) => {
    socket.join(`guide_${guideId}`);
    console.log(`👨‍🏫 Guide ${guideId} joined`);
  });
  
  // ✅ Join room chat
  socket.on('room:join', ({ roomId }) => {
    socket.join(roomId);
    console.log(`👤 Socket ${socket.id} joined room: ${roomId}`);
  });
  
  // ✅ Send message
  socket.on('message:send', async ({ roomId, senderId, senderName, message }) => {
    try {
      const ChatMessage = require('./models/ChatMessage');
      
      // 1. Lưu vào DB
      const chat = new ChatMessage({ 
        roomId, 
        senderId, 
        senderName, 
        message 
      });
      await chat.save();
      
      // 2. Gửi tin nhắn vào room
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
      
      console.log(`💬 Message sent in room ${roomId} by ${senderName}`);
    } catch (error) {
      console.error('❌ Chat message error:', error);
      socket.emit('error', { message: 'Không thể gửi tin nhắn' });
    }
  });
  
  // ✅ Typing indicator
  socket.on('room:typing', ({ roomId }) => {
    socket.to(roomId).emit('room:typing', { roomId });
  });
  
  // ✅ Mark as read
  socket.on('room:markRead', ({ roomId, userId }) => {
    console.log(`✓ Room ${roomId} marked as read by ${userId}`);
  });
  
  // Leave room
  socket.on('room:leave', ({ roomId }) => {
    socket.leave(roomId);
    console.log(`👋 Socket ${socket.id} left room: ${roomId}`);
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
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