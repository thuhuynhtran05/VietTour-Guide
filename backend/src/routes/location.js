// backend/src/routes/location.js
const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const { createLocation } = require('../controllers/locationController');
const locationController = require('../controllers/locationController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.get('/', locationController.getLocations);
router.get('/:id', locationController.getLocationById);

// Protected routes
router.post(
    '/', 
    authMiddleware,
    upload.array('images', 10),
    createLocation
);

// ✅ THÊM ROUTE MỚI: Gán guides vào location
router.put(
    '/:id/guides',
    authMiddleware,
    locationController.assignGuidesToLocation
);

module.exports = router;

