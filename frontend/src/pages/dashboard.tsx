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
  BookOpen,
  Palette,
  Settings,
  Sliders
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { Button } from "../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Badge } from "../components/ui/badge";

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

export interface LearningStyleOption {
  id: string;
  label: string;
  badge: string;
  desc: string;
}

export const LEARNING_STYLES: LearningStyleOption[] = [
  {
    id: "simple",
    label: "Simple",
    badge: "Easy",
    desc: "Explains concepts in very easy language, ideal for beginners"
  },
  {
    id: "detailed",
    label: "Detailed",
    badge: "Deep",
    desc: "In-depth explanation with concepts, reasoning, examples & technical details"
  },
  {
    id: "concise",
    label: "Concise",
    badge: "Quick",
    desc: "Direct answer with minimal explanation, best for quick revision"
  },
  {
    id: "tutor",
    label: "Tutor",
    badge: "Guided",
    desc: "Explains step-by-step like a teacher, building up concepts gradually"
  }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { logout, userName: authUserName } = useAuth();
  const { theme, toggleTheme, preset, setPreset } = useTheme();
  
  const [greeting, setGreeting] = useState("Good evening");
  const [userName, setUserName] = useState<string>(authUserName || "User"); 

  const [inputText, setInputText] = useState("");
  const [selectedManual, setSelectedManual] = useState<string>("STM32F1");
  const [isManualMenuOpen, setIsManualMenuOpen] = useState(false);
  const manualMenuRef = useRef<HTMLDivElement>(null);

  const [selectedStyle, setSelectedStyle] = useState<string>("detailed");
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const styleMenuRef = useRef<HTMLDivElement>(null);

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
      if (styleMenuRef.current && !styleMenuRef.current.contains(event.target as Node)) {
        setIsStyleMenuOpen(false);
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }, [inputText]);

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

      const response = await chatApi.postMessage(currentConvId, textToSend, selectedManual, selectedStyle);

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
        <div className="nav-right" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="theme-toggle" title="Select Theme">
                <Palette size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[165px] p-1.5 space-y-0.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-2xl">
              <DropdownMenuItem
                className="flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg text-xs font-semibold hover:bg-[var(--bg-hover)]"
                onClick={() => setPreset('cosmic')}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                  <span>Cosmic Night</span>
                </div>
                {preset === 'cosmic' && <Check size={14} className="text-purple-400 shrink-0" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg text-xs font-semibold hover:bg-[var(--bg-hover)]"
                onClick={() => setPreset('amber')}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Amber</span>
                </div>
                {preset === 'amber' && <Check size={14} className="text-amber-400 shrink-0" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg text-xs font-semibold hover:bg-[var(--bg-hover)]"
                onClick={() => setPreset('nature')}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Nature</span>
                </div>
                {preset === 'nature' && <Check size={14} className="text-emerald-400 shrink-0" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg text-xs font-semibold hover:bg-[var(--bg-hover)]"
                onClick={() => setPreset('vercel')}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-white shrink-0" />
                  <span>Vercel</span>
                </div>
                {preset === 'vercel' && <Check size={14} className="text-foreground shrink-0" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Dark Mode">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Settings Side Drawer Panel */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="theme-toggle" title="Settings">
                <Settings size={18} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md bg-background border-border p-6 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                <SheetHeader className="space-y-1 text-left">
                  <div className="flex items-center gap-2 text-purple-400">
                    <Sliders size={18} />
                    <SheetTitle className="text-xl font-bold">Settings</SheetTitle>
                  </div>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Customize your STM32 reference target, AI explanation style, and theme appearance.
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 pt-2">
                  {/* 1. STM32 Reference Manual Target */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      STM32 Reference Manual Target
                    </label>
                    <Select value={selectedManual} onValueChange={setSelectedManual}>
                      <SelectTrigger className="w-full bg-secondary/60 border-border/80 rounded-xl">
                        <SelectValue placeholder="Select Manual Target" />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        {stmManuals.map((manual) => (
                          <SelectItem key={manual} value={manual}>
                            {manual}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2. Learning & Explanation Style */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Learning & Explanation Style
                    </label>
                    <RadioGroup value={selectedStyle} onValueChange={setSelectedStyle} className="space-y-2.5">
                      {LEARNING_STYLES.map((styleObj) => (
                        <label
                          key={styleObj.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            selectedStyle === styleObj.id
                              ? "border-purple-500/50 bg-purple-500/10 shadow-sm"
                              : "border-border/60 bg-secondary/40 hover:bg-secondary/70"
                          }`}
                        >
                          <RadioGroupItem value={styleObj.id} id={styleObj.id} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-foreground">{styleObj.label}</span>
                              <Badge variant="purple" className="text-[10px] px-2 py-0">
                                {styleObj.badge}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {styleObj.desc}
                            </p>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* 3. Theme Preset Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Color Theme Preset
                    </label>
                    <Select value={preset} onValueChange={(val) => setPreset(val as any)}>
                      <SelectTrigger className="w-full bg-secondary/60 border-border/80 rounded-xl">
                        <SelectValue placeholder="Select Theme" />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value="cosmic">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                            <span>Cosmic Night</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="amber">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            <span>Amber</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="nature">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span>Nature</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="vercel">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-white" />
                            <span>Vercel</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 4. Appearance Mode */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-secondary/40">
                    <div>
                      <div className="text-xs font-bold text-foreground">Appearance Mode</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Switch between Light and Dark color modes
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleTheme}
                      className="rounded-xl border-border hover:border-purple-500/50"
                    >
                      {theme === 'dark' ? <Sun size={14} className="mr-1.5 text-amber-400" /> : <Moon size={14} className="mr-1.5 text-purple-400" />}
                      <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border/60 text-center mt-6">
                <span className="text-[11px] text-muted-foreground font-mono">
                  MicroGPT Technical Intelligence v2.0
                </span>
              </div>
            </SheetContent>
          </Sheet>

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
                          if (!inline) {
                            return (
                              <CodeBlockComponent
                                language={match ? match[1] : "c"}
                                value={codeString}
                              />
                            );
                          }
                          return (
                            <code className="inline-code" {...props}>
                              {children}
                            </code>
                          );
                        },
                        table({ children }: any) {
                          return (
                            <div className="table-responsive-wrapper">
                              <table className="markdown-table">{children}</table>
                            </div>
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
              ref={textareaRef}
              className="chat-input"
              placeholder="Ask MicroGPT anything about STM32 hardware, registers, or code..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            
            <div className="input-footer">
              <div className="selectors-group">
                {/* STM32 Manual Selector */}
                <DropdownMenu open={isManualMenuOpen} onOpenChange={setIsManualMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="manual-pill-btn"
                      title="Select STM32 Reference Manual"
                    >
                      <span className="manual-selected-value">{selectedManual}</span>
                      <ChevronDown size={14} className={`select-chevron ${isManualMenuOpen ? 'open' : ''}`} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" sideOffset={10} style={{ padding: "14px 16px" }} className="z-[9999] w-[170px] bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-2xl rounded-2xl">
                    <div className="flex flex-col gap-1 max-h-[260px] overflow-y-auto">
                      {stmManuals.map((manual) => (
                        <DropdownMenuItem
                          key={manual}
                          style={{ padding: "8px 12px", marginBottom: "3px" }}
                          className="flex items-center justify-between cursor-pointer rounded-xl text-xs font-bold hover:bg-[var(--bg-hover)]"
                          onClick={() => {
                            setSelectedManual(manual);
                            setIsManualMenuOpen(false);
                          }}
                        >
                          <span>{manual}</span>
                          {selectedManual === manual && <Check size={14} style={{ color: "var(--accent-purple)" }} className="manual-check-icon shrink-0" />}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Learning Style Selector */}
                <DropdownMenu open={isStyleMenuOpen} onOpenChange={setIsStyleMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="manual-pill-btn style-pill-btn"
                      title="Select Learning & Explanation Style"
                    >
                      <span className="manual-selected-value">
                        {LEARNING_STYLES.find((s) => s.id === selectedStyle)?.label || "Detailed"}
                      </span>
                      <ChevronDown size={14} className={`select-chevron ${isStyleMenuOpen ? 'open' : ''}`} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" sideOffset={10} style={{ padding: "16px" }} className="z-[9999] w-[330px] bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-2xl rounded-2xl">
                    <div className="flex flex-col gap-2">
                      {LEARNING_STYLES.map((styleObj) => (
                        <DropdownMenuItem
                          key={styleObj.id}
                          style={{ padding: "10px 12px", marginBottom: "4px" }}
                          className="flex flex-col items-start gap-1 cursor-pointer rounded-xl hover:bg-[var(--bg-hover)]"
                          onClick={() => {
                            setSelectedStyle(styleObj.id);
                            setIsStyleMenuOpen(false);
                          }}
                        >
                          <div className="flex items-center justify-between w-full font-bold text-xs">
                            <span>{styleObj.label}</span>
                            {selectedStyle === styleObj.id && <Check size={14} style={{ color: "var(--accent-purple)" }} className="shrink-0" />}
                          </div>
                          <span className="text-[11px] font-normal text-[var(--text-secondary)] leading-relaxed">
                            {styleObj.desc}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
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