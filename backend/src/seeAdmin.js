// backend/src/seedAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

async function seedAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  const email = 'admin@site.com';
  const existing = await User.findOne({ email });
  if (!existing) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Admin@123', salt);
    await User.create({
      name: 'Super Admin',
      email,
      phone: '0000000000',
      passwordHash,
      role: 'admin',
      status: 'active'
    });
    console.log('Admin seeded:', email);
  } else {
    console.log('Admin already exists:', email);
  }
  process.exit();
}

seedAdmin();
