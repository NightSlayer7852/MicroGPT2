// models/Faq.js
const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  peripheral: {
    type: String,
    required: true,
    index: true // e.g., "STM32", "General", "Sensors"
  },
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  tags: [{
    type: String // e.g., ["I2C", "Clock Configuration", "Interrupts"]
  }],
  order: {
    type: Number,
    default: 0 // Helps you sort which FAQs show up first
  }
});

module.exports = mongoose.model('Faq', faqSchema);