// src/components/Sidebar.tsx
import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import {
    Settings,
    MessageCircleQuestionMark,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
    ChevronUp,
    Sun,
    Moon,
    Plus,
    MessageCircle,
    Trash2 // <-- 1. IMPORT TRASH ICON
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext"; 
import { chatApi, type Conversation } from "../api/chatApi";

import blackLogo from "../assets/white_logo_micro-removebg-preview.png";
import whiteLogo from "../assets/white_logo_micro-removebg-preview.png";

export default function Sidebar() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const currentChatId = searchParams.get("c"); 

    const [open, setOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    const { logout, userName } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const firstName = userName ? userName.split(" ")[0] : "User";
    const [conversations, setConversations] = useState<Conversation[]>([]);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const data = await chatApi.fetchConversations();
                setConversations(data);
            } catch (error) {
                console.error("Failed to load conversation history", error);
            }
        };
        
        // 1. Fetch exactly once when the component first mounts
        loadHistory();

        // 2. Listen for the custom event from the Dashboard
        window.addEventListener("refreshSidebar", loadHistory);
        
        // 3. Clean up the listener if the Sidebar ever unmounts (best practice)
        return () => window.removeEventListener("refreshSidebar", loadHistory);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const logoSrc = theme === 'dark' ? blackLogo : whiteLogo;

    const handleChatSelect = (id: string) => {
        navigate(`/dashboard?c=${id}`);
    };

    const handleNewChat = () => {
        navigate(`/dashboard`);
    };

    // 2. NEW: HANDLE DELETE LOGIC
    const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevents the parent div's onClick from firing

        try {
            // Delete from database
            await chatApi.deleteConversation(id);
            
            // Remove from local UI state instantly
            setConversations(prev => prev.filter(c => c._id !== id));

            // If they deleted the chat they are currently looking at, clear the dashboard
            if (currentChatId === id) {
                navigate('/dashboard');
            }
        } catch (error) {
            console.error("Failed to delete chat", error);
        }
    };

    const groupConversations = (convs: Conversation[]) => {
        const groups: { label: string; items: Conversation[] }[] = [
            { label: "Today", items: [] },
            { label: "Yesterday", items: [] },
            { label: "Previous 7 Days", items: [] },
            { label: "Older", items: [] }
        ];

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterdayStart = todayStart - 86400000;
        const sevenDaysStart = todayStart - 6 * 86400000;

        convs.forEach((conv) => {
            const time = new Date(conv.updatedAt || conv.createdAt).getTime();
            if (time >= todayStart) {
                groups[0].items.push(conv);
            } else if (time >= yesterdayStart) {
                groups[1].items.push(conv);
            } else if (time >= sevenDaysStart) {
                groups[2].items.push(conv);
            } else {
                groups[3].items.push(conv);
            }
        });

        return groups.filter(g => g.items.length > 0);
    };

    const categorizedGroups = groupConversations(conversations);

    return (
        <aside className={`sidebar ${collapsed ? "collapsed" : "expanded"}`}>
            
            {/* Logo Section */}
            <div className="sidebar-header">
                {collapsed ? (
                    <button 
                        className="collapsed-brand-btn" 
                        onClick={() => setCollapsed(false)}
                        title="Expand sidebar"
                    >
                        <div className="logo-toggle-wrapper">
                            <img 
                                src={logoSrc} 
                                alt="MicroGPT Logo" 
                                className="brand-logo-img"
                            />
                            <div className="toggle-icon-overlay">
                                <PanelLeftOpen size={20} />
                            </div>
                        </div>
                    </button>
                ) : (
                    <div className="sidebar-header-expanded">
                        <div className="sidebar-brand">
                            <img 
                                src={logoSrc} 
                                alt="MicroGPT Logo" 
                                style={{ width: "32px", height: "32px", objectFit: "contain" }}
                            />
                            <span className="brand-name">μGPT</span>
                        </div>
                        <button 
                            onClick={() => setCollapsed(true)} 
                            className="toggle-btn" 
                            title="Collapse sidebar"
                        >
                            <PanelLeftClose size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* Navigation & History Section */}
            <div className="sidebar-scroll-area">
                
                <button 
                    className={`sidebar-item new-chat-btn ${collapsed ? "collapsed-item" : ""} ${!currentChatId ? "active" : ""}`}
                    onClick={handleNewChat}
                    title="New Chat"
                >
                    <div className="item-icon"><Plus size={18} /></div>
                    {!collapsed && <span className="item-label font-bold">New Chat</span>}
                </button>

                <div className="history-container">
                    {categorizedGroups.map((group) => (
                        <div key={group.label} className="history-group">
                            {!collapsed && (
                                <p className="history-header">{group.label}</p>
                            )}
                            {group.items.map((conv) => (
                                <div
                                    key={conv._id}
                                    className={`sidebar-item history-item ${collapsed ? "collapsed-item" : ""} ${currentChatId === conv._id ? "active" : ""}`}
                                    onClick={() => handleChatSelect(conv._id)}
                                    title={conv.title}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                                        <div className="item-icon"><MessageCircle size={16} /></div>
                                        {!collapsed && <span className="item-label truncate">{conv.title}</span>}
                                    </div>
                                    
                                    {!collapsed && (
                                        <button
                                            className="delete-chat-btn"
                                            onClick={(e) => handleDeleteChat(e, conv._id)}
                                            title="Delete chat"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Fixed Bottom Menu */}
            <nav className="sidebar-bottom-nav">
                <SidebarItem to="/help" icon={<MessageCircleQuestionMark size={18} />} label="FAQ" collapsed={collapsed} />
                <SidebarItem to="/settings" icon={<Settings size={18} />} label="Settings" collapsed={collapsed} />
            </nav>

            {/* Profile/Account Section */}
            <div ref={dropdownRef} className="sidebar-footer">
                <div onClick={() => setOpen(!open)} className="user-profile-btn">
                    <button onClick={(e) => { e.stopPropagation(); toggleTheme(); }} className="theme-toggle-btn">
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    {!collapsed && (
                        <div className="user-info">
                            <span className="user-name">{firstName}</span>
                            <span className="user-plan">Free Plan</span>
                        </div>
                    )}
                    {!collapsed && (
                        <ChevronUp size={16} className={`chevron ${open ? "open" : ""}`} />
                    )}
                </div>

                {open && (
                    <div className="user-dropdown">
                        <div className="dropdown-divider" />
                        <button onClick={handleLogout} className="logout-btn">
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}

// --- Helper Component for Bottom Nav Links ---
interface SidebarItemProps {
    to: string;
    icon: React.ReactNode;
    label: string;
    collapsed: boolean;
}

function SidebarItem({ to, icon, label, collapsed }: SidebarItemProps) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => 
                `sidebar-item ${collapsed ? "collapsed-item" : ""} ${isActive ? "active" : ""}`
            }
            title={collapsed ? label : undefined}
        >
            <div className="item-icon">{icon}</div>
            {!collapsed && <span className="item-label">{label}</span>}
        </NavLink>
    );
}