// routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const settingsController = require('../controllers/settingsController');

// GET user settings
router.get('/', protect, settingsController.getSettings);

// PUT (update) user settings
router.put('/', protect, settingsController.updateSettings);

module.exports = router;