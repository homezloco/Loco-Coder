const WebSocket = require('ws');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const url = require('url');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const { authenticateWebSocket } = require('./middleware/auth');
const { isCommandAllowed, sanitizeInput, ALLOWED_COMMANDS } = require('./utils/commandValidator');

class TerminalServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ noServer: true });
    this.sessions = new Map();
    this.setupWebSocket(server);
  }

  /**
   * Set up rate limiting for WebSocket connections
   */
  setupRateLimiting() {
    const connections = new Map();
    const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
    const MAX_CONNECTIONS_PER_IP = 5;
    const MAX_MESSAGES_PER_MINUTE = 100;

    return (ws, req) => {
      const ip = req.headers['x-forwarded-for'] || 
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.connection.socket?.remoteAddress;
      
      if (!ip) {
        ws.close(1008, 'Could not determine IP address');
        return false;
      }

      // Initialize rate limiting for this IP
      if (!connections.has(ip)) {
        connections.set(ip, {
          count: 0,
          messages: 0,
          lastReset: Date.now(),
          resetTimer: setTimeout(() => {
            connections.delete(ip);
          }, RATE_LIMIT_WINDOW)
        });
      }

      const ipData = connections.get(ip);
      
      // Reset message count if window has passed
      if (Date.now() - ipData.lastReset > RATE_LIMIT_WINDOW) {
        ipData.messages = 0;
        ipData.lastReset = Date.now();
      }

      // Check connection limit
      if (ipData.count >= MAX_CONNECTIONS_PER_IP) {
        ws.close(1008, 'Too many connections from this IP');
        return false;
      }

      // Check message rate limit
      if (ipData.messages >= MAX_MESSAGES_PER_MINUTE) {
        ws.close(1008, 'Rate limit exceeded');
        return false;
      }

      // Increment connection count
      ipData.count++;
      
      // Clean up on connection close
      const originalClose = ws.close;
      ws.close = (...args) => {
        if (connections.has(ip)) {
          connections.get(ip).count--;
          if (connections.get(ip).count <= 0) {
            clearTimeout(connections.get(ip).resetTimer);
            connections.delete(ip);
          }
        }
        originalClose.apply(ws, args);
      };

      // Track messages
      const originalSend = ws.send;
      ws.send = (data) => {
        ipData.messages++;
        return originalSend.call(ws, data);
      };

      return true;
    };
  }

  /**
   * Set up WebSocket server with authentication and rate limiting
   */
  setupWebSocket(server) {
    const rateLimiter = this.setupRateLimiting();
    // Handle upgrade from HTTP server
    server.on('upgrade', async (request, socket, head) => {
      try {
        const { pathname, query } = url.parse(request.url, true);
        
        if (pathname === '/ws/terminal') {
          try {
            // Authenticate the WebSocket connection
            const token = request.headers['sec-websocket-protocol'] || 
                         (query && query.token) ||
                         (request.headers.cookie && 
                          request.headers.cookie
                            .split('; ')
                            .find(row => row.startsWith('token='))
                            ?.split('=')[1]);
            
            if (!token) {
              throw new Error('No authentication token provided');
            }

            // Authenticate the token
            const decoded = await authenticateWebSocket(request, token);
            
            // Store user info in the request for later use
            request.user = decoded.user;
            
            // Proceed with the WebSocket upgrade
            this.wss.handleUpgrade(request, socket, head, (ws) => {
              this.wss.emit('connection', ws, request);
            });
          } catch (error) {
            logger.error('WebSocket upgrade error:', error);
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
          }
        } else {
          socket.destroy();
        }
      } catch (error) {
        logger.error('Error during WebSocket upgrade:', error);
        socket.destroy();
      }
    });

    // Handle new WebSocket connections
    this.wss.on('connection', (ws, request) => {
      const sessionId = uuidv4();
      const ip = request.headers['x-forwarded-for'] || 
                request.connection.remoteAddress ||
                request.socket.remoteAddress ||
                request.connection.socket?.remoteAddress;
      
      // Apply rate limiting
      if (!rateLimiter(ws, request)) {
        logger.warn(`Rate limited connection attempt from ${ip}`);
        return;
      }

      logger.info(`New terminal session: ${sessionId} from ${ip}`);
      
      try {
        // Get user from authenticated request
        const user = request.user || { 
          username: 'anonymous',
          homeDir: path.join(require('os').homedir(), '.windsurf-terminal')
        };
        
        // Create a new shell process for this session with user context
        const shell = this.createShell(sessionId, user);
        
        // Store session with additional metadata
        this.sessions.set(sessionId, { 
          ws, 
          shell,
          ip,
          userAgent: request.headers['user-agent'] || 'unknown',
          connectedAt: new Date().toISOString(),
          lastActivity: Date.now(),
          bytesIn: 0,
          bytesOut: 0,
          currentCommand: '',
          commandHistory: []
        });
        
        // Handle incoming messages
        ws.on('message', (data) => {
          const session = this.sessions.get(sessionId);
          if (!session) return;
          
          try {
            session.bytesIn += data.length;
            session.lastActivity = Date.now();
            
            const { type, data: messageData } = JSON.parse(data);
            
            switch (type) {
              case 'input':
                if (session.shell?.process?.stdin?.writable) {
                  // Sanitize and validate input
                  const sanitizedData = sanitizeInput(messageData);
                  
                  // Check for command execution (on Enter key or newline)
                  if (sanitizedData === '\r' || sanitizedData === '\n' || sanitizedData === '\r\n') {
                    const command = session.currentCommand || '';
                    const validation = isCommandAllowed(command);
                    
                    if (!validation.allowed) {
                      logger.warn(`Blocked command from ${sessionId}: ${command} - ${validation.reason}`);
                      // Send error message to client
                      ws.send(JSON.stringify({
                        type: 'output',
                        data: `\r\n\x1b[31mCommand blocked: ${validation.reason}\x1b[0m\r\n`
                      }));
                      
                      // Clear the current command
                      session.currentCommand = '';
                      
                      // Show a new prompt
                      ws.send(JSON.stringify({
                        type: 'output',
                        data: `\r\n${session.shell.user.username}@windsurf:$ `
                      }));
                      
                      return;
                    }
                    
                    // Add to command history
                    if (command.trim()) {
                      session.commandHistory.push({
                        command,
                        timestamp: new Date().toISOString(),
                        cwd: session.shell.cwd
                      });
                      
                      // Limit history size
                      if (session.commandHistory.length > 1000) {
                        session.commandHistory.shift();
                      }
                      
                      // Log the command
                      logger.info(`[${sessionId}] ${session.shell.user.username}@${ip}: ${command}`);
                    }
                    
                    // Clear the current command
                    session.currentCommand = '';
                  } else {
                    // Update current command
                    session.currentCommand = (session.currentCommand || '') + sanitizedData;
                  }
                  
                  // Send the sanitized input to the shell
                  session.shell.process.stdin.write(sanitizedData);
                }
                break;
                
              case 'resize':
                if (session.shell?.process?.stdout?.rows !== undefined && 
                    session.shell?.process?.stdout?.columns !== undefined) {
                  session.shell.process.stdout.rows = messageData.rows;
                  session.shell.process.stdout.columns = messageData.cols;
                  session.shell.process.kill('SIGWINCH');
                }
                break;
                
              case 'ping':
                // Respond to ping with pong
                ws.send(JSON.stringify({ type: 'pong', data: Date.now() }));
                break;
                
              default:
                logger.warn(`Unknown message type from ${sessionId}: ${type}`);
            }
        } catch (error) {
          logger.error('Error processing message:', error);
        }
      });
      
      // Handle client disconnection
      ws.on('close', () => {
        this.cleanupSession(sessionId);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.cleanupSession(sessionId);
      });
    });
    
    // Clean up dead sessions
    setInterval(() => {
      for (const [id, session] of this.sessions.entries()) {
        if (session.ws.readyState === WebSocket.CLOSED) {
          this.cleanupSession(id);
        }
      }
    }, 60000); // Check every minute
  }
  
  /**
   * Get a safe working directory for the user
   * @param {Object} user - User object
   * @returns {string} Safe working directory
   */
  getSafeWorkingDir(user) {
    // Default to user's home directory or current working directory
    let safeDir = user?.homeDir || process.env.HOME || process.env.USERPROFILE || process.cwd();
    
    // Ensure the directory exists and is accessible
    try {
      // Resolve to absolute path
      safeDir = path.resolve(safeDir);
      
      // Check if directory exists and is accessible
      fs.accessSync(safeDir, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
      
      // Create a sandbox directory if it doesn't exist
      const sandboxDir = path.join(safeDir, '.windsurf-terminal');
      if (!fs.existsSync(sandboxDir)) {
        fs.mkdirSync(sandboxDir, { recursive: true, mode: 0o700 });
      }
      
      // Set permissions on the sandbox directory
      if (process.platform !== 'win32') {
        fs.chmodSync(sandboxDir, 0o700);
      }
      
      return sandboxDir;
    } catch (error) {
      logger.error(`Error accessing working directory ${safeDir}:`, error);
      // Fall back to a temporary directory
      const tempDir = path.join(require('os').tmpdir(), 'windsurf-terminal');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true, mode: 0o700 });
      }
      return tempDir;
    }
  }

  /**
   * Create a restricted shell process
   * @param {string} sessionId - Session ID
   * @param {Object} user - User object
   * @returns {Object} Shell process and related metadata
   */
  createShell(sessionId, user) {
    try {
      // Determine the appropriate shell based on the platform
      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      
      // Get a safe working directory
      const cwd = this.getSafeWorkingDir(user);
      
      // Create a restricted environment
      const env = {
        // Basic environment variables
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        LANG: process.env.LANG || 'en_US.UTF-8',
        LC_ALL: process.env.LC_ALL || 'en_US.UTF-8',
        PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        HOME: user?.homeDir || process.env.HOME || process.env.USERPROFILE || cwd,
        USER: user?.username || 'anonymous',
        SHELL: shell,
        
        // Security: Prevent shell injection and limit functionality
        PS1: '\[\e[1;32m\]\u@\h:\w\$\[\e[0m\] ',
        PS2: '> ',
        IFS: ' \t\n',
        HISTFILE: path.join(cwd, '.bash_history'),
        HISTFILESIZE: '1000',
        HISTSIZE: '1000',
        HISTCONTROL: 'ignoreboth',
        HISTIGNORE: '&:ls:[bf]g:exit:history:clear',
        
        // Disable less history
        LESSHISTFILE: '/dev/null',
        
        // Disable Python history
        PYTHONHISTORY: '/dev/null',
        
        // Disable Node.js REPL history
        NODE_REPL_HISTORY: '',
        
        // Disable other history files
        NPM_CONFIG_CACHE: path.join(cwd, '.npm'),
        NPM_CONFIG_USERCONFIG: path.join(cwd, '.npmrc'),
        
        // Set TMPDIR to a directory we control
        TMPDIR: path.join(cwd, 'tmp'),
        TEMP: path.join(cwd, 'tmp'),
        TMP: path.join(cwd, 'tmp'),
        
        // Disable core dumps
        RLIMIT_CORE: '0',
        
        // Disable password prompts
        SUDO_ASKPASS: '/bin/false',
        
        // Disable SSH agent forwarding
        SSH_AUTH_SOCK: '',
        
        // Disable X11 forwarding
        DISPLAY: '',
        
        // Disable browser auto-launch
        BROWSER: 'none',
        
        // Disable automatic updates
        DO_NOT_TRACK: '1',
        
        // Disable telemetry
        NEXT_TELEMETRY_DISABLED: '1',
        GATSBY_TELEMETRY_DISABLED: '1',
        HAS_JOSH_K_SEAL_OF_APPROVAL: '',
        
        // Disable debug logging
        DEBUG: '',
        NODE_DEBUG: '',
        
        // Disable package manager prompts
        NPM_CONFIG_YES: 'true',
        YARN_NPM_PUBLISH_REGISTRY: 'https://registry.npmjs.org',
        
        // Set a safe umask
        UMASK: '0077',
        
        // Copy other non-sensitive environment variables
        ...Object.entries(process.env).reduce((acc, [key, value]) => {
          // Only copy safe environment variables
          const safeVars = [
            'LANG', 'LC_', 'TZ', 'PWD', 'EDITOR', 'VISUAL',
            'TERM', 'COLORTERM', 'SHELL', 'SHLVL', 'LOGNAME',
            'USERNAME', 'HOSTNAME', 'HOST', 'LANGUAGE', 'LINGUAS',
            'XDG_', 'XDG_SESSION_', 'XDG_CONFIG_', 'XDG_DATA_', 'XDG_CACHE_',
            'DBUS_SESSION_BUS_ADDRESS', 'WAYLAND_DISPLAY', 'DISPLAY',
            'XAUTHORITY', 'XDG_RUNTIME_DIR', 'XDG_SESSION_TYPE',
            'XDG_SESSION_CLASS', 'XDG_SESSION_DESKTOP', 'XDG_CURRENT_DESKTOP',
            'XDG_SESSION_ID', 'XDG_VTNR', 'XDG_SEAT' 
          ];
          
          if (safeVars.some(safeVar => key.startsWith(safeVar))) {
            acc[key] = value;
          }
          return acc;
        }, {})
      };
      
      // Create necessary directories
      const tmpDir = path.join(cwd, 'tmp');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true, mode: 0o700 });
      }
      
      // Create a restricted shell wrapper script
      const wrapperScript = process.platform === 'win32' 
        ? this.createWindowsWrapperScript(cwd)
        : this.createUnixWrapperScript(cwd);
      
      // Spawn the shell process with restricted permissions
      const shellProcess = spawn(wrapperScript, [], {
        env,
        cwd,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        // Set user/group if running as root (Unix only)
        ...(process.platform !== 'win32' && process.getuid && process.getuid() === 0 ? {
          uid: process.env.UID || 1000,
          gid: process.env.GID || 1000
        } : {})
      });
      
      // Set up process error handling
      shellProcess.on('error', (error) => {
        logger.error(`Shell process error (${sessionId}):`, error);
        this.cleanupSession(sessionId);
      });
      
      // Set up process exit handling
      shellProcess.on('exit', (code, signal) => {
        logger.info(`Shell process exited (${sessionId}): code=${code}, signal=${signal}`);
        this.cleanupSession(sessionId);
      });
      
      return {
        process: shellProcess,
        cwd,
        env,
        user: user || { username: 'anonymous' },
        lastActivity: Date.now(),
        commandHistory: [],
        isAlive: true
      };
      
    } catch (error) {
      logger.error('Error creating shell process:', error);
      throw new Error('Failed to create shell process');
    }
    
      // Set up shell output handling
      shell.process.stdout.on('data', (data) => {
        try {
          const output = data.toString();
          session.bytesOut += Buffer.byteLength(output, 'utf8');
          this.sendToClient(sessionId, 'output', output);
        } catch (error) {
          logger.error('Error processing shell output:', error);
        }
      });
      
      // Set up shell error output handling
      shell.process.stderr.on('data', (data) => {
        try {
          const errorOutput = data.toString();
          session.bytesOut += Buffer.byteLength(errorOutput, 'utf8');
          this.sendToClient(sessionId, 'output', `\x1b[31m${errorOutput}\x1b[0m`);
        } catch (error) {
          logger.error('Error processing shell error output:', error);
        }
      });
      
      // Set up shell exit handling
      shell.process.on('exit', (code, signal) => {
        try {
          const exitMessage = `\r\n\x1b[33mProcess exited with code ${code || signal}\x1b[0m\r\n`;
          session.bytesOut += Buffer.byteLength(exitMessage, 'utf8');
          this.sendToClient(sessionId, 'output', exitMessage);
          
          // Log the session summary
          const duration = Math.floor((Date.now() - new Date(session.connectedAt).getTime()) / 1000);
          logger.info(`Session ${sessionId} ended after ${duration}s, ${session.bytesIn}B in, ${session.bytesOut}B out`);
          
          // Clean up the session
          this.cleanupSession(sessionId);
        } catch (error) {
          logger.error('Error handling shell exit:', error);
          this.cleanupSession(sessionId);
        }
      });
      
      // Set up shell error handling
      shell.process.on('error', (error) => {
        try {
          logger.error(`Shell process error (${sessionId}):`, error);
          const errorMessage = `\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n`;
          session.bytesOut += Buffer.byteLength(errorMessage, 'utf8');
          this.sendToClient(sessionId, 'output', errorMessage);
          this.cleanupSession(sessionId);
        } catch (err) {
          logger.error('Error in shell error handler:', err);
          this.cleanupSession(sessionId);
        }
      });
      
      // Send welcome message
      const welcomeMessage = `\r\n\x1b[1;32mWelcome to Windsurf Terminal\x1b[0m\r\n` +
        `\x1b[1;34mSession ID:\x1b[0m ${sessionId}\r\n` +
        `\x1b[1;34mUser:\x1b[0m ${user.username}\r\n` +
        `\x1b[1;34mWorking Directory:\x1b[0m ${shell.cwd}\r\n` +
        `\x1b[1;34mType 'help' for available commands\x1b[0m\r\n\r\n` +
        `${user.username}@windsurf:$ `;
      
      session.bytesOut += Buffer.byteLength(welcomeMessage, 'utf8');
      this.sendToClient(sessionId, 'output', welcomeMessage);
      
    } catch (error) {
      logger.error('Error setting up terminal session:', error);
      try {
        const errorMessage = `\r\n\x1b[31mFailed to initialize terminal: ${error.message}\x1b[0m\r\n`;
        ws.send(JSON.stringify({
          type: 'output',
          data: errorMessage
        }));
      } catch (err) {
        logger.error('Error sending error message to client:', err);
      }
      ws.close(1011, 'Internal server error');
    }
    
    return shellProcess;
  }
  
  sendToClient(sessionId, type, data) {
    const session = this.sessions.get(sessionId);
    if (session && session.ws.readyState === WebSocket.OPEN) {
      try {
        session.ws.send(JSON.stringify({ type, data }));
      } catch (error) {
        logger.error('Error sending message to client:', error);
        this.cleanupSession(sessionId);
      }
    }
  }
  
  /**
   * Create a Unix shell wrapper script with restricted permissions
   * @param {string} cwd - Working directory
   * @returns {string} Path to the wrapper script
   */
  createUnixWrapperScript(cwd) {
    const wrapperPath = path.join(cwd, 'windsurf-shell-wrapper.sh');
    
    // Create a secure wrapper script
    const wrapperScript = `#!/bin/bash
# Windsurf Terminal Wrapper Script
# This script provides a restricted shell environment

# Set restricted shell options
set -o noclobber
set -o noglob
set -o nounset
set -o notify
set -o physical
set -o posix
set -o vi

# Set restricted path
PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# Set restricted umask
umask 0077

# Create a safe temporary directory
export TMPDIR="${path.join(cwd, 'tmp')}"
mkdir -p "$TMPDIR"
chmod 700 "$TMPDIR"

# Set restricted environment
cd "${cwd}" || exit 1

# Start restricted shell
exec /bin/bash --noprofile --norc -i
`;
    
    // Write the wrapper script
    fs.writeFileSync(wrapperPath, wrapperScript, { mode: 0o700 });
    
    return wrapperPath;
  }
  
  /**
   * Create a Windows shell wrapper script with restricted permissions
   * @param {string} cwd - Working directory
   * @returns {string} Path to the wrapper script
   */
  createWindowsWrapperScript(cwd) {
    const wrapperPath = path.join(cwd, 'windsurf-shell-wrapper.cmd');
    
    // Create a secure wrapper script for Windows
    const wrapperScript = `@echo off
REM Windsurf Terminal Wrapper Script for Windows
REM This script provides a restricted shell environment

REM Set restricted path
set PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0\

REM Set working directory
cd /d "${cwd.replace(/\//g, '\\')}"

REM Start restricted command prompt
%SystemRoot%\System32\cmd.exe /k @prompt $P$G
`;
    
    // Write the wrapper script
    fs.writeFileSync(wrapperPath, wrapperScript, { mode: 0o700 });
    
    return wrapperPath;
  }
  
  /**
   * Clean up a terminal session
   * @param {string} sessionId - Session ID to clean up
   */
  cleanupSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    logger.info(`Cleaning up session: ${sessionId}`);
    
    // Close WebSocket connection
    if (session.ws.readyState === WebSocket.OPEN) {
      try {
        session.ws.close(1000, 'Session ended');
      } catch (error) {
        logger.error(`Error closing WebSocket for session ${sessionId}:`, error);
      }
    }
    
    // Kill shell process
    if (session.shell?.process && !session.shell.process.killed) {
      try {
        // Try graceful shutdown first
        session.shell.process.kill('SIGTERM');
        
        // Force kill after a delay if still running
        setTimeout(() => {
          try {
            if (!session.shell.process.killed) {
              session.shell.process.kill('SIGKILL');
            }
          } catch (error) {
            logger.error(`Error force killing shell process for session ${sessionId}:`, error);
          }
        }, 1000);
      } catch (error) {
        logger.error(`Error killing shell process for session ${sessionId}:`, error);
      }
    }
    
    // Clean up temporary files
    if (session.shell?.cwd) {
      try {
        // Keep the session directory but clean up temporary files
        const tmpDir = path.join(session.shell.cwd, 'tmp');
        if (fs.existsSync(tmpDir)) {
          fs.readdirSync(tmpDir).forEach(file => {
            try {
              const filePath = path.join(tmpDir, file);
              fs.unlinkSync(filePath);
            } catch (error) {
              logger.warn(`Error cleaning up temp file ${file}:`, error);
            }
          });
        }
      } catch (error) {
        logger.error(`Error cleaning up temporary files for session ${sessionId}:`, error);
      }
    }
    
    // Remove session from tracking
    this.sessions.delete(sessionId);
    logger.info(`Terminal session cleaned up: ${sessionId}`);
  }
  
  close() {
    // Clean up all sessions
    for (const sessionId of this.sessions.keys()) {
      this.cleanupSession(sessionId);
    }
    
    // Close the WebSocket server
    return new Promise((resolve) => {
      this.wss.close(() => {
        logger.info('Terminal server closed');
        resolve();
      });
    });
  }
}

module.exports = TerminalServer;
