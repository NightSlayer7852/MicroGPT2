// src/pages/dashboard.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

import { chatApi, type Message } from "../api/chatApi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import { 
  Copy, 
  Check, 
  RotateCcw, 
  Sparkles, 
  Cpu, 
  Clock, 
  Zap, 
  ShieldAlert, 
  Paperclip, 
  Send,
  Sun,
  Moon,
  ChevronDown,
  BookOpen
} from "lucide-react";

// --- Custom CodeBlock with Copy Header Bar ---
function CodeBlockComponent({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-lang-label">{language || "code"}</span>
        <button className="code-copy-btn" onClick={handleCopyCode} title="Copy code">
          {copied ? (
            <>
              <Check size={14} className="success-icon" /> <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} /> <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter style={vscDarkPlus} language={language || "text"} PreTag="div">
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { logout, userName: authUserName } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [greeting, setGreeting] = useState("Good evening");
  const [userName, setUserName] = useState<string>(authUserName || "User"); 

  const [inputText, setInputText] = useState("");
  const [selectedManual, setSelectedManual] = useState<string>("STM32F1");
  const [isManualMenuOpen, setIsManualMenuOpen] = useState(false);
  const manualMenuRef = useRef<HTMLDivElement>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "info" } | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const stmManuals = ["STM32F1", "STM32F4", "STM32G0", "STM32G4", "STM32L4", "STM32U5", "STM32WB", "STM32WL"];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (manualMenuRef.current && !manualMenuRef.current.contains(event.target as Node)) {
        setIsManualMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (message: string, type: "error" | "info" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };
  
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
    if (authUserName) {
      setUserName(authUserName);
    }
  }, [authUserName]);

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
        const newConv = await chatApi.createConversation(textToSend.substring(0, 30), selectedManual);
        currentConvId = newConv._id;
        setActiveConversationId(newConv._id);
        
        setSearchParams({ c: newConv._id });
        window.dispatchEvent(new Event("refreshSidebar"));
      }

      const response = await chatApi.postMessage(currentConvId, textToSend, selectedManual);

      setMessages((prev) => {
        const filtered = prev.filter((m) => m._id !== tempUserMsg._id); 
        return [...filtered, response.userMessage, response.assistantMessage];
      });

    } catch (error: any) {
      console.error("Failed to send message:", error);
      const errMsg =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        "Failed to send message";
      showToast(errMsg, "error");
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleRegenerateLast = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const promptSuggestions = [
    { title: "Clock Configuration", desc: "How do I configure the STM32 System Clock (RCC)?", icon: <Clock size={18} /> },
    { title: "I2C Communication", desc: "Explain I2C bus setup & register configuration", icon: <Zap size={18} /> },
    { title: "HardFault Debugging", desc: "How to debug and isolate a HardFault handler?", icon: <ShieldAlert size={18} /> },
    { title: "GPIO Pin Control", desc: "Configure GPIO input, output, and interrupt modes", icon: <Cpu size={18} /> },
  ];

  const userInitial = userName !== "Loading..." ? userName.charAt(0).toUpperCase() : "";

  return (
    <div className="dashboard-wrapper">
      {toast && (
        <div className={`toast-banner ${toast.type}`}>
          <div className="toast-content">
            <span className="toast-icon">⚠️</span>
            <span>{toast.message}</span>
          </div>
          <button className="toast-close" onClick={() => setToast(null)}>&times;</button>
        </div>
      )}
      <nav className="top-nav">
        <div className="nav-center-title">
          <Sparkles size={16} className="sparkle-icon" />
          <span>MicroGPT RAG Engine</span>
        </div>
        <div className="nav-right" style={{ marginLeft: "auto" }}>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Dark Mode">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
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
              <span className="sub-greeting">What would you like to explore in the STM32 manuals?</span>
            </h1>
            <div className="suggestions-grid">
              {promptSuggestions.map((item, index) => (
                <button key={index} className="suggestion-card" onClick={() => handleSendMessage(item.desc)}>
                  <div className="suggestion-icon">{item.icon}</div>
                  <div className="suggestion-text">
                    <div className="suggestion-title">{item.title}</div>
                    <div className="suggestion-desc">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat-feed">
            {messages.map((msg, idx) => {
              // 1. Extract citations list (check ragData.citations, content text, OR ragData.sources fallback)
              let citationItems: string[] = [];

              if (msg.ragData?.citations && Array.isArray(msg.ragData.citations) && msg.ragData.citations.length > 0) {
                citationItems = msg.ragData.citations
                  .map((c: any) => typeof c === 'string' ? c : (c?.text || c?.title))
                  .filter(Boolean);
              }

              if (citationItems.length === 0 && /citations/i.test(msg.content)) {
                const citationMatch = msg.content.match(/(?:\*\*|###\s*)?Citations(?:\*\*|:)?([\s\S]*?)(?=(?:\*\*|###\s*)?Follow-up|\n\n\n|$)/i);
                if (citationMatch && citationMatch[1]) {
                  citationItems = citationMatch[1]
                    .split('\n')
                    .map(l => l.trim().replace(/^[-*•\d.]+\s*/, ''))
                    .filter(l => l.length > 3);
                }
              }

              if (citationItems.length === 0 && msg.ragData?.sources && Array.isArray(msg.ragData.sources) && msg.ragData.sources.length > 0) {
                citationItems = msg.ragData.sources.map((s: any) => {
                  const title = s.title || s.chapter || 'STM32 Reference Manual';
                  const page = s.url || (s.page ? `Page ${s.page}` : '');
                  return page && page !== '#' ? `${title} (${page})` : title;
                });
              }

              // 2. Clean answer content for markdown rendering
              let cleanContent = msg.content
                .replace(/^(?:\*\*|###\s*)?Answer(?:\*\*|:)?\s*/i, "")
                .replace(/(?:\*\*|###\s*)?Citations(?:\*\*|:)?[\s\S]*$/i, "")
                .replace(/(?:\*\*|###\s*)?Follow-up Questions(?:\*\*|:)?[\s\S]*$/i, "")
                .trim();

              return (
                <div key={msg._id} className={`message-row ${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <div className="message-avatar ai-avatar">
                      <Sparkles size={16} color="white" />
                    </div>
                  )}
                  <div className={`message-bubble ${msg.role}`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || "");
                          const codeString = String(children).replace(/\n$/, "");
                          return !inline && match ? (
                            <CodeBlockComponent language={match[1]} value={codeString} />
                          ) : (
                            <code className={className} {...props}>{children}</code>
                          );
                        },
                      }}
                    >
                      {cleanContent}
                    </ReactMarkdown>

                    {/* Theme-matched Grey Box for Citations */}
                    {msg.role === 'assistant' && citationItems.length > 0 && (
                      <div className="citations-box">
                        <div className="citations-header">
                          <BookOpen size={14} />
                          <span>Citations</span>
                        </div>
                        <div className="citations-list">
                          {citationItems.map((cite, i) => (
                            <div key={i} className="citation-item">
                              {cite}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-up Questions Pills */}
                    {msg.ragData && msg.ragData.followUpQuestions && msg.ragData.followUpQuestions.length > 0 && (
                      <div className="follow-up-container">
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

                  {/* Assistant Action Toolbar */}
                  {msg.role === 'assistant' && (
                    <div className="assistant-action-toolbar">
                      <button
                        className="action-pill-btn"
                        onClick={() => handleCopyMessage(msg._id, msg.content)}
                        title="Copy response"
                      >
                        {copiedMsgId === msg._id ? (
                          <>
                            <Check size={14} className="success-icon" /> <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> <span>Copy</span>
                          </>
                        )}
                      </button>

                      {idx === messages.length - 1 && (
                        <button
                          className="action-pill-btn"
                          onClick={handleRegenerateLast}
                          disabled={isTyping}
                          title="Regenerate response"
                        >
                          <RotateCcw size={14} /> <span>Regenerate</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
            
            {isTyping && (
              <div className="message-row assistant">
                <div className="message-avatar ai-avatar">
                   <Sparkles size={16} color="white" />
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
              placeholder="Ask MicroGPT anything about STM32 hardware, registers, or code..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            
            <div className="input-footer">
              <div className="model-selector-container" ref={manualMenuRef}>
                <button
                  type="button"
                  className="manual-pill-btn"
                  onClick={() => setIsManualMenuOpen(!isManualMenuOpen)}
                  title="Select STM32 Reference Manual"
                >
                  <span className="manual-selected-value">{selectedManual}</span>
                  <ChevronDown size={14} className={`select-chevron ${isManualMenuOpen ? 'open' : ''}`} />
                </button>

                {isManualMenuOpen && (
                  <div className="manual-dropdown-menu">
                    {stmManuals.map((manual) => (
                      <button
                        key={manual}
                        type="button"
                        className={`manual-dropdown-item ${selectedManual === manual ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedManual(manual);
                          setIsManualMenuOpen(false);
                        }}
                      >
                        <span>{manual}</span>
                        {selectedManual === manual && <Check size={14} className="manual-check-icon" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="action-icons">
                <button className="icon-btn" aria-label="Attach File">
                  <Paperclip size={18} />
                </button>
                <button 
                  className={`send-btn ${inputText.trim() ? 'active' : ''}`} 
                  onClick={() => handleSendMessage()} 
                  disabled={!inputText.trim() || isTyping}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="disclaimer-row">
            <span>MicroGPT can make mistakes. Verify critical register addresses in official ST documentation.</span>
            <span><kbd>shift</kbd> + <kbd>return</kbd> for line break</span>
          </div>
        </div>
      </main>
    </div>
  );
}