// routes/chatRoutes.js
const express = require('express');
const router = express.Router();

// Import the auth middleware to protect these routes
const { protect } = require('../middleware/authMiddleware');

// Import the controllers
const conversationController = require('../controllers/conversationController');
const messageController = require('../controllers/messageController');

// ==========================================
// CONVERSATION ROUTES (/api/chat/conversations)
// ==========================================

// Get all conversations for the logged-in user
router.get('/conversations', protect, conversationController.getConversations);

// Create a new conversation
router.post('/conversations', protect, conversationController.createConversation);

// Delete a specific conversation (and its messages)
router.delete('/conversations/:id', protect, conversationController.deleteConversation);

// ==========================================
// MESSAGE ROUTES (/api/chat/messages)
// ==========================================

// Get all messages for a specific conversation
router.get('/messages/:conversationId', protect, messageController.getMessages);

// Send a user message and get the AI response
router.post('/messages', protect, messageController.sendMessage);

module.exports = router;