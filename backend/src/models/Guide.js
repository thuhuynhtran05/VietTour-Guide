const mongoose = require('mongoose');

const guideSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  languages: [{ type: String }],
  certifications: [{ type: String }],
  bio: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  pricePerDay: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Guide', guideSchema);

