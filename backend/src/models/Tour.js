const mongoose = require('mongoose');

const tourSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  location: {                     
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  description: String,
  price: Number,
  duration: String,
  guide: {                       
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Tour', tourSchema);
