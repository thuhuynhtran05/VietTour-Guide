
// backend/src/models/GuideProfile.js
const mongoose = require('mongoose');

const guideProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  certifications: [String],
  languages: [String],
  bio: String,
  approved: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('GuideProfile', guideProfileSchema);