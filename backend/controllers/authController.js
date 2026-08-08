const User = require('../models/User');
const Session = require('../models/Session');
const authService = require('../services/authService');
const jwt = require('jsonwebtoken');
const Settings = require('../models/Settings');

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    // Hash password and create user
    const hashedPassword = await authService.hashPassword(password);
    const user = await User.create({ name, email, password: hashedPassword, authProvider: 'local' });
    await Settings.create({ userId: user._id });

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || user.authProvider !== 'local') {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await authService.comparePassword(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const tokens = await authService.generateTokens(user._id , user.name);
    res.status(200).json(tokens);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

    // Verify token in DB
    const session = await Session.findOne({ refreshToken });
    if (!session) return res.status(403).json({ message: 'Invalid refresh token' });

    // Verify JWT signature
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) return res.status(403).json({ message: 'Refresh token expired' });

      // Issue new tokens
      await Session.deleteOne({ _id: session._id }); // Delete old session
      const tokens = await authService.generateTokens(decoded.id); // Generate new pair
      res.status(200).json(tokens);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // 1. Delete the user's active session token
    await Session.deleteOne({ refreshToken });

    // 2. Check the user's settings and clear history if enabled
    if (req.user && req.user._id) {
      const userSettings = await Settings.findOne({ userId: req.user._id });

      if (userSettings && userSettings.clearHistoryOnLogout === true) {
        // Step A: Find all conversations for this user to get their IDs
        const userConversations = await Conversation.find({ userId: req.user._id });
        const conversationIds = userConversations.map(conv => conv._id);

        // Step B: Delete all messages associated with those specific conversations
        if (conversationIds.length > 0) {
          await Message.deleteMany({ conversationId: { $in: conversationIds } });
        }

        // Step C: Delete the conversations themselves
        await Conversation.deleteMany({ userId: req.user._id });
      }
    }

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Handles Google OAuth callback token generation
exports.googleCallback = async (req, res) => {
  try {
    const tokens = await authService.generateTokens(req.user._id);
    
    // 👇 Change 3000 to 5173 to match your Vite frontend
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    res.redirect(`${frontendURL}/oauth-success?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    // req.user is populated by the protect middleware
    res.status(200).json(req.user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};