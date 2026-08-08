// controllers/messageController.js
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const chatService = require('../services/chatService');

/**
 * @desc    Get all messages for a specific conversation
 * @route   GET /api/chat/messages/:conversationId
 * @access  Private
 */
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    // 1. Verify the conversation exists and belongs to the user (Security Check)
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    if (conversation.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to view this conversation' });
    }

    // 2. Fetch the messages sorted by oldest first (chronological order for the UI)
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: 'Server error while fetching messages' });
  }
};

/**
 * @desc    Send a new message and get the AI response
 * @route   POST /api/chat/messages
 * @access  Private
 */
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // 1. Verify the conversation exists and belongs to the user
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    if (conversation.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to post to this conversation' });
    }

    // 2. Save the User's message to the database
    const userMessage = await chatService.saveUserMessage(conversationId, content);

    // 3. Call the Mock AI Service (This simulates your FastAPI RAG delay & response)
    const assistantMessage = await chatService.generateAiResponse(conversationId, content);

    // 4. Update the Conversation's updatedAt timestamp so it jumps to the top of the history
    conversation.updatedAt = new Date();
    await conversation.save();

    // 5. Return both messages to the frontend so it can update its state with real DB IDs
    res.status(201).json({ 
      userMessage, 
      assistantMessage 
    });

  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: 'Server error while sending message' });
  }
};