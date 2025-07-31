import React, { useState, useEffect, useRef } from 'react';
import '../styles/UserProfilePanel.css';

/**
 * UserProfilePanel component with enhanced fallbacks and guaranteed visibility
 * Features:
 * - Multi-tiered fallback system for user data
 * - Offline support with localStorage caching
 * - Guaranteed visibility with aggressive inline styling
 * - Keyboard accessibility
 * - Dark mode support
 */

/**
 * UserProfilePanel component - Manages user profile settings and displays user information
 * Features:
 * - User avatar and info display
 * - Profile settings management
 * - Organization membership view
 * - API key management
 * - User preferences
 */
const UserProfilePanel = ({ 
  isOpen,
  onClose,
  username,
  isAdmin,
  apiStatus,
  updateUserPreferences,
  userPreferences = {}
}) => {
  // Debug logging with detailed fallback info
  console.log('UserProfilePanel rendering:', { 
    isOpen, 
    username, 
    isAdmin, 
    apiStatus: apiStatus?.status || 'unknown',
    usingFallbacks: apiStatus?.status !== 'online'
  });
  const panelRef = useRef(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  // Multi-tiered fallback system for profile data
  const [profileData, setProfileData] = useState(() => {
    // Try to load from localStorage first (offline support)
    try {
      const cachedProfile = localStorage.getItem('user-profile-data');
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        console.log('Loaded profile data from localStorage cache');
        return parsed;
      }
    } catch (err) {
      console.warn('Failed to load profile from localStorage:', err);
    }
    
    // Fallback to constructed data from props
    const defaultData = {
      displayName: username || 'User',
      email: username ? `${username}@example.com` : 'user@example.com', 
      bio: '',
      avatar: username ? username.charAt(0).toUpperCase() : 'U',
      lastUpdated: new Date().toISOString(),
      dataSource: 'fallback'
    };
    
    // Save default data to localStorage as cache
    try {
      localStorage.setItem('user-profile-data', JSON.stringify(defaultData));
    } catch (err) {
      console.warn('Failed to cache profile data:', err);
    }
    
    return defaultData;
  });
  
  const [apiKeys, setApiKeys] = useState([
    // Placeholder data
    { name: 'Default Key', key: '••••••••••••••••', created: '2025-06-15', lastUsed: '2025-07-07' }
  ]);
  
  const [organizations, setOrganizations] = useState([
    // Placeholder data
    { name: 'Personal', role: 'Owner' },
    { name: 'Windsurf AI', role: 'Member' }
  ]);
  
  const userPrefs = (() => {
    // Try to load from localStorage first if no props available
    const fallbackPrefs = {
      editorLanguage: 'javascript',
      fontSize: 14,
      tabSize: 2,
      autoSave: true,
      lineNumbers: true,
      wordWrap: true,
      localFallbacks: true,
      theme: 'vs-light',
      useDarkMode: false
    };
    
    // If userPreferences prop is empty or incomplete, try localStorage
    if (!userPreferences || Object.keys(userPreferences).length === 0) {
      try {
        const savedPrefs = localStorage.getItem('userPreferences');
        if (savedPrefs) {
          const parsed = JSON.parse(savedPrefs);
          console.log('Using preferences from localStorage');
          return { ...fallbackPrefs, ...parsed };
        }
      } catch (err) {
        console.warn('Failed to load preferences from localStorage:', err);
      }
      return fallbackPrefs;
    }
    
    // Otherwise use the provided preferences with fallbacks for missing values
    return {
      editorLanguage: userPreferences.editorLanguage || fallbackPrefs.editorLanguage,
      fontSize: userPreferences.fontSize || fallbackPrefs.fontSize,
      tabSize: userPreferences.tabSize || fallbackPrefs.tabSize,
      autoSave: userPreferences.autoSave ?? fallbackPrefs.autoSave,
      lineNumbers: userPreferences.lineNumbers ?? fallbackPrefs.lineNumbers,
      wordWrap: userPreferences.wordWrap ?? fallbackPrefs.wordWrap,
      localFallbacks: userPreferences.localFallbacks ?? fallbackPrefs.localFallbacks,
      theme: userPreferences.theme || fallbackPrefs.theme,
      useDarkMode: userPreferences.useDarkMode ?? fallbackPrefs.useDarkMode
    };
  })();
  
  const [preferences, setPreferences] = useState({
    defaultLanguage: userPrefs.editorLanguage,
    editorFontSize: userPrefs.fontSize,
    tabSize: userPrefs.tabSize,
    autoSave: userPrefs.autoSave,
    lineNumbers: userPrefs.lineNumbers,
    wordWrap: userPrefs.wordWrap,
    useLocalFallbacks: userPrefs.localFallbacks,
  });

  // Handle preference changes
  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, [key]: value };
      // Update preferences in parent component
      if (updateUserPreferences) {
        updateUserPreferences(newPrefs);
      }
      return newPrefs;
    });
  };
  
  // Save profile changes with multi-tiered fallback system
  const saveProfileChanges = () => {
    try {
      // Add metadata to track data freshness and source
      const updatedProfile = {
        ...profileData,
        lastUpdated: new Date().toISOString(),
        dataSource: apiStatus?.status === 'online' ? 'api' : 'local'
      };
      
      // Primary: Try API save if online
      if (apiStatus?.status === 'online') {
        // In a real app, this would be an async API call
        console.log('Saving profile to API:', updatedProfile);
        // Simulate API call success
      }
      
      // Secondary: Always save to localStorage as backup/offline support
      localStorage.setItem('user-profile-data', JSON.stringify(updatedProfile));
      console.log('Profile cached in localStorage');
      
      // Update state and exit edit mode
      setProfileData(updatedProfile);
      setEditMode(false);
      
      // Provide user feedback
      const source = apiStatus?.status === 'online' ? 'saved to server' : 'saved locally (offline mode)';
      alert(`Profile updated successfully - ${source}`);
      
    } catch (error) {
      console.error('Failed to save profile changes:', error);
      alert(`Failed to save changes: ${error.message}. Please try again.`);
    }
  };
  
  // Generate a new API key
  const generateApiKey = () => {
    const newKeyName = prompt('Enter a name for your new API key:');
    if (!newKeyName) return;
    
    // In a real app, this would call the backend API
    const newKey = {
      name: newKeyName,
      key: '••••••••••••••••',
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never'
    };
    
    setApiKeys([...apiKeys, newKey]);
  };
  
  // Delete an API key
  const deleteApiKey = (index) => {
    if (confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      const newKeys = [...apiKeys];
      newKeys.splice(index, 1);
      setApiKeys(newKeys);
    }
  };

  // Render the profile tab content
  const renderProfileTab = () => (
    <div className="profile-tab">
      <div className="profile-header">
        <div className="profile-avatar">
          {profileData.avatar}
        </div>
        <div className="profile-info">
          <h3>{editMode ? 
            <input 
              type="text" 
              value={profileData.displayName}
              onChange={(e) => setProfileData({...profileData, displayName: e.target.value})}
              className="edit-input"
            /> : 
            profileData.displayName}
          </h3>
          <p className="profile-role">{isAdmin ? 'Administrator' : 'Developer'}</p>
          {editMode ? (
            <input 
              type="email" 
              value={profileData.email}
              onChange={(e) => setProfileData({...profileData, email: e.target.value})}
              className="edit-input"
            />
          ) : (
            <p className="profile-email">{profileData.email}</p>
          )}
        </div>
        <button 
          onClick={() => editMode ? saveProfileChanges() : setEditMode(true)} 
          className={editMode ? "save-button" : "edit-button"}
        >
          {editMode ? 'Save' : 'Edit'}
        </button>
      </div>
      
      {editMode && (
        <div className="profile-bio-edit">
          <label>Bio</label>
          <textarea 
            value={profileData.bio}
            onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
            placeholder="Tell us about yourself..."
            rows={4}
          />
        </div>
      )}
      
      {!editMode && profileData.bio && (
        <div className="profile-bio">
          <p>{profileData.bio}</p>
        </div>
      )}
      
      <div className="profile-stats">
        <div className="stat">
          <span className="stat-value">42</span>
          <span className="stat-label">Projects</span>
        </div>
        <div className="stat">
          <span className="stat-value">156</span>
          <span className="stat-label">Files</span>
        </div>
        <div className="stat">
          <span className="stat-value">1,204</span>
          <span className="stat-label">Code Runs</span>
        </div>
      </div>
    </div>
  );

  // Render the organizations tab content
  const renderOrganizationsTab = () => (
    <div className="organizations-tab">
      <h3>Your Organizations</h3>
      <div className="organizations-list">
        {organizations.map((org, index) => (
          <div className="organization-item" key={index}>
            <div className="organization-avatar">
              {(org.name && org.name.charAt(0)) ? org.name.charAt(0).toUpperCase() : 'O'}
            </div>
            <div className="organization-info">
              <h4>{org.name}</h4>
              <span className="organization-role">{org.role}</span>
            </div>
            <button className="view-org-button">View</button>
          </div>
        ))}
      </div>
      <button className="create-org-button">
        <span>+</span> Create New Organization
      </button>
    </div>
  );

  // Render the API keys tab content
  const renderApiKeysTab = () => (
    <div className="api-keys-tab">
      <div className="api-keys-header">
        <h3>API Keys</h3>
        <button onClick={generateApiKey} className="generate-key-button">
          Generate New Key
        </button>
      </div>
      
      <div className="api-keys-list">
        {apiKeys.length === 0 ? (
          <p className="no-keys-message">No API keys found. Generate one to get started.</p>
        ) : (
          apiKeys.map((key, index) => (
            <div className="api-key-item" key={index}>
              <div className="api-key-info">
                <h4>{key.name}</h4>
                <div className="api-key-value">{key.key}</div>
                <div className="api-key-dates">
                  <span>Created: {key.created}</span>
                  <span>Last used: {key.lastUsed}</span>
                </div>
              </div>
              <button 
                onClick={() => deleteApiKey(index)} 
                className="delete-key-button"
                aria-label="Delete API key"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
      
      <div className="api-key-info-box">
        <h4>Using API Keys</h4>
        <p>
          API keys allow you to access the platform's API programmatically. 
          Keep your keys secure and never share them publicly.
        </p>
        <pre className="api-example">
          # Example API usage
          curl -X POST https://api.example.com/v1/execute 
          -H "Authorization: Bearer YOUR_API_KEY" 
          -H "Content-Type: application/json" 
          -d @payload.json
        </pre>
      </div>
    </div>
  );

  // Render the preferences tab content
  const renderPreferencesTab = () => (
    <div className="preferences-tab">
      <h3>Editor Preferences</h3>
      
      <div className="preference-item">
        <label htmlFor="defaultLanguage">Default Language:</label>
        <select 
          id="defaultLanguage"
          value={preferences.defaultLanguage}
          onChange={(e) => handlePreferenceChange('defaultLanguage', e.target.value)}
        >
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="java">Java</option>
          <option value="csharp">C#</option>
          <option value="cpp">C++</option>
        </select>
      </div>
      
      <div className="preference-item">
        <label htmlFor="editorFontSize">Font Size:</label>
        <div className="range-with-value">
          <input 
            type="range" 
            id="editorFontSize"
            min="10" 
            max="24" 
            value={preferences.editorFontSize}
            onChange={(e) => handlePreferenceChange('editorFontSize', parseInt(e.target.value))}
          />
          <span className="range-value">{preferences.editorFontSize}px</span>
        </div>
      </div>
      
      <div className="preference-item">
        <label htmlFor="tabSize">Tab Size:</label>
        <div className="range-with-value">
          <input 
            type="range" 
            id="tabSize"
            min="1" 
            max="8" 
            value={preferences.tabSize}
            onChange={(e) => handlePreferenceChange('tabSize', parseInt(e.target.value))}
          />
          <span className="range-value">{preferences.tabSize} spaces</span>
        </div>
      </div>
      
      <div className="preference-item">
        <label htmlFor="autoSave">Auto Save:</label>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            id="autoSave"
            checked={preferences.autoSave}
            onChange={(e) => handlePreferenceChange('autoSave', e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>
      
      <div className="preference-item">
        <label htmlFor="lineNumbers">Line Numbers:</label>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            id="lineNumbers"
            checked={preferences.lineNumbers}
            onChange={(e) => handlePreferenceChange('lineNumbers', e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>
      
      <div className="preference-item">
        <label htmlFor="wordWrap">Word Wrap:</label>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            id="wordWrap"
            checked={preferences.wordWrap}
            onChange={(e) => handlePreferenceChange('wordWrap', e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>
      
      <h3>System Preferences</h3>
      
      <div className="preference-item">
        <label htmlFor="useLocalFallbacks">Enable Local Fallbacks:</label>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            id="useLocalFallbacks"
            checked={preferences.useLocalFallbacks}
            onChange={(e) => handlePreferenceChange('useLocalFallbacks', e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
        <p className="preference-description">
          When enabled, the system will use local fallbacks when API connectivity is disrupted
        </p>
      </div>
    </div>
  );

  // Handle keyboard accessibility
  useEffect(() => {
    if (!isOpen) return;
    
    // Focus the first button when opened
    const firstButton = panelRef.current?.querySelector('button');
    if (firstButton) {
      setTimeout(() => firstButton.focus(), 100);
    }
    
    // Handle escape key to close panel
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  // Force visibility when open with important styles to override any conflicting styles
  const panelStyle = {
    display: isOpen ? 'flex' : 'none',
    zIndex: 9999,
    visibility: isOpen ? 'visible' : 'hidden',
    opacity: isOpen ? 1 : 0,
    ...(!isOpen && { pointerEvents: 'none' }) // Prevent interaction when closed
  };
  
  // Log rendering with critical display properties
  useEffect(() => {
    console.log('UserProfilePanel visibility updated:', { 
      isOpen, 
      display: panelStyle.display,
      visibility: panelStyle.visibility,
      opacity: panelStyle.opacity
    });
  }, [isOpen]);

  return (
    <div 
      className={`user-profile-panel ${isOpen ? 'open' : ''}`}
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-panel-title"
      style={{ 
        ...panelStyle,
        display: isOpen ? 'block' : 'none', 
        zIndex: 8000,
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '400px',
        maxWidth: '90vw',
        backgroundColor: 'white',
        boxShadow: '-2px 0 10px rgba(0,0,0,0.2)',
        overflow: 'auto',
        transition: 'transform 0.3s ease-in-out',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        visibility: 'visible',
        opacity: 1
      }}>
      <div className="profile-panel-header" id="profile-panel-title" style={{
        backgroundColor: apiStatus?.status === 'online' ? '#4285f4' : '#f57c00',
        color: 'white',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>
          {username ? `${username}'s Settings` : 'User Settings'}
          {apiStatus?.status !== 'online' && (
            <span style={{ 
              fontSize: '12px', 
              backgroundColor: '#ff9800', 
              color: 'white',
              padding: '2px 6px',
              borderRadius: '10px',
              marginLeft: '8px',
              verticalAlign: 'middle'
            }}>
              Offline Mode
            </span>
          )}
        </h2>
        <button 
          onClick={onClose || (() => console.warn('No onClose handler provided'))} 
          className="close-button" 
          aria-label="Close"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '0 8px',
            lineHeight: '1'
          }}
        >×</button>
      </div>
      
      <div className="profile-tabs" style={{
        display: 'flex',
        backgroundColor: userPrefs.useDarkMode ? '#333' : '#f5f5f5',
        borderBottom: `1px solid ${userPrefs.useDarkMode ? '#555' : '#ddd'}`,
        position: 'sticky',
        top: '60px',
        zIndex: 9
      }}>
        {['profile', 'organizations', 'api-keys', 'preferences'].map((tab) => {
          const label = tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ');
          const isActive = activeTab === tab;
          return (
            <button 
              key={tab}
              className={isActive ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: isActive 
                  ? (userPrefs.useDarkMode ? '#444' : 'white') 
                  : 'transparent',
                color: userPrefs.useDarkMode 
                  ? (isActive ? '#fff' : '#ccc') 
                  : (isActive ? '#333' : '#666'),
                fontWeight: isActive ? 'bold' : 'normal',
                borderBottom: isActive 
                  ? `2px solid ${apiStatus?.status === 'online' ? '#4285f4' : '#f57c00'}` 
                  : 'none',
                cursor: 'pointer',
                flex: 1,
                textAlign: 'center',
                transition: 'all 0.2s ease',
                outline: 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
              aria-selected={isActive}
              role="tab"
            >
              {label}
            </button>
          );
        })}
      </div>
      
      <div className="profile-content" style={{
        padding: '20px',
        backgroundColor: userPrefs.useDarkMode ? '#222' : '#fff',
        color: userPrefs.useDarkMode ? '#eee' : '#333'
      }}>
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'organizations' && renderOrganizationsTab()}
        {activeTab === 'api-keys' && renderApiKeysTab()}
        {activeTab === 'preferences' && renderPreferencesTab()}
      </div>
      
      <div className="profile-panel-footer">
        <div className="api-status">
          <div className={`status-indicator ${apiStatus?.status || 'unknown'}`}></div>
          <div className="status-label">
            {apiStatus?.status === 'online' ? 'API Connected' : 
             apiStatus?.status === 'degraded' ? 'Limited Connectivity' : 
             'Offline - Using Fallbacks'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePanel;
