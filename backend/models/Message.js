// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true // Extremely important for fast queries when opening a chat!
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String, // The user's query OR the RAG model's answer
    required: true
  },
  
  // RAG Specific Metadata (Only populated when role === 'assistant')
  ragData: {
    citations: [{
      text: String, // The exact snippet cited
      referenceId: String // e.g., "[1]" to map to the UI
    }],
    sources: [{
      title: String,
      url: String, // Link to documentation or source code
      peripheral: String // E.g., "STM32 Reference Manual"
    }],
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100 // e.g., 95.5
    },
    confidenceLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High']
    },
    followUpQuestions: [{
      type: String
    }]
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);