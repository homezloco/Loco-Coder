// /project-root/frontend/src/Editor.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import MonacoConfig from './MonacoConfig.jsx';
import logger from './utils/logger';
const log = logger.ns('ui:editor');

// Global flag to track if we're in a cleanup phase
let isInCleanupPhase = false;

export default function CodeEditor({ code, onChange, language = "python", onSave }) {
  const [editorInstance, setEditorInstance] = useState(null);
  const monacoRef = useRef(null);
  const disposablesRef = useRef([]);
  const isMountedRef = useRef(true);
  const cleanupInProgressRef = useRef(false);
  const cleanupPromiseRef = useRef(Promise.resolve());
  
  // Set up editor options
  const editorOptions = {
    fontSize: 14,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 4,
    insertSpaces: true,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    fontLigatures: true,
    wordWrap: 'on',
  };

  // Set up key bindings for save (Ctrl+S)
  useEffect(() => {
    if (!editorInstance || !monacoRef.current) return;
    
    try {
      const disposable = editorInstance.addCommand(
        monacoRef.current.KeyMod.CtrlCmd | monacoRef.current.KeyCode.KeyS,
        () => onSave?.()
      );
      
      if (disposable) {
        disposablesRef.current.push({
          dispose: () => {
            try {
              if (typeof disposable === 'function') {
                disposable();
              } else if (disposable && typeof disposable.dispose === 'function') {
                disposable.dispose();
              }
            } catch (e) {
              log.warn('Error disposing command:', e);
            }
          }
        });
      }
    } catch (e) {
      log.error('Error setting up save command:', e);
    }
    
    return () => {
      // Cleanup will be handled by the main cleanup effect
    };
  }, [editorInstance, onSave]);

  // Handle editor mount
  const handleEditorDidMount = useCallback((editor, monaco) => {
    if (!isMountedRef.current || isInCleanupPhase) {
      // Don't proceed if we're in the middle of cleanup
      return () => {};
    }
    
    monacoRef.current = monaco;
    setEditorInstance(editor);
    
    try {
      // Disable some features that might cause cleanup issues
      editor.updateOptions({
        ariaLabel: 'Code editor',
        // Disable word highlight to prevent cleanup issues
        occurrencesHighlight: false,
        selectionHighlight: false,
        renderLineHighlight: 'none',
        // Disable minimap to reduce resource usage
        minimap: { enabled: false }
      });
      
      // Focus the editor
      editor.focus();
    } catch (e) {
      log.warn('Error initializing editor:', e);
    }
    
    // No cleanup needed in the mount handler
    return () => {};
  }, []);

  // Handle editor before unmount
  const handleEditorWillUnmount = useCallback(() => {
    if (!isMountedRef.current || cleanupInProgressRef.current) {
      return Promise.resolve();
    }
    
    cleanupInProgressRef.current = true;
    isInCleanupPhase = true;
    
    // Create a new cleanup promise
    cleanupPromiseRef.current = new Promise((resolve) => {
      try {
        const currentEditor = editorInstance;
        if (!currentEditor) {
          isInCleanupPhase = false;
          cleanupInProgressRef.current = false;
          resolve();
          return;
        }
        
        // 1. First, try to dispose the editor in the next tick
        setTimeout(() => {
          try {
            // 2. Get model reference before disposing editor
            const model = currentEditor.getModel?.();
            
            // 3. Dispose the editor
            try {
              if (!currentEditor.isDisposed?.()) {
                currentEditor.dispose();
              }
            } catch (e) {
              log.warn('Error disposing editor:', e);
            }
            
            // 4. Dispose the model in a separate tick
            if (model && !model.isDisposed?.()) {
              setTimeout(() => {
                try {
                  model.dispose();
                } catch (e) {
                  log.warn('Error disposing model:', e);
                } finally {
                  // 5. Clean up any remaining disposables
                  const disposables = disposablesRef.current || [];
                  disposablesRef.current = [];
                  
                  for (let i = disposables.length - 1; i >= 0; i--) {
                    try {
                      const disposable = disposables[i];
                      if (typeof disposable?.dispose === 'function') {
                        disposable.dispose();
                      } else if (typeof disposable === 'function') {
                        disposable();
                      }
                    } catch (e) {
                      log.warn('Error cleaning up disposable:', e);
                    }
                  }
                  
                  isInCleanupPhase = false;
                  cleanupInProgressRef.current = false;
                  resolve();
                }
              }, 0);
            } else {
              isInCleanupPhase = false;
              cleanupInProgressRef.current = false;
              resolve();
            }
          } catch (e) {
            log.error('Error during cleanup:', e);
            isInCleanupPhase = false;
            cleanupInProgressRef.current = false;
            resolve();
          }
        }, 0);
      } catch (e) {
        log.error('Error in cleanup preparation:', e);
        isInCleanupPhase = false;
        cleanupInProgressRef.current = false;
        resolve();
      }
    });
    
    return cleanupPromiseRef.current;
  }, [editorInstance]);

  // Main cleanup effect
  useEffect(() => {
    isMountedRef.current = true;
    
    // Return cleanup function
    return () => {
      // Mark as unmounting
      isMountedRef.current = false;
      
      // Start cleanup process
      handleEditorWillUnmount().catch(e => {
        log.warn('Error during editor cleanup:', e);
      });
    };
  }, [handleEditorWillUnmount]);

  return (
    <div className="editor-container">
      <MonacoConfig />
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        value={code}
        onChange={onChange}
        options={{
          ...editorOptions,
          // Disable features that might cause cleanup issues
          occurrencesHighlight: false,
          selectionHighlight: false,
          renderLineHighlight: 'none',
          minimap: { enabled: false },
          // Disable semantic validation which can cause async operations
          'semanticHighlighting.enabled': false,
          // Disable other async operations
          links: false,
          contextmenu: false,
          // Disable automatic layout to prevent resize observers
          automaticLayout: false,
          // Disable word based suggestions
          wordBasedSuggestions: 'off',
          // Disable quick suggestions
          quickSuggestions: false
        }}
        onMount={handleEditorDidMount}
        beforeMount={() => {
          monacoRef.current = null;
          // Disable some features that might cause cleanup issues
          if (window.monaco) {
            window.monaco.editor.setTheme('vs-dark');
          }
        }}
        onValidate={() => {}} // No-op to prevent validation
        theme="vs-dark"
      />
    </div>
  );
}
