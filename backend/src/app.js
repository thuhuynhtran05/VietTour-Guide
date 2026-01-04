const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const errorHandler = require('./middleware/errorHandler');
const paymentRoutes = require('./routes/payment'); // ✅ Thêm dòng này
// Enable CORS
app.use(cors());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads folder for images
// (src → .. → uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/locations', require('./routes/location'));
app.use('/api/guides', require('./routes/guide'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/bookings', require('./routes/booking'));
app.use('/api/reviews', require('./routes/review'));
app.use('/api/payments', require('./routes/payment'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/tour', require('./routes/tour'));
app.use('/api/payment', paymentRoutes); // ✅ Thêm dòng này
// Error handler middleware
app.use(errorHandler);

module.exports = app;
