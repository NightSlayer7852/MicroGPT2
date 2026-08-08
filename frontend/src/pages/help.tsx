// src/pages/help.tsx
import { useState, useEffect } from "react";
import { faqApi, type Faq } from "../api/faqApi";
import { ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function HelpPage() {
  const [peripherals, setPeripherals] = useState<string[]>([]);
  const [selectedPeripheral, setSelectedPeripheral] = useState<string>("All");
  
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch the dropdown options on mount
  useEffect(() => {
    const loadPeripherals = async () => {
      try {
        const data = await faqApi.getPeripherals();
        setPeripherals(["All", ...data]); // Prepend 'All' to the list
      } catch (error) {
        console.error("Failed to load peripherals", error);
      }
    };
    loadPeripherals();
  }, []);

  // 2. Fetch FAQs whenever the dropdown changes
  useEffect(() => {
    const loadFaqs = async () => {
      setIsLoading(true);
      try {
        const data = await faqApi.getFaqs(selectedPeripheral);
        setFaqs(data);
        setExpandedId(null); // Close any open accordions when switching categories
      } catch (error) {
        console.error("Failed to load FAQs", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFaqs();
  }, [selectedPeripheral]);

  // Handle Accordion Toggle
  const toggleAccordion = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="help-container">
      <div className="help-header">
        <h1>Frequently Asked Questions</h1>
        <p>Explore peripheral-specific hardware configurations and common troubleshooting steps.</p>
      </div>

      <div className="help-controls">
        <label className="help-label">Filter by Peripheral:</label>
        <div className="custom-select-wrapper">
          <select 
            className="help-select"
            value={selectedPeripheral}
            onChange={(e) => setSelectedPeripheral(e.target.value)}
          >
            {peripherals.map(p => (
              <option key={p} value={p}>{p === 'All' ? 'All Hardware' : p}</option>
            ))}
          </select>
          <ChevronDown className="select-icon" size={16} />
        </div>
      </div>

      <div className="faq-list">
        {isLoading ? (
          <div className="help-loading">Loading Knowledge Base...</div>
        ) : faqs.length === 0 ? (
          <div className="help-empty">No FAQs found for this hardware.</div>
        ) : (
          faqs.map((faq) => {
            const isOpen = expandedId === faq._id;
            return (
              <div key={faq._id} className={`accordion-item ${isOpen ? 'open' : ''}`}>
                
                <button 
                  className="accordion-header" 
                  onClick={() => toggleAccordion(faq._id)}
                >
                  <span className="faq-question">{faq.question}</span>
                  <ChevronDown className={`accordion-icon ${isOpen ? 'rotate' : ''}`} size={20} />
                </button>
                
                <div className="accordion-body">
                  <div className="accordion-content">
                    {/* Render the answer using Markdown! */}
                    <div className="faq-answer markdown-body">
                      <ReactMarkdown>{faq.answer}</ReactMarkdown>
                    </div>
                    
                    {/* Render the Tags */}
                    {faq.tags && faq.tags.length > 0 && (
                      <div className="faq-tags">
                        {faq.tags.map(tag => (
                          <span key={tag} className="faq-tag-chip">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}