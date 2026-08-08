const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional because Google Auth won't have one
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  googleId: { type: String }
}, { timestamps: true }); // Automatically handles createdAt and updatedAt

module.exports = mongoose.model('User', userSchema);