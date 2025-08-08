import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useProject } from '../contexts/NewProjectContext';
import { useApi } from '../contexts/NewApiContext';
import { useAuthContext } from '../hooks/useAuthContext';
import { FiSend, FiEdit2, FiSave, FiRefreshCw } from 'react-icons/fi';

const WritePage = () => {
  const { projectId } = useParams();
  const { isDarkMode } = useTheme();
  const { currentProject } = useProject();
  const { aiService, updateProject, getProject } = useApi();
  const { isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const editorRef = useRef(null);
  const [showCreatedBanner, setShowCreatedBanner] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isSavingPending, setIsSavingPending] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success', duration = 2000) => {
    setToast({ visible: true, message, type });
    window.clearTimeout((showToast)._t);
    (showToast)._t = window.setTimeout(() => setToast(t => ({ ...t, visible: false })), duration);
  };

  // Show a success banner when arriving right after creation
  useEffect(() => {
    try {
      const createdId = sessionStorage.getItem('project_created');
      if (createdId && createdId === projectId) {
        setShowCreatedBanner(true);
        sessionStorage.removeItem('project_created');
      }
    } catch (_) {}
  }, [projectId]);

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setIsSavingPending(true);
    // Clear error when user types
    if (error) setError(null);
  };

  // Initialize editor content from currentProject if available
  useEffect(() => {
    try {
      if (currentProject && typeof currentProject === 'object') {
        if (typeof currentProject.content === 'string') {
          setContent(currentProject.content);
        } else {
          // Try to read from localStorage in case context didn't hydrate content
          const raw = localStorage.getItem(`p_${projectId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.content === 'string') {
              setContent(parsed.content);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[WritePage] Failed to hydrate content', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, currentProject?.id]);

  // Debounced autosave whenever content changes (local-first)
  useEffect(() => {
    if (!projectId) return;
    const handler = window.setTimeout(() => {
      void (async () => {
        try {
          // Persist into localStorage (fallback-friendly)
          const key = `p_${projectId}`;
          const raw = localStorage.getItem(key);
          const now = new Date().toISOString();
          let projectObj = {};
          if (raw) {
            try { projectObj = JSON.parse(raw) || {}; } catch { projectObj = {}; }
          }
          projectObj = { ...projectObj, id: projectId, content, updatedAt: now };
          localStorage.setItem(key, JSON.stringify(projectObj));

          // Update projects_index lastAccessed/updatedAt
          try {
            const idxRaw = localStorage.getItem('projects_index');
            const idx = Array.isArray(JSON.parse(idxRaw || '[]')) ? JSON.parse(idxRaw || '[]') : [];
            const updatedIdx = idx.map(p => p.id === projectId ? { ...p, lastAccessed: now, updatedAt: now } : p);
            localStorage.setItem('projects_index', JSON.stringify(updatedIdx));
          } catch (e) {
            console.warn('[WritePage] Failed updating projects_index', e);
          }

          setLastSavedAt(now);
          setIsSavingPending(false);
          showToast('Saved', 'success', 900);

          // Background sync to server when authenticated and online
          if (isAuthenticated && navigator.onLine && typeof updateProject === 'function') {
            setIsSyncing(true);
            const maxAttempts = 3;
            const baseDelay = 800;
            const sleep = (ms) => new Promise(res => setTimeout(res, ms));
            let attempt = 0;
            while (attempt < maxAttempts) {
              try {
                // Basic conflict detection: compare server updatedAt before update
                if (typeof getProject === 'function') {
                  try {
                    const serverProj = await getProject(projectId);
                    if (serverProj?.updatedAt && new Date(serverProj.updatedAt) > new Date(now)) {
                      // Server is newer, avoid overwrite
                      showToast('Sync conflict detected. Keeping local changes only.', 'error', 2500);
                      break;
                    }
                  } catch (_) {
                    // Ignore fetch error and attempt optimistic update
                  }
                }
                await updateProject(projectId, { content, updatedAt: now });
                showToast('Synced', 'success', 900);
                break; // success
              } catch (e) {
                // Retry on network/5xx errors; abort on 4xx
                const message = (e && e.message) || '';
                if (/4\d\d/.test(message)) {
                  // Likely unauthorized or bad request; stop retrying
                  console.warn('[WritePage] Sync aborted (client error):', e);
                  break;
                }
                attempt += 1;
                if (attempt < maxAttempts) {
                  await sleep(baseDelay * Math.pow(2, attempt - 1));
                } else {
                  showToast('Sync failed. Will retry later.', 'error', 2000);
                }
              } finally {
                if (attempt >= maxAttempts) {
                  setIsSyncing(false);
                }
              }
            }
            setIsSyncing(false);
          }
        } catch (e) {
          console.error('[WritePage] Autosave failed', e);
          showToast('Failed to save locally', 'error', 2000);
        }
      })();
    }, 800); // debounce
    return () => window.clearTimeout(handler);
  }, [content, projectId, isAuthenticated, updateProject, getProject]);

  const generateSuggestions = useCallback(async () => {
    if (!content.trim()) {
      setError('Please enter some text first');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiService.chat(
        `Please provide 3 suggestions to improve or continue this text:\n\n${content}`,
        {
          temperature: 0.7,
          max_tokens: 150,
        }
      );

      if (response.choices && response.choices.length > 0) {
        const suggestionsText = response.choices[0].message.content;
        // Split suggestions by newlines and filter out empty lines
        const suggestionsList = suggestionsText
          .split('\n')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        setSuggestions(suggestionsList);
      }
    } catch (err) {
      console.error('Error generating suggestions:', err);
      setError('Failed to generate suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [content, aiService]);

  const applySuggestion = (suggestion) => {
    setContent(prev => prev + ' ' + suggestion);
    setSuggestions([]);
  };

  const saveContent = async () => {
    if (!content.trim()) {
      setError('Cannot save empty content');
      return;
    }
    try {
      const key = `p_${projectId}`;
      const raw = localStorage.getItem(key);
      const now = new Date().toISOString();
      let projectObj = {};
      if (raw) {
        try { projectObj = JSON.parse(raw) || {}; } catch { projectObj = {}; }
      }
      projectObj = { ...projectObj, id: projectId, content, updatedAt: now };
      localStorage.setItem(key, JSON.stringify(projectObj));
      try {
        const idxRaw = localStorage.getItem('projects_index');
        const idx = Array.isArray(JSON.parse(idxRaw || '[]')) ? JSON.parse(idxRaw || '[]') : [];
        const updatedIdx = idx.map(p => p.id === projectId ? { ...p, lastAccessed: now, updatedAt: now } : p);
        localStorage.setItem('projects_index', JSON.stringify(updatedIdx));
      } catch (e) {
        console.warn('[WritePage] Failed updating projects_index on manual save', e);
      }
      setLastSavedAt(now);
      showToast('Saved', 'success', 1200);
    } catch (e) {
      console.error('[WritePage] Manual save failed', e);
      showToast('Failed to save locally', 'error', 2000);
    }
  };

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        {showCreatedBanner && (
          <div className="mb-3 p-3 rounded-lg bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200 border border-green-200 dark:border-green-800 flex items-center justify-between">
            <span>Project created successfully.</span>
            <button
              className="text-sm underline hover:no-underline"
              onClick={() => setShowCreatedBanner(false)}
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            {currentProject?.name || 'Untitled Document'}
          </h1>
          <div className="text-xs text-gray-500 dark:text-gray-400 ml-4 min-w-[120px] text-right">
            {isSavingPending
              ? 'Saving…'
              : isSyncing
                ? 'Syncing…'
                : lastSavedAt
                  ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                  : 'No changes yet'}
          </div>
        </div>
        {(!isAuthenticated || !navigator.onLine) && (
          <div className="mt-2 p-3 rounded-lg bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800 flex items-center justify-between">
            <div className="text-sm">
              {!isAuthenticated && (
                <span>This is a local project (not signed in). </span>
              )}
              {!navigator.onLine && (
                <span>Offline mode. Changes are saved locally.</span>
              )}
            </div>
            {!isAuthenticated && (
              <button
                onClick={() => navigate('/login', { state: { from: location.pathname } })}
                className="ml-3 px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Sign in to sync
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleContentChange}
              className={`w-full h-64 p-4 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-800'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder="Start writing here..."
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="flex space-x-3 mb-6">
            <button
              onClick={generateSuggestions}
              disabled={isLoading}
              className={`flex items-center px-4 py-2 rounded-lg ${
                isLoading
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } transition-colors`}
            >
              {isLoading ? (
                <>
                  <FiRefreshCw className="animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <FiEdit2 className="mr-2" />
                  Get Suggestions
                </>
              )}
            </button>
            
            <button
              onClick={saveContent}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <FiSave className="mr-2" />
              Save
            </button>
          </div>
          
          {suggestions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">AI Suggestions</h3>
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' 
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                    onClick={() => applySuggestion(suggestion)}
                  >
                    <div className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{suggestion}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {toast.visible && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-sm ${
          toast.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default WritePage;
