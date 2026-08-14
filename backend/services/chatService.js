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


exports.generateAiResponse = async (conversationId, userPrompt, stmManual) => {
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

    // 1. Send the request to model backend (FastAPI or Gradio Space)
    let modelUrl = process.env.MODEL_URL || process.env.FASTAPI_URL || 'http://localhost:8000/query';
    let aiData = {};

    if (modelUrl.includes('hf.space')) {
      const gradioUrl = modelUrl.replace(/\/+$/, '').replace(/\/query$/, '') + '/call/predict';
      const response = await axios.post(gradioUrl, {
        data: [userPrompt, stmManual || 'STM32F1']
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (typeof response.data === 'string' && response.data.includes('data:')) {
        const lines = response.data.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const parsed = JSON.parse(line.slice(5).trim());
              if (Array.isArray(parsed) && parsed[0]) {
                aiData = { answer: parsed[0], sources: [], confidence: 1.0 };
              }
            } catch (e) {}
          }
        }
      } else if (response.data && Array.isArray(response.data.data)) {
        aiData = { answer: response.data.data[0], sources: [], confidence: 1.0 };
      } else {
        aiData = { answer: typeof response.data === 'string' ? response.data : JSON.stringify(response.data), sources: [], confidence: 1.0 };
      }
    } else {
      if (modelUrl && !modelUrl.endsWith('/query')) {
        modelUrl = modelUrl.replace(/\/+$/, '') + '/query';
      }

      const response = await axios.post(modelUrl, {
        query: userPrompt,
        history: history,
        session_id: conversationId ? conversationId.toString() : undefined,
        collection_name: stmManual || 'STM32F1'
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      aiData = response.data;
    }

    // ==========================================
    // PARSE SECTIONS: Answer, Citations, Follow-up Questions
    // ==========================================
    const rawAnswerText = aiData.answer || "";
    
    // 1. Extract Follow-up Questions
    const followUpParts = rawAnswerText.split(/Follow-up Questions:/i);
    let followUps = [];
    if (followUpParts.length > 1) {
      followUps = followUpParts[1]
        .split('\n')
        .filter(line => line.trim().match(/^\d+\./)) 
        .map(line => line.replace(/^\d+\.\s*/, '').trim()); 
    }

    const textBeforeFollowUps = followUpParts[0];

    // 2. Extract Citations (matches "Citations:", "**Citations:**", "Citation:")
    const citationParts = textBeforeFollowUps.split(/(?:\*\*|###\s*)?Citations(?:\*\*|:)?/i);
    let mainContent = citationParts[0].trim();
    let extractedCitations = [];

    if (citationParts.length > 1) {
      extractedCitations = citationParts[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.replace(/^[-*•\d.]+\s*/, '').trim())
        .filter(text => text.length > 0)
        .map(text => ({ text, referenceId: '#' }));
    }

    // 3. Map FastAPI "sources" to Frontend format
    const mappedSources = (aiData.sources || []).map((src) => ({
      title: src.chapter || "Extracted Document",
      url: src.page ? `Page ${src.page}` : "#",
      peripheral: "RAG Source"
    }));

    // Fallback: If no citations extracted from text, build them from Qdrant sources
    if (extractedCitations.length === 0 && mappedSources.length > 0) {
      extractedCitations = mappedSources.map(s => ({
        text: s.url && s.url !== '#' ? `${s.title} (${s.url})` : s.title,
        referenceId: '#'
      }));
    }

    // 4. Strip leading "Answer:" label from answer text if present
    mainContent = mainContent.replace(/^(?:\*\*|###\s*)?Answer(?:\*\*|:)?\s*/i, '').trim();
    // ==========================================

    // 2. Format the confidence score (strictly clamped between 0 and 100 for MongoDB)
    let rawConfidence = typeof aiData.confidence === 'number' ? aiData.confidence : 0;
    let score = rawConfidence <= 1.0 && rawConfidence >= 0 ? rawConfidence * 100 : rawConfidence;
    score = Math.round(score);
    score = Math.max(0, Math.min(100, score)); // Strictly 0-100

    let confidenceLevel = 'Low';
    if (score >= 80) confidenceLevel = 'High';
    else if (score >= 50) confidenceLevel = 'Medium';

    // 4. Construct the RAG Data for MongoDB
    const ragData = {
      citations: extractedCitations,
      sources: mappedSources,
      confidenceScore: score,
      confidenceLevel: confidenceLevel,
      followUpQuestions: followUps
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
    const status = error.response?.status || 500;
    const detail = error.response?.data?.detail || error.message;

    console.error("FastAPI Error:", status, detail);

    if (status === 429 || (typeof detail === 'string' && detail.includes("Rate limit"))) {
      const rateLimitErr = new Error("Rate limit reached for Groq API. Please wait a few minutes before trying again.");
      rateLimitErr.status = 429;
      rateLimitErr.detail = detail;
      throw rateLimitErr;
    }

    const fallbackMessage = await Message.create({
      conversationId,
      role: 'assistant',
      content: "⚠️ **Connection Error:** I couldn't reach the RAG engine. Please ensure the Python FastAPI server is running.",
    });

    return fallbackMessage;
  }
};