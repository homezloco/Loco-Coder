const logger = require('./logger');

// Define allowed commands and their maximum arguments
const ALLOWED_COMMANDS = {
  // File operations
  'ls': { maxArgs: 5, flags: ['-l', '-a', '-h', '--help'] },
  'cat': { maxArgs: 1, flags: ['-n', '-b', '-s', '--help'] },
  'cd': { maxArgs: 1, flags: [] },
  'pwd': { maxArgs: 0, flags: [] },
  'mkdir': { maxArgs: 5, flags: ['-p', '-v', '--help'] },
  'rm': { 
    maxArgs: 5, 
    flags: ['-r', '-f', '-i', '-v', '--help'],
    dangerous: true 
  },
  'cp': { 
    maxArgs: 5, 
    flags: ['-r', '-i', '-v', '--help'],
    dangerous: true 
  },
  'mv': { 
    maxArgs: 5, 
    flags: ['-i', '-v', '--help'],
    dangerous: true 
  },
  
  // Process management
  'ps': { maxArgs: 5, flags: ['-e', '-f', '--help'] },
  'top': { maxArgs: 0, flags: [] },
  'htop': { maxArgs: 0, flags: [] },
  'kill': { 
    maxArgs: 2, 
    flags: ['-9', '-15', '--help'],
    dangerous: true 
  },
  
  // System info
  'uname': { maxArgs: 1, flags: ['-a', '-s', '-n', '--help'] },
  'whoami': { maxArgs: 0, flags: [] },
  'date': { maxArgs: 1, flags: ['-u', '--help'] },
  'df': { maxArgs: 1, flags: ['-h', '--help'] },
  'du': { maxArgs: 2, flags: ['-h', '-s', '--help'] },
  'free': { maxArgs: 1, flags: ['-h', '--help'] },
  
  // Network
  'ping': { maxArgs: 2, flags: ['-c', '-i', '-W', '--help'] },
  'traceroute': { maxArgs: 2, flags: ['-n', '-w', '--help'] },
  'curl': { 
    maxArgs: 10, 
    flags: ['-X', '-H', '-d', '-o', '--help'],
    dangerous: true 
  },
  'wget': { 
    maxArgs: 10, 
    flags: ['-O', '-q', '--help'],
    dangerous: true 
  },
  
  // Version control
  'git': { 
    maxArgs: 10, 
    flags: ['clone', 'pull', 'push', 'status', 'log', '--help'],
    subcommands: true
  },
  
  // Package managers
  'npm': { 
    maxArgs: 10, 
    flags: ['install', 'uninstall', 'update', 'run', '--help'],
    subcommands: true
  },
  'yarn': { 
    maxArgs: 10, 
    flags: ['add', 'remove', 'upgrade', '--help'],
    subcommands: true
  },
  'pip': { 
    maxArgs: 10, 
    flags: ['install', 'uninstall', 'freeze', '--help'],
    subcommands: true
  },
  
  // Text processing
  'grep': { maxArgs: 5, flags: ['-i', '-r', '-n', '--help'] },
  'find': { maxArgs: 10, flags: ['-name', '-type', '-mtime', '--help'] },
  'awk': { maxArgs: 10, flags: ['-F', '-v', '--help'] },
  'sed': { maxArgs: 5, flags: ['-i', '-e', 's/', '--help'] },
  'head': { maxArgs: 2, flags: ['-n', '--help'] },
  'tail': { maxArgs: 2, flags: ['-n', '-f', '--help'] },
  'less': { maxArgs: 1, flags: ['-N', '-S', '--help'] },
  'more': { maxArgs: 1, flags: ['-d', '--help'] },
  
  // Compression
  'tar': { 
    maxArgs: 10, 
    flags: ['-x', '-c', '-z', '-f', '-v', '--help'],
    dangerous: true 
  },
  'gzip': { maxArgs: 5, flags: ['-d', '-v', '--help'] },
  'gunzip': { maxArgs: 5, flags: ['-v', '--help'] },
  'zip': { maxArgs: 10, flags: ['-r', '-q', '--help'] },
  'unzip': { maxArgs: 5, flags: ['-l', '-o', '--help'] },
  
  // Permissions
  'chmod': { 
    maxArgs: 5, 
    flags: ['-R', '-v', '--help'],
    dangerous: true 
  },
  'chown': { 
    maxArgs: 5, 
    flags: ['-R', '-v', '--help'],
    dangerous: true 
  },
  
  // Help
  'help': { maxArgs: 0, flags: [] },
  'man': { maxArgs: 1, flags: [] },
  'which': { maxArgs: 5, flags: ['-a', '--help'] },
  'whatis': { maxArgs: 1, flags: [] },
  'whereis': { maxArgs: 5, flags: ['-b', '-m', '-s', '--help'] },
  'type': { maxArgs: 5, flags: ['-a', '-t', '-p', '--help'] },
  'alias': { maxArgs: 5, flags: ['-p', '--help'] },
  'unalias': { maxArgs: 5, flags: ['-a', '--help'] },
  'history': { maxArgs: 1, flags: ['-c', '-d', '--help'] },
  'clear': { maxArgs: 0, flags: [] },
  'reset': { maxArgs: 0, flags: [] },
  'exit': { maxArgs: 0, flags: [] },
  'logout': { maxArgs: 0, flags: [] },
  'shutdown': { maxArgs: 1, flags: ['-h', '-r', '--help'] },
  'reboot': { maxArgs: 0, flags: [] },
  'poweroff': { maxArgs: 0, flags: [] },
  'halt': { maxArgs: 0, flags: [] },
  'init': { maxArgs: 1, flags: [] },
  'systemctl': { 
    maxArgs: 10, 
    flags: ['start', 'stop', 'restart', 'status', 'enable', 'disable', '--help'],
    dangerous: true 
  },
  'service': { 
    maxArgs: 10, 
    flags: ['start', 'stop', 'restart', 'status', '--help'],
    dangerous: true 
  },
  'journalctl': { 
    maxArgs: 10, 
    flags: ['-f', '-n', '-u', '--help'],
    dangerous: true 
  },
  'dmesg': { maxArgs: 1, flags: ['-w', '-H', '--help'] },
  'ip': { 
    maxArgs: 10, 
    flags: ['addr', 'link', 'route', 'neigh', '--help'],
    dangerous: true 
  },
  'ifconfig': { maxArgs: 5, flags: ['-a', '--help'] },
  'netstat': { maxArgs: 5, flags: ['-tuln', '-tunlp', '--help'] },
  'ss': { maxArgs: 5, flags: ['-tuln', '-tunlp', '--help'] },
  'lsof': { maxArgs: 5, flags: ['-i', '-P', '-n', '--help'] },
  'nc': { 
    maxArgs: 10, 
    flags: ['-l', '-v', '-n', '-z', '--help'],
    dangerous: true 
  },
  'ssh': { 
    maxArgs: 10, 
    flags: ['-p', '-i', '-L', '-R', '-D', '-N', '-f', '-T', '-v', '--help'],
    dangerous: true 
  },
  'scp': { 
    maxArgs: 10, 
    flags: ['-r', '-P', '-i', '-v', '--help'],
    dangerous: true 
  },
  'rsync': { 
    maxArgs: 10, 
    flags: ['-a', '-v', '-z', '-h', '--progress', '--help'],
    dangerous: true 
  },
  'sftp': { 
    maxArgs: 10, 
    flags: ['-P', '-i', '-b', '--help'],
    dangerous: true 
  },
  'socat': { 
    maxArgs: 10, 
    flags: ['-d', '-d', '-d', '-v', '--help'],
    dangerous: true 
  },
  'tcpdump': { 
    maxArgs: 10, 
    flags: ['-i', '-n', '-v', '--help'],
    dangerous: true 
  },
  'dig': { maxArgs: 10, flags: ['@server', '-p', '-x', '--help'] },
  'host': { maxArgs: 5, flags: ['-a', '-t', '--help'] },
  'nslookup': { maxArgs: 5, flags: ['-type=', '--help'] },
  'whois': { maxArgs: 5, flags: ['-h', '--help'] },
  'hostname': { maxArgs: 1, flags: ['-f', '-i', '--help'] },
  'traceroute6': { maxArgs: 5, flags: ['-n', '-w', '--help'] },
  'mtr': { maxArgs: 5, flags: ['-n', '-r', '-c', '--help'] },
  'nmap': { 
    maxArgs: 10, 
    flags: ['-sS', '-sT', '-sU', '-p', '-A', '-O', '-T4', '--help'],
    dangerous: true 
  }
};

