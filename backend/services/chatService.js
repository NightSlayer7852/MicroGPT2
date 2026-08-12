// services/chatService.js
const axios = require('axios');
const Message = require('../models/Message');

/**
 * Saves a message sent by the human user to the database.
 */
exports.saveUserMessage = async (conversationId, content) => {
  const userMessage = await Message.create({
    conversationId,
    role: 'user',
    content: content
  });
  
  return userMessage;
};


exports.generateAiResponse = async (conversationId, userPrompt) => {
  try {
    // 0. Fetch recent conversation history from MongoDB (last 6 messages)
    let history = [];
    if (conversationId) {
      const recentMessages = await Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();

      history = recentMessages.reverse().map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));
    }

    // 1. Send the request to your FastAPI server via Ngrok / Local
    let fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000/query';
    if (fastApiUrl && !fastApiUrl.endsWith('/query')) {
      fastApiUrl = fastApiUrl.replace(/\/+$/, '') + '/query';
    }
    
    const response = await axios.post(fastApiUrl, {
      query: userPrompt,
      history: history,
      session_id: conversationId ? conversationId.toString() : undefined
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const aiData = response.data; // Expected: { answer, sources, confidence }

    // ==========================================
    // NEW: Parse the Follow-up Questions out of the text
    // ==========================================
    const rawAnswerText = aiData.answer || "";
    
    // Split the text exactly where the FastAPI appends the follow-ups
    const parts = rawAnswerText.split("Follow-up Questions:");
    
    // The main answer is everything before the split
    const mainContent = parts[0].trim(); 
    
    // If there is a second part, extract the numbered questions
    let followUps = [];
    if (parts.length > 1) {
      followUps = parts[1]
        .split('\n')
        // Find lines that start with a number and a dot (e.g., "1. ")
        .filter(line => line.trim().match(/^\d+\./)) 
        // Remove the "1. " numbering so you just have the clean question text
        .map(line => line.replace(/^\d+\.\s*/, '').trim()); 
    }
    // ==========================================

    // 2. Format the confidence score (strictly clamped between 0 and 100 for MongoDB)
    let rawConfidence = typeof aiData.confidence === 'number' ? aiData.confidence : 0;
    let score = rawConfidence <= 1.0 && rawConfidence >= 0 ? rawConfidence * 100 : rawConfidence;
    score = Math.round(score);
    score = Math.max(0, Math.min(100, score)); // Strictly 0-100

    let confidenceLevel = 'Low';
    if (score >= 80) confidenceLevel = 'High';
    else if (score >= 50) confidenceLevel = 'Medium';

    // 3. Map FastAPI "sources" to the Frontend's expected format
    const mappedSources = (aiData.sources || []).map((src) => ({
      title: src.chapter || "Extracted Document",
      url: src.page ? `Page ${src.page}` : "#",
      peripheral: "RAG Source"
    }));

    // 4. Construct the RAG Data for MongoDB
    const ragData = {
      citations: [], // Leave empty unless your FastAPI specifically returns citation text snippets
      sources: mappedSources,
      confidenceScore: score,
      confidenceLevel: confidenceLevel,
      followUpQuestions: followUps // <-- Inject the extracted questions here
    };

    // 5. Save the AI's response to the database
    const assistantMessage = await Message.create({
      conversationId,
      role: 'assistant',
      content: mainContent || "I'm sorry, I couldn't generate an answer based on the provided documents.",
      ragData: ragData
    });

    return assistantMessage;

  } catch (error) {
    console.error("FastAPI Connection Error:", error.message);
    
    // Fallback: If the Python server is offline, save an error message to the chat
    const fallbackMessage = await Message.create({
      conversationId,
      role: 'assistant',
      content: "⚠️ **Connection Error:** I couldn't reach the RAG engine. Please ensure the Python FastAPI server and Ngrok tunnel are running.",
    });

    return fallbackMessage;
  }
};