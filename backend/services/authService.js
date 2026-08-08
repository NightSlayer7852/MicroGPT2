const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Session = require('../models/Session');

// Hash password
exports.hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password
exports.comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate Tokens and save session
exports.generateTokens = async (userId , name ) => {
  // 1. Create Access Token (Short-lived: 15 mins)
  const accessToken = jwt.sign(
    { id: userId, name: name }, 
    process.env.JWT_SECRET, 
    { expiresIn: '15m' }
  );

  // 2. Create Refresh Token (Long-lived: 7 days)
  const refreshToken = jwt.sign(
    { id: userId }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: '7d' }
  );

  // 3. Save Refresh Token to Session DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

  await Session.create({
    userId,
    refreshToken,
    expiresAt
  });

  return { accessToken, refreshToken };
};