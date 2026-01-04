// backend/src/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined');
    }

    // ✅ Thêm options để fix SSL error
    await mongoose.connect(process.env.MONGODB_URI, {
      tls: true,
      tlsAllowInvalidCertificates: true, // Bỏ qua SSL cert validation
      serverSelectionTimeoutMS: 5000, // Timeout 5 giây
    });
    
    console.log('✅ MongoDB Connected:', mongoose.connection.host);
    console.log('📦 Database:', mongoose.connection.name);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Full error:', error);
    process.exit(1); 
  }
};

module.exports = connectDB;