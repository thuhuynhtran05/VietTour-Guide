// check-guide-models.js - Script kiểm tra các models liên quan đến Guide
// Đặt trong backend/
// Chạy: cd backend && node check-guide-models.js

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/viettourguide', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkModels() {
  try {
    console.log('🔍 CHECKING GUIDE-RELATED COLLECTIONS...\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('📋 All collections:');
    collections.forEach(col => console.log(`  - ${col.name}`));
    console.log('');

    // Check các collection liên quan Guide
    const guideCollections = collections.filter(col => 
      col.name.toLowerCase().includes('guide')
    );

    console.log('👨‍🏫 Guide-related collections:');
    if (guideCollections.length === 0) {
      console.log('  ❌ Không có collection nào liên quan Guide!');
    } else {
      guideCollections.forEach(col => console.log(`  ✅ ${col.name}`));
    }
    console.log('');

    // Check từng collection
    for (const col of guideCollections) {
      const collectionName = col.name;
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      
      console.log(`📊 Collection: ${collectionName}`);
      console.log(`   Total documents: ${count}`);
      
      if (count > 0) {
        const sample = await collection.findOne();
        console.log(`   Sample document structure:`);
        console.log(`   ${JSON.stringify(sample, null, 2)}`);
      }
      console.log('');
    }

    // Check Users với role = 'guide'
    const usersCollection = db.collection('users');
    const guideUsersCount = await usersCollection.countDocuments({ role: 'guide' });
    
    console.log('👥 Users with role="guide":');
    console.log(`   Total: ${guideUsersCount}`);
    
    if (guideUsersCount > 0) {
      const guideUsers = await usersCollection.find({ role: 'guide' }).limit(3).toArray();
      console.log(`   Sample users:`);
      guideUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ID: ${user._id}`);
      });
    }
    console.log('');

    console.log('✅ DONE!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkModels();