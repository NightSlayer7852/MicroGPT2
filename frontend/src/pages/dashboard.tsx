// src/pages/dashboard.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useTheme } from "../context/ThemeContext";

import { chatApi, type Message } from "../api/chatApi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [greeting, setGreeting] = useState("Good evening");
  const [userName, setUserName] = useState("Loading..."); 

  const [inputText, setInputText] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axiosClient.get("/auth/me");
        setUserName(response.data.name); 
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setUserName("User"); 
      }
    };
    fetchUserProfile();
  }, []);

  useEffect(() => {
    const chatId = searchParams.get("c");
    
    if (chatId) {
      setActiveConversationId(chatId);
      const loadHistory = async () => {
        try {
          const pastMessages = await chatApi.fetchMessages(chatId);
          setMessages(pastMessages);
        } catch (error) {
          console.error("Failed to fetch chat history:", error);
        }
      };
      loadHistory();
    } else {
      setActiveConversationId(null);
      setMessages([]);
      setInputText("");
    }
  }, [searchParams]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // 1. UPDATED: Now accepts an optional string so our buttons can send text directly!
  const handleSendMessage = async (optionalText?: string) => {
    const textToSend = typeof optionalText === 'string' ? optionalText : inputText;
    
    if (!textToSend.trim() || isTyping) return;

    setInputText(""); 
    setIsTyping(true);

    let currentConvId = activeConversationId;

    try {
      const tempUserMsg: Message = {
        _id: Date.now().toString(),
        conversationId: currentConvId || "temp",
        role: "user",
        content: textToSend,
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      if (!currentConvId) {
        const newConv = await chatApi.createConversation(textToSend.substring(0, 30));
        currentConvId = newConv._id;
        setActiveConversationId(newConv._id);
        
        setSearchParams({ c: newConv._id });
        window.dispatchEvent(new Event("refreshSidebar"));
      }

      const response = await chatApi.postMessage(currentConvId, textToSend);

      setMessages((prev) => {
        const filtered = prev.filter((m) => m._id !== tempUserMsg._id); 
        return [...filtered, response.userMessage, response.assistantMessage];
      });

    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(); // Call without arguments to use inputText
    }
  };

  const promptSuggestions = [
    "How do I configure the STM32 clock?",
    "Explain I2C communication",
    "How to debug a HardFault?",
    "How to configure GPIO pins on STM32?",
  ];

  const handleSuggestionClick = (text: string) => {
    setInputText(text);
  };

  const userInitial = userName !== "Loading..." ? userName.charAt(0).toUpperCase() : "";

  return (
    <div className="dashboard-wrapper">
      <nav className="top-nav">
        <div className="nav-right" style={{ marginLeft: "auto" }}>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Dark Mode">
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>
          <button className="user-avatar" onClick={handleLogout} title="Click to Logout">
            {userInitial}
          </button>
        </div>
      </nav>

      <main className="main-content">
        {messages.length === 0 ? (
          <div className="hero-section">
            <div className="glowing-orb"></div>
            <h1 className="greeting">
              {greeting}, {userName.split(" ")[0]}
              <br />
              <span className="sub-greeting">Can I help you with anything?</span>
            </h1>
            <div className="suggestions-grid">
              {promptSuggestions.map((text, index) => (
                <button key={index} className="suggestion-card" onClick={() => handleSuggestionClick(text)}>
                  {text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat-feed">
            {messages.map((msg) => (
              <div key={msg._id} className={`message-row ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="message-avatar ai-avatar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                )}
                <div className={`message-bubble ${msg.role}`}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline && match ? (
                          <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>{children}</code>
                        );
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>

                  {msg.ragData && (
                    <div className="rag-metadata-container">
                      <div className="rag-header">
                        <span className="rag-title">Sources Analyzed</span>
                        {msg.ragData.confidenceScore !== undefined && (
                          <span className={`confidence-badge ${msg.ragData.confidenceLevel?.toLowerCase()}`}>
                            {msg.ragData.confidenceScore}% Confidence
                          </span>
                        )}
                      </div>
                      {msg.ragData.sources && msg.ragData.sources.length > 0 && (
                        <div className="sources-list">
                          {msg.ragData.sources.map((source, i) => (
                            <a key={i} href={source.url} target="_blank" rel="noreferrer" className="source-chip">
                              [{i + 1}] {source.title}
                            </a>
                          ))}
                        </div>
                      )}
                      
                      {/* 2. NEW: FOLLOW-UP QUESTIONS UI */}
                      {msg.ragData.followUpQuestions && msg.ragData.followUpQuestions.length > 0 && (
                        <div className="follow-up-container">
                          <p className="follow-up-title">Related Questions:</p>
                          <div className="follow-up-list">
                            {msg.ragData.followUpQuestions.map((q, i) => (
                              <button 
                                key={i} 
                                className="follow-up-btn"
                                onClick={() => handleSendMessage(q)}
                                disabled={isTyping}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message-row assistant">
                <div className="message-avatar ai-avatar">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div className="message-bubble assistant typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="input-container-wrapper">
          <div className="input-box">
            <textarea
              className="chat-input"
              placeholder="How can MicroGPT help you today?"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
            />
            
            <div className="input-footer">
              <div className="model-selector">
                MicroGPT 3.5 Smart 
              </div>
              
              <div className="action-icons">
                <button className="icon-btn" aria-label="Attach File">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                  </svg>
                </button>
                <button 
                  className={`send-btn ${inputText.trim() ? 'active' : ''}`} 
                  onClick={() => handleSendMessage()} 
                  disabled={!inputText.trim() || isTyping}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <div className="disclaimer-row">
            <span>MicroGPT can make mistakes. Please double-check responses.</span>
            <span>Use <kbd>shift</kbd> + <kbd>return</kbd> for new line</span>
          </div>
        </div>
      </main>
    </div>
  );
}