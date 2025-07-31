/**
 * Language Utilities
 * Provides helper functions and mappings for language detection and handling
 */

// File extension to language mapping
export const EXTENSION_MAP = {
  // Backend languages
  '.py': 'python',
  '.js': 'javascript',
  '.ts': 'typescript',
  '.go': 'go',
  '.rs': 'rust',
  
  // Mobile languages
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.java': 'java',  // Used in Android development
  '.dart': 'dart',
  '.cs': 'csharp',
  '.jsx': 'javascript', // React/React Native
  '.tsx': 'typescript', // React/React Native with TypeScript
  
  // Web languages
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.json': 'json',
  '.md': 'markdown',
  '.xml': 'xml',

  // Config files
  '.toml': 'toml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
};

// Language categories for UI organization
export const LANGUAGE_CATEGORIES = {
  backend: ['python', 'javascript', 'typescript', 'go', 'rust'],
  mobile: ['swift', 'kotlin', 'java', 'dart', 'csharp', 'react-native'],
  web: ['html', 'css', 'scss', 'javascript', 'typescript'],
  other: ['json', 'markdown', 'xml', 'yaml', 'toml']
};

// Maps human-friendly display names for languages
export const LANGUAGE_DISPLAY_NAMES = {
  'python': 'Python',
  'javascript': 'JavaScript',
  'typescript': 'TypeScript',
  'go': 'Go',
  'rust': 'Rust',
  'swift': 'Swift',
  'kotlin': 'Kotlin',
  'java': 'Java',
  'dart': 'Dart',
  'csharp': 'C#',
  'react-native': 'React Native',
  'html': 'HTML',
  'css': 'CSS',
  'scss': 'SCSS',
  'json': 'JSON',
  'markdown': 'Markdown',
  'xml': 'XML',
  'yaml': 'YAML',
  'toml': 'TOML'
};

// Maps language identifiers to Monaco language IDs
export const MONACO_LANGUAGE_MAP = {
  'python': 'python',
  'javascript': 'javascript',
  'typescript': 'typescript',
  'go': 'go',
  'rust': 'rust',
  'swift': 'swift',
  'kotlin': 'kotlin',
  'java': 'java',
  'dart': 'dart',
  'csharp': 'csharp',
  'react-native': 'javascript',
  'html': 'html',
  'css': 'css',
  'scss': 'scss',
  'json': 'json',
  'markdown': 'markdown',
  'xml': 'xml',
  'yaml': 'yaml',
  'toml': 'toml'
};

// Maps each language to its execution capabilities
export const LANGUAGE_CAPABILITIES = {
  'python': { client: false, backend: true },
  'javascript': { client: true, backend: true },
  'typescript': { client: false, backend: true },
  'go': { client: false, backend: true },
  'rust': { client: false, backend: true },
  'swift': { client: false, backend: true },
  'kotlin': { client: false, backend: true },
  'java': { client: false, backend: true },
  'dart': { client: false, backend: true },
  'csharp': { client: false, backend: true },
  'react-native': { client: false, backend: true },
  'html': { client: true, backend: false },
  'css': { client: true, backend: false },
  'scss': { client: true, backend: false },
  'json': { client: true, backend: false },
  'markdown': { client: true, backend: false },
  'xml': { client: true, backend: false },
  'yaml': { client: false, backend: false },
  'toml': { client: false, backend: false }
};

/**
 * Detect language from file extension
 * @param {string} filePath - Path to the file
 * @returns {string} - Detected language or 'text' as fallback
 */
export function detectLanguageFromPath(filePath) {
  if (!filePath) return 'text';
  
  const extension = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return EXTENSION_MAP[extension] || 'text';
}

/**
 * Detect language from file contents
 * @param {string} content - File content
 * @param {string} fallbackLanguage - Fallback if detection fails
 * @returns {string} - Detected language or fallback
 */
export function detectLanguageFromContent(content, fallbackLanguage = 'text') {
  if (!content) return fallbackLanguage;
  
  // Simple content-based detection
  const firstLine = content.split('\n')[0].trim();
  
  // Shebang detection
  if (firstLine.startsWith('#!/usr/bin/env python') || firstLine.startsWith('#!python')) {
    return 'python';
  } else if (firstLine.startsWith('#!/usr/bin/env node') || firstLine.startsWith('//')) {
    return 'javascript';
  } else if (firstLine.startsWith('package main') || content.includes('func main()')) {
    return 'go';
  } else if (firstLine.startsWith('fn main') || content.includes('pub fn') || content.includes('use std::')) {
    return 'rust';
  } else if (content.includes('import SwiftUI') || content.includes('import UIKit')) {
    return 'swift';
  } else if (content.includes('import kotlin') || content.includes('fun main(')) {
    return 'kotlin';
  } else if (content.includes('import Flutter') || content.includes('import \'package:flutter')) {
    return 'dart';
  } else if (content.includes('using System;') || content.includes('namespace ')) {
    return 'csharp';
  } else if (content.includes('import React') && content.includes('StyleSheet')) {
    return 'react-native';
  } else if (content.includes('<html') || content.includes('<!DOCTYPE html>')) {
    return 'html';
  } else if (content.match(/^[\s\{]*[\w-]+[\s\{]*:[\s\w#]+;/)) {
    return 'css';
  } else if (content.startsWith('{') && content.endsWith('}')) {
    try {
      JSON.parse(content);
      return 'json';
    } catch (e) {
      // Not valid JSON, continue with other detection
    }
  }
  
  return fallbackLanguage;
}

/**
 * Get appropriate file extension for a language
 * @param {string} language - Language identifier
 * @returns {string} - File extension including the dot
 */
export function getExtensionForLanguage(language) {
  switch (language.toLowerCase()) {
    case 'python': return '.py';
    case 'javascript': return '.js';
    case 'typescript': return '.ts';
    case 'go': return '.go';
    case 'rust': return '.rs';
    case 'swift': return '.swift';
    case 'kotlin': return '.kt';
    case 'java': return '.java';
    case 'dart': return '.dart';
    case 'csharp': return '.cs';
    case 'react-native': return '.jsx';
    case 'html': return '.html';
    case 'css': return '.css';
    case 'scss': return '.scss';
    case 'json': return '.json';
    case 'markdown': return '.md';
    case 'xml': return '.xml';
    case 'yaml': return '.yaml';
    case 'toml': return '.toml';
    default: return '.txt';
  }
}

/**
 * Check if a language can be executed on the backend
 * @param {string} language - Language identifier
 * @returns {boolean} - True if executable on backend
 */
export function canExecuteOnBackend(language) {
  const capabilities = LANGUAGE_CAPABILITIES[language.toLowerCase()];
  return capabilities?.backend === true;
}

/**
 * Check if a language can be executed in the client browser
 * @param {string} language - Language identifier
 * @returns {boolean} - True if executable in browser
 */
export function canExecuteInBrowser(language) {
  const capabilities = LANGUAGE_CAPABILITIES[language.toLowerCase()];
  return capabilities?.client === true;
}

/**
 * Get Monaco editor language ID for a language
 * @param {string} language - Language identifier
 * @returns {string} - Monaco language identifier
 */
export function getMonacoLanguage(language) {
  return MONACO_LANGUAGE_MAP[language.toLowerCase()] || 'plaintext';
}