// List of dangerous commands that should be blocked
const BLOCKED_COMMANDS = [
  'rm -rf /',
  ':(){ :|:& };:', // Fork bomb
  'mkfs',
  'mkfs.*',
  'dd',
  'mkisofs',
  'shred',
  'mv / /dev/null',
  'mv ~ /dev/null',
  '> /dev/sda',
  '^foo^bar',
  'wget',
  'curl',
  'bash -c',
  'sh -c',
  'python -c',
  'perl -e',
  'ruby -e',
  'node -e',
  'php -r',
  'exec',
  'eval',
  'source',
  '.',
  '>',
  '>>',
  '|',
  '&',
  ';',
  '`',
  '$(',
  '))',
  '((',
  '||',
  '&&',
  '>|',
  '>'
];

// List of sensitive files and directories that should be protected
const PROTECTED_PATHS = [
  '/etc/passwd',
  '/etc/shadow',
  '/etc/sudoers',
  '/root',
  '/boot',
  '/dev',
  '/proc',
  '/sys',
  '/var/log',
  '/var/lib/docker',
  '/var/run/docker.sock',
  process.env.HOME + '/.ssh',
  process.env.HOME + '/.aws',
  process.env.HOME + '/.kube'
];

/**
 * Check if a command is allowed
 * @param {string} command - The command to check
 * @returns {Object} - { allowed: boolean, reason: string }
 */
