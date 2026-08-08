// models/Settings.js
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // A user can only have one settings document
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'dark'
  },
  preferredModel: {
    type: String,
    default: 'MicroGPT 3.5 Smart'
  },
  clearHistoryOnLogout: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);