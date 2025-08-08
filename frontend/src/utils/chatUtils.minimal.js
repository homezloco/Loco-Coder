// Minimal implementation of chatUtils.js for debugging
// This version removes complex error handling and IndexedDB to isolate issues

import logger from './logger';
const chatLog = logger('api:chat');

/**
 * Minimal sanitize function that just returns the input as-is
 */
function sanitizeForStorage(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (e) {
    chatLog.warn('Sanitization failed, returning empty object');
    return {};
  }
}

/**
 * Save chat history to localStorage only
 */
export function saveChatHistory(history) {
  try {
    const data = Array.isArray(history) ? history : [];
    localStorage.setItem('chatHistory', JSON.stringify(data));
    return true;
  } catch (e) {
    chatLog.error('Error saving chat history:', e);
    return false;
  }
}

/**
 * Load chat history from localStorage only
 */
export function loadChatHistory() {
  try {
    const saved = localStorage.getItem('chatHistory');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    chatLog.error('Error loading chat history:', e);
    return [];
  }
}

/**
 * Minimal user settings functions
 */
export function saveUserSettings(settings = {}) {
  try {
    localStorage.setItem('userSettings', JSON.stringify(settings));
    return true;
  } catch (e) {
    chatLog.error('Error saving user settings:', e);
    return false;
  }
}

export async function loadUserSettings() {
  try {
    const saved = localStorage.getItem('userSettings');
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    chatLog.error('Error loading user settings:', e);
    return {};
  }
}

// Minimal implementations of other required functions
export async function checkChatApiHealth() {
  return { status: 'ok', message: 'API health check passed' };
}

export function getAIModel(useFallbackModels = true) {
  return 'default-model';
}

// Export all functions for consistency
export default {
  saveChatHistory,
  loadChatHistory,
  saveUserSettings,
  loadUserSettings,
  checkChatApiHealth,
  getAIModel
};