function isCommandAllowed(command) {
  if (!command || typeof command !== 'string') {
    return { allowed: false, reason: 'Invalid command' };
  }

  // Trim and normalize the command
  command = command.trim();
  if (!command) {
    return { allowed: false, reason: 'Empty command' };
  }

  // Check for blocked commands and patterns
  for (const pattern of BLOCKED_COMMANDS) {
    const regex = new RegExp(`\\b${pattern}\\b`, 'i');
    if (regex.test(command)) {
      return { 
        allowed: false, 
        reason: `Blocked command or pattern: ${pattern}` 
      };
    }
  }

  // Check for protected paths
  for (const path of PROTECTED_PATHS) {
    if (command.includes(path)) {
      return { 
        allowed: false, 
        reason: `Access to protected path: ${path}` 
      };
    }
  }

  // Parse the command and arguments
  const parts = command.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);
  
  // Check if the command is in the allowed list
  const allowedCmd = ALLOWED_COMMANDS[cmd];
  if (!allowedCmd) {
    return { 
      allowed: false, 
      reason: `Command not allowed: ${cmd}` 
    };
  }

  // Check argument count
  if (args.length > allowedCmd.maxArgs) {
    return { 
      allowed: false, 
      reason: `Too many arguments for ${cmd}. Max: ${allowedCmd.maxArgs}` 
    };
  }

  // Check for disallowed flags
  for (const arg of args) {
    if (arg.startsWith('-') && !allowedCmd.flags.some(flag => {
      // Match exact flag or flag with value (e.g., -p 8080 or --port=8080)
      return arg.startsWith(flag) || 
             (flag.endsWith('=') && arg.startsWith(flag.slice(0, -1)));
    })) {
      return { 
        allowed: false, 
        reason: `Disallowed flag for ${cmd}: ${arg}` 
      };
    }
  }

  return { allowed: true };
}

/**
 * Sanitize command input to prevent injection
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove control characters and other potentially dangerous characters
  return input.replace(/[\x00-\x1F\x7F-\x9F]/g, '')
              .replace(/[\|&;`$()<>]/g, '');
}

module.exports = {
  isCommandAllowed,
  sanitizeInput,
  ALLOWED_COMMANDS,
  BLOCKED_COMMANDS,
  PROTECTED_PATHS
};
