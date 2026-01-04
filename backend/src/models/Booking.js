const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuideProfile',
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,  
    required: true
  },
  status: {
    type: String,
    enum: ['pending','confirmed','cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  location: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Location',
  required: true
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
