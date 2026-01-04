// check-user-schema.js - Kiểm tra User model và sample data
// Đặt trong backend/
// Chạy: cd backend && node check-user-schema.js

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/viettourguide', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkUserSchema() {
  try {
    console.log('🔍 CHECKING USER SCHEMA & DATA...\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // 1. Count users với role='guide'
    const guideUsersCount = await usersCollection.countDocuments({ role: 'guide' });
    console.log(`👥 Total Users with role='guide': ${guideUsersCount}\n`);

    if (guideUsersCount === 0) {
      console.log('❌ Không có User nào với role="guide"!');
      process.exit(0);
    }

    // 2. Lấy 1 sample User để xem schema
    const sampleUser = await usersCollection.findOne({ role: 'guide' });
    
    console.log('📋 Sample User Document:');
    console.log('─'.repeat(60));
    console.log(JSON.stringify(sampleUser, null, 2));
    console.log('─'.repeat(60));
    console.log('');

    // 3. Liệt kê các fields
    console.log('📊 Available Fields in User:');
    const fields = Object.keys(sampleUser);
    fields.forEach(field => {
      const value = sampleUser[field];
      const type = Array.isArray(value) ? 'Array' : typeof value;
      console.log(`  - ${field.padEnd(20)} : ${type}`);
    });
    console.log('');

    // 4. Check specific fields cần thiết
    const requiredFields = ['name', 'email', 'phoneNumber', 'languages', 'bio', 'certifications', 'rating'];
    
    console.log('✅ Required Fields Check:');
    requiredFields.forEach(field => {
      const exists = fields.includes(field);
      const value = sampleUser[field];
      console.log(`  ${exists ? '✅' : '❌'} ${field.padEnd(20)} : ${exists ? (value || 'null/empty') : 'MISSING'}`);
    });
    console.log('');

    // 5. List tất cả guide users
    console.log('👨‍🏫 All Guide Users:');
    const allGuides = await usersCollection.find({ role: 'guide' }).toArray();
    allGuides.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email})`);
      console.log(`     ID: ${user._id}`);
      console.log(`     Phone: ${user.phoneNumber || 'N/A'}`);
      console.log(`     Languages: ${user.languages?.join(', ') || 'N/A'}`);
      console.log('');
    });

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUserSchema();