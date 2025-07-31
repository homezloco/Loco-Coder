import React, { useEffect } from 'react';
import * as monaco from 'monaco-editor';

// Worker loading is now handled by vite-plugin-monaco-editor

/**
 * Monaco Editor configuration component
 * This component configures Monaco editor with custom settings and theming
 */
const MonacoConfig = () => {
  useEffect(() => {
    // Check if Monaco is available
    if (!monaco || !monaco.editor) {
      console.warn('Monaco editor not available');
      return;
    }

    // Define supported languages
    const languages = ['go', 'rust', 'swift', 'kotlin', 'dart', 'csharp', 'python', 'javascript', 'typescript', 'html', 'css', 'json', 'xml', 'markdown', 'shell', 'dockerfile', 'gitignore', 'makefile', 'ruby', 'php', 'sql', 'yaml', 'toml', 'ini', 'cfg', 'prefs', 'properties', 'bat', 'cmd', 'ps1', 'lua', 'pl', 'pm', 't', 'pod'];
    
    // Register additional languages
    languages.forEach(langId => {
      if (!monaco.languages.getLanguages().some(lang => lang.id === langId)) {
        monaco.languages.register({ id: langId });
      }
    });

    // Register a custom theme with better syntax highlighting
    monaco.editor.defineTheme('coder-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'struct', foreground: '4EC9B0', fontStyle: 'bold' },
        { token: 'interface', foreground: '9CDCFE', fontStyle: 'bold' },
        { token: 'module', foreground: 'C586C0' },
        { token: 'trait', foreground: '4EC9B0', fontStyle: 'italic' },
        { token: 'class', foreground: '4EC9B0' },
        { token: 'annotation', foreground: 'DCDCAA' },
        { token: 'decorator', foreground: 'DCDCAA' },
        { token: 'widget', foreground: '9CDCFE' }
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
        'editor.lineHighlightBackground': '#2D2D30',
        'editor.selectionBackground': '#264F78',
        'editorCursor.foreground': '#AEAFAD',
        'editorWhitespace.foreground': '#3B3B3B',
        'editorLineNumber.foreground': '#858585',
      }
    });

    // Additional language-specific configurations can be added here

    return () => {
      // Cleanup if needed
    };
  }, []);

  return null;
};

export default MonacoConfig;
