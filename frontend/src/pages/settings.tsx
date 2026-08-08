// src/pages/settings.tsx
import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { settingsApi, type UserSettings } from "../api/settingsApi";

export default function SettingsPage() {
  const { setTheme } = useTheme();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setLocalSettings] = useState<UserSettings>({
    theme: 'dark',
    preferredModel: 'MicroGPT 3.5 Smart',
    clearHistoryOnLogout: false
  });

  // 1. Fetch settings from DB on load
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsApi.getSettings();
        setLocalSettings(data);
        
        // GLOBAL SYNC: If the DB theme is different from the current context theme, update the context
        if (data.theme === 'light' || data.theme === 'dark') {
          setTheme(data.theme);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [setTheme]);

  // 2. Handle updating settings in the DB and locally
  const handleUpdate = async (key: keyof UserSettings, value: string | boolean) => {
    // Optimistic UI update
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setIsSaving(true);

    try {
      await settingsApi.updateSettings({ [key]: value });
      
      // GLOBAL SYNC: Instantly update CSS variables if theme changed
      if (key === 'theme' && (value === 'light' || value === 'dark')) {
        setTheme(value);
      }
    } catch (error) {
      console.error(`Failed to update ${key}:`, error);
      // Revert if API fails (optional, but good practice)
    } finally {
      setTimeout(() => setIsSaving(false), 500); // Small delay so the "Saving..." text feels smooth
    }
  };

  if (isLoading) {
    return <div className="settings-loading">Loading preferences...</div>;
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        {isSaving && <span className="saving-indicator">Saving...</span>}
      </div>

      <div className="settings-grid">
        
        {/* APPEARANCE SECTION */}
        <section className="settings-card">
          <h2>Appearance</h2>
          <div className="setting-row">
            <div className="setting-info">
              <h3>Theme</h3>
              <p>Customize the look and feel of MicroGPT.</p>
            </div>
            <div className="theme-toggle-group">
              <button 
                className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`}
                onClick={() => handleUpdate('theme', 'light')}
              >
                Light
              </button>
              <button 
                className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleUpdate('theme', 'dark')}
              >
                Dark
              </button>
            </div>
          </div>
        </section>


        {/* PRIVACY SECTION */}
        <section className="settings-card">
          <h2>Privacy & Data</h2>
          <div className="setting-row">
            <div className="setting-info">
              <h3>Clear History on Logout</h3>
              <p>Automatically wipe all active sessions from this device when you log out.</p>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.clearHistoryOnLogout}
                onChange={(e) => handleUpdate('clearHistoryOnLogout', e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </section>

      </div>
    </div>
  );
}