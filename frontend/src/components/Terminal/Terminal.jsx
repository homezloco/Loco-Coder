import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import './Terminal.css';

const Terminal = () => {
  const terminalRef = useRef(null);
  const terminal = useRef(null);
  const fitAddon = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    terminal.current = new XTerminal({
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      theme: {
        background: '#1e1e1e',
        foreground: '#f0f0f0',
        cursor: '#f0f0f0',
        selection: 'rgba(255, 255, 255, 0.3)',
      },
    });

    // Setup addons
    fitAddon.current = new FitAddon();
    terminal.current.loadAddon(fitAddon.current);
    terminal.current.loadAddon(new WebLinksAddon());

    // Open terminal in container
    terminal.current.open(terminalRef.current);
    fitAddon.current.fit();

    // Initial welcome message
    terminal.current.writeln('Welcome to CodeCraft AI Terminal\r\n');
    terminal.current.writeln('Connecting to terminal server...\r\n');

    // Handle window resize
    const handleResize = () => fitAddon.current && fitAddon.current.fit();
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (terminal.current) {
        terminal.current.dispose();
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    if (!terminal.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal`;
    
    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        terminal.current.writeln('Connected to terminal server\r\n');
        
        // Set up terminal to send data to socket
        terminal.current.onData(data => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'input', data }));
          }
        });

        // Handle terminal resize
        const sendResize = () => {
          if (socket.readyState === WebSocket.OPEN) {
            const { rows, cols } = terminal.current;
            socket.send(JSON.stringify({
              type: 'resize',
              data: { rows, cols }
            }));
          }
        };

        // Initial resize
        sendResize();
        terminal.current.onResize(sendResize);
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'output') {
          terminal.current.write(message.data);
        }
      };

      socket.onerror = (error) => {
        setError('Failed to connect to terminal server');
        console.error('WebSocket error:', error);
      };

      socket.onclose = () => {
        setIsConnected(false);
        terminal.current.writeln('\r\n\x1b[31mDisconnected from terminal server\x1b[0m\r\n');
      };

    } catch (err) {
      setError('Failed to initialize terminal connection');
      console.error('Terminal initialization error:', err);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Handle connection status
  useEffect(() => {
    if (!terminal.current) return;
    
    const statusMessage = isConnected 
      ? '\x1b[32mConnected\x1b[0m to terminal server\r\n' 
      : '\x1b[31mDisconnected\x1b[0m from terminal server\r\n';
    
    terminal.current.writeln(statusMessage);
  }, [isConnected]);

  return (
    <div className="terminal-container">
      <div ref={terminalRef} className="terminal" />
      {error && (
        <div className="terminal-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
    </div>
  );
};

export default Terminal;
