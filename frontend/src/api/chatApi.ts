// src/api/chatApi.ts
import axiosClient from './axiosClient';

// ==========================================
// TYPESCRIPT INTERFACES
// ==========================================

export interface Conversation {
  _id: string;
  userId: string;
  title: string;
  peripheral: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Citation {
  text: string;
  referenceId: string;
}

export interface Source {
  title: string;
  url: string;
  peripheral: string;
}

export interface RagData {
  citations?: Citation[];
  sources?: Source[];
  confidenceScore?: number;
  confidenceLevel?: 'Low' | 'Medium' | 'High';
  followUpQuestions?: string[]; // <-- NEW: Added this line!
}

export interface Message {
  _id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  ragData?: RagData;
  createdAt: string;
}

export interface SendMessageResponse {
  userMessage: Message;
  assistantMessage: Message;
}

// ==========================================
// API FUNCTIONS
// ==========================================

export const chatApi = {
  /**
   * Fetches all conversations for the logged-in user to populate the sidebar.
   */
  fetchConversations: async (): Promise<Conversation[]> => {
    const response = await axiosClient.get('/chat/conversations');
    return response.data;
  },

  /**
   * Initializes a new conversation in the database.
   */
  createConversation: async (title: string, peripheral: string = 'STM32F1'): Promise<Conversation> => {
    const response = await axiosClient.post('/chat/conversations', {
      title,
      peripheral
    });
    return response.data;
  },

  /**
   * Deletes a conversation and all of its associated messages.
   */
  deleteConversation: async (conversationId: string): Promise<void> => {
    await axiosClient.delete(`/chat/conversations/${conversationId}`);
  },

  /**
   * Fetches the complete message history for a specific conversation.
   */
  fetchMessages: async (conversationId: string): Promise<Message[]> => {
    const response = await axiosClient.get(`/chat/messages/${conversationId}`);
    return response.data;
  },

  /**
   * Sends a user's prompt to the backend and waits for the AI's response.
   */
  postMessage: async (conversationId: string, content: string, stmManual?: string, learningStyle?: string): Promise<SendMessageResponse> => {
    const response = await axiosClient.post('/chat/messages', {
      conversationId,
      content,
      stmManual,
      learningStyle
    });
    return response.data;
  }
};