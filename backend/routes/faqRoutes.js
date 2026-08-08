// routes/faqRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const faqController = require('../controllers/faqController');

// GET all unique peripheral categories
router.get('/peripherals', protect, faqController.getUniquePeripherals);

// GET FAQs (supports ?peripheral=STM32 query)
router.get('/', protect, faqController.getFaqs);

module.exports = router;