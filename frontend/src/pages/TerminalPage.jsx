import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { useAuth } from '../contexts/NewAuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useFeedback } from '../components/feedback/FeedbackContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import 'xterm/css/xterm.css';
import './TerminalPage.css';

const TerminalPage = () => {
  const { projectId } = useParams();
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const { showErrorToast, showSuccessToast } = useFeedback();
  const navigate = useNavigate();
  
  const terminalRef = useRef(null);
  const socketRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [terminalTitle, setTerminalTitle] = useState('Terminal');
  const [terminalDimensions, setTerminalDimensions] = useState({
    cols: 80,
    rows: 24
  });

  // Initialize terminal
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/terminal/${projectId || ''}` } });
      return;
    }

    // Create terminal instance
    const term = new XTerm({
      cursorBlink: true,
      fontSize: settings.terminalFontSize || 14,
      fontFamily: settings.terminalFont || '"Cascadia Code", "Courier New", monospace',
      theme: settings.isDarkMode ? {
        background: '#1e1e1e',
        foreground: '#f0f0f0',
        cursor: '#ffffff',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      } : {
        background: '#ffffff',
        foreground: '#000000',
        cursor: '#000000',
        selection: 'rgba(0, 0, 0, 0.2)',
        black: '#000000',
        red: '#cd3131',
        green: '#00aa00',
        yellow: '#949800',
        blue: '#0451a5',
        magenta: '#bc05bc',
        cyan: '#0598bc',
        white: '#555555',
        brightBlack: '#666666',
        brightRed: '#cd3131',
        brightGreen: '#14ce14',
        brightYellow: '#b5ba00',
        brightBlue: '#0451a5',
        brightMagenta: '#bc05bc',
        brightCyan: '#0598bc',
        brightWhite: '#a5a5a5'
      },
      allowProposedApi: true,
      allowTransparency: true,
      ...terminalDimensions
    });

    // Create addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    // Load addons
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Mount terminal to DOM
    const terminalElement = terminalRef.current;
    if (terminalElement) {
      term.open(terminalElement);
      
      try {
        fitAddon.fit();
        const { cols, rows } = term;
        setTerminalDimensions({ cols, rows });
      } catch (error) {
        console.error('Error fitting terminal:', error);
      }

      // Handle resize events
      const resizeObserver = new ResizeObserver(() => {
        try {
          fitAddon.fit();
          const { cols, rows } = term;
          setTerminalDimensions({ cols, rows });
          
          // Notify backend of resize
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              type: 'resize',
              cols,
              rows
            }));
          }
        } catch (error) {
          console.error('Error resizing terminal:', error);
        }
      });

      resizeObserver.observe(terminalElement);

      // Cleanup
      return () => {
        resizeObserver.disconnect();
        term.dispose();
        if (socketRef.current) {
          socketRef.current.close();
        }
      };
    }
  }, [isAuthenticated, navigate, projectId, settings, terminalDimensions]);

  // Connect to WebSocket
  useEffect(() => {
    if (!isAuthenticated) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const token = localStorage.getItem('token');
    const wsUrl = `${protocol}//${host}/api/terminal/connect?token=${encodeURIComponent(token)}${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ''}`;

    const connect = () => {
      setIsConnecting(true);
      setConnectionError(null);

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnecting(false);
        showSuccessToast('Terminal connected');
        
        // Send initial resize
        socket.send(JSON.stringify({
          type: 'resize',
          ...terminalDimensions
        }));
      };

      socket.onmessage = (event) => {
        const term = terminalRef.current?.terminal;
        if (term) {
          term.write(event.data);
        }
      };

      socket.onclose = (event) => {
        setIsConnecting(false);
        if (!event.wasClean) {
          setConnectionError('Connection closed unexpectedly. Reconnecting...');
          // Reconnect after a delay
          setTimeout(connect, 3000);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error. Check console for details.');
        showErrorToast('Terminal connection error');
      };
    };

    connect();

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, projectId, showErrorToast, showSuccessToast, terminalDimensions]);

  // Handle keyboard input
  useEffect(() => {
    const term = terminalRef.current?.terminal;
    if (!term) return;

    const onData = (data) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'input',
          data
        }));
      }
    };

    term.onData(onData);
    return () => {
      term.offData(onData);
    };
  }, []);

  // Handle paste event
  useEffect(() => {
    const handlePaste = (event) => {
      const term = terminalRef.current?.terminal;
      if (!term || !document.activeElement?.classList?.contains('xterm-helper-textarea')) {
        return;
      }

      event.preventDefault();
      const text = (event.clipboardData || window.clipboardData).getData('text');
      if (text) {
        term.paste(text);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  // Handle connection errors
  useEffect(() => {
    if (connectionError) {
      showErrorToast(connectionError);
    }
  }, [connectionError, showErrorToast]);

  return (
    <div className="terminal-page">
      <div className="terminal-header">
        <h2>{terminalTitle}</h2>
        <div className="terminal-controls">
          {isConnecting && <span className="connecting-indicator">Connecting...</span>}
          <button 
            className="reconnect-button"
            onClick={() => window.location.reload()}
            disabled={isConnecting}
          >
            Reconnect
          </button>
        </div>
      </div>
      
      <div className="terminal-container" ref={terminalRef}>
        {isConnecting && (
          <div className="terminal-loading">
            <LoadingSpinner size="medium" />
            <p>Connecting to terminal...</p>
          </div>
        )}
        {connectionError && (
          <div className="terminal-error">
            <p>{connectionError}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalPage;
