// models/Conversation.js
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'New Chat' // We can auto-generate this later based on the user's first prompt
  },
  peripheral: {
    type: String,
    default: 'General', // e.g., 'STM32', 'ESP32', 'Arduino' - helps organize chats
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

module.exports = mongoose.model('Conversation', conversationSchema);