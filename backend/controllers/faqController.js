// controllers/faqController.js
const Faq = require('../models/Faq');

/**
 * @desc    Get FAQs based on the selected peripheral
 * @route   GET /api/faqs
 * @access  Private
 */
exports.getFaqs = async (req, res) => {
  try {
    // Check if the frontend passed a specific peripheral (e.g., ?peripheral=STM32)
    const { peripheral } = req.query;

    let query = {};
    if (peripheral && peripheral !== 'All') {
      query.peripheral = peripheral;
    }

    // Fetch the FAQs and SORT them by the 'order' field ascending (1, 2, 3...)
    // This guarantees your I2C pins show up together, then SPI, then UART.
    const faqs = await Faq.find(query).sort({ order: 1 });

    res.status(200).json(faqs);
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    res.status(500).json({ message: 'Server error while fetching FAQs' });
  }
};

/**
 * @desc    Get a list of all unique peripherals available in the database
 * @route   GET /api/faqs/peripherals
 * @access  Private
 */
exports.getUniquePeripherals = async (req, res) => {
  try {
    // This looks through all FAQs and returns an array of unique peripheral names
    // (e.g., ["STM32", "ESP32"]). Perfect for populating a frontend dropdown!
    const peripherals = await Faq.distinct('peripheral');
    
    res.status(200).json(peripherals);
  } catch (error) {
    console.error("Error fetching peripheral list:", error);
    res.status(500).json({ message: 'Server error while fetching peripheral list' });
  }
};