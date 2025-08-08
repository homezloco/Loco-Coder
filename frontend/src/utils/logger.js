/**
 * Lightweight logging utility with namespaces, levels, and once-per-session helpers.
 *
 * Usage:
 *   import logger from '../utils/logger';
 *   const log = logger.ns('project');
 *   log.info('message');
 *   log.once('init', () => log.debug('only once'));
 *
 * Notes:
 * - Do NOT call .log() on the returned namespace logger; supported methods are
 *   .error(), .warn(), .info(), .debug(), .trace(), .group(), .groupCollapsed(), .groupEnd(), and .once().
 * - Log output is filtered by the global level and namespace pattern.
 *   Level can be set via logger.setLevel('error'|'warn'|'info'|'debug'|'trace').
 *   Namespaces can be enabled via logger.enable('api:*,auth,ui:*'), supporting comma-separated glob patterns.
 * - In production (Vite env), default level is 'warn'. In development, defaults to VITE_LOG_LEVEL or 'info'.
 * - This module intentionally uses console.* internally and is whitelisted in ESLint rules.
 *
 * @module logger
 */

const win = typeof window !== 'undefined' ? window : {};

const LEVELS = ['error', 'warn', 'info', 'debug', 'trace'];
const DEFAULT_LEVEL = (() => {
  try {
    const env = (import.meta && import.meta.env) || {};
    if (env.PROD) return 'warn';
    return env.VITE_LOG_LEVEL || 'info';
  } catch {
    return 'info';
  }
})();

function parseLevel(lvl) {
  return LEVELS.includes(lvl) ? lvl : DEFAULT_LEVEL;
}

function patternToRegex(pattern) {
  // simple comma separated glob-like namespaces: "*", "auth,project", "api:*"
  const parts = (pattern || '*')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(glob => '^' + glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
  return new RegExp('(' + (parts.join('|') || '.*') + ')');
}

const state = {
  level: parseLevel(win.__LOG_LEVEL__ || DEFAULT_LEVEL),
  nsRegex: patternToRegex(win.__LOG_NAMESPACES__ || '*'),
};

function shouldLog(ns, level) {
  const currentIdx = LEVELS.indexOf(state.level);
  const msgIdx = LEVELS.indexOf(level);
  if (msgIdx < 0) return false;
  if (msgIdx > currentIdx) return false; // level higher verbosity than allowed
  return state.nsRegex.test(ns);
}

/**
 * Create a namespaced logger instance.
 * @param {string} ns - Namespace label (e.g., 'api', 'auth:token', 'ui:editor').
 * @returns {{
 *  error: (...args: any[]) => void,
 *  warn: (...args: any[]) => void,
 *  info: (...args: any[]) => void,
 *  debug: (...args: any[]) => void,
 *  trace: (...args: any[]) => void,
 *  group: (label?: string, ...args: any[]) => void,
 *  groupCollapsed: (label?: string, ...args: any[]) => void,
 *  groupEnd: () => void,
 *  once: (key: string, fn: () => void) => void,
 * }} Namespaced logger API. Note: .log() is intentionally NOT provided.
 */
function makeNS(ns) {
  const prefix = `[${ns}]`;
  const call = (level, method, args) => {
    if (!shouldLog(ns, level)) return;
    // eslint-disable-next-line no-console
    (console[method] || console.log).apply(console, [prefix, ...args]);
  };

  const api = {
    error: (...args) => call('error', 'error', args),
    warn: (...args) => call('warn', 'warn', args),
    info: (...args) => call('info', 'info', args),
    debug: (...args) => call('debug', 'debug', args),
    trace: (...args) => call('trace', 'trace', args),
    group: (label, ...args) => shouldLog(ns, state.level) && console.group(`${prefix} ${label || ''}`, ...args),
    groupCollapsed: (label, ...args) => shouldLog(ns, state.level) && console.groupCollapsed(`${prefix} ${label || ''}`, ...args),
    groupEnd: () => shouldLog(ns, state.level) && console.groupEnd(),
    once: (key, fn) => {
      const flag = `__LOG_ONCE__${ns}__${key}`;
      if (win[flag]) return;
      win[flag] = true;
      try { fn(); } catch {}
    },
  };
  return api;
}

/**
 * Root logger controller.
 * @typedef {Object} LoggerRoot
 * @property {(ns: string) => ReturnType<typeof makeNS>} ns Create a namespaced logger instance.
 * @property {(lvl: 'error'|'warn'|'info'|'debug'|'trace') => void} setLevel Set global log level.
 * @property {(namespaces?: string) => void} enable Enable namespaces (comma-separated globs, e.g. 'api:*,auth').
 * @property {('error'|'warn'|'info'|'debug'|'trace')} level Current global level.
 * @property {string} namespaces Current enabled namespace pattern.
 */
const logger = {
  ns: makeNS,
  setLevel: (lvl) => { state.level = parseLevel(lvl); win.__LOG_LEVEL__ = state.level; },
  enable: (namespaces = '*') => { state.nsRegex = patternToRegex(namespaces); win.__LOG_NAMESPACES__ = namespaces; },
  get level() { return state.level; },
  get namespaces() { return win.__LOG_NAMESPACES__ || '*'; },
};

export default logger;
