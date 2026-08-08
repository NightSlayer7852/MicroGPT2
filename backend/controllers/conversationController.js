// controllers/conversationController.js
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

/**
 * @desc    Get all conversations for the logged-in user
 * @route   GET /api/chat/conversations
 * @access  Private
 */
exports.getConversations = async (req, res) => {
  try {
    // Find conversations belonging to this user, sorted by newest first
    const conversations = await Conversation.find({ userId: req.user._id })
      .sort({ updatedAt: -1 }); // -1 means descending order (newest at the top)

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: 'Server error while fetching conversations' });
  }
};

/**
 * @desc    Create a new conversation
 * @route   POST /api/chat/conversations
 * @access  Private
 */
exports.createConversation = async (req, res) => {
  try {
    const { title, peripheral } = req.body;

    const newConversation = await Conversation.create({
      userId: req.user._id,
      title: title || 'New Chat',
      peripheral: peripheral || 'General'
    });

    res.status(201).json(newConversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ message: 'Server error while creating conversation' });
  }
};

/**
 * @desc    Delete a conversation and all its messages
 * @route   DELETE /api/chat/conversations/:id
 * @access  Private
 */
exports.deleteConversation = async (req, res) => {
  try {
    const conversationId = req.params.id;

    // 1. Find the conversation to ensure it exists and belongs to the user
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Ensure the user deleting it actually owns it
    if (conversation.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this conversation' });
    }

    // 2. Delete all messages associated with this conversation
    await Message.deleteMany({ conversationId: conversationId });

    // 3. Delete the conversation itself
    await Conversation.findByIdAndDelete(conversationId);

    res.status(200).json({ message: 'Conversation and associated messages deleted successfully' });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ message: 'Server error while deleting conversation' });
  }
};