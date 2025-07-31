import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiSend, FiPaperclip, FiCode, FiMic, FiStopCircle } from 'react-icons/fi';

/**
 * MessageInput component handles user input for chat messages
 */
// Default handler functions
const noop = () => {};
const defaultOnChange = () => console.warn('No onChange handler provided to MessageInput');
const defaultOnSubmit = () => console.warn('No onSubmit handler provided to MessageInput');

const MessageInput = ({
  value = '',
  onChange = defaultOnChange,
  onSubmit = defaultOnSubmit,
  onFileUpload = noop,
  onCodeInsert = noop,
  onVoiceInput = noop,
  isRecording = false,
  isSubmitting = false,
  isDarkMode = false,
  placeholder = 'Type a message...',
  disabled = false,
  className = ''
}) => {
  const [isComposing, setIsComposing] = useState(false);
  const [rows, setRows] = useState(1);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const maxRows = 6;

  // Auto-resize textarea based on content
  useEffect(() => {
    if (!textareaRef.current) return;
    
    // Reset height to get correct scrollHeight
    textareaRef.current.style.height = 'auto';
    
    // Safely get computed styles with fallbacks
    const computedStyle = getComputedStyle(textareaRef.current);
    const lineHeight = parseInt(computedStyle.lineHeight, 10) || 20; // Fallback to 20px if invalid
    const paddingTop = parseInt(computedStyle.paddingTop, 10) || 0;
    const paddingBottom = parseInt(computedStyle.paddingBottom, 10) || 0;
    const padding = paddingTop + paddingBottom;
    
    const scrollHeight = Math.max(0, textareaRef.current.scrollHeight - padding);
    const newRows = Math.min(
      Math.max(1, Math.ceil(scrollHeight / lineHeight)),
      maxRows
    );
    
    // Ensure rows is a valid number
    setRows(Number.isFinite(newRows) ? newRows : 1);
    
    // Set the height directly on the element
    if (Number.isFinite(scrollHeight) && scrollHeight > 0) {
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [value]);

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim() && !isSubmitting) {
      onSubmit(value);
      // Reset textarea height after submit
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Cmd+Enter or Ctrl+Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
    
    // Don't submit on Enter if composing (e.g., IME input)
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0 && onFileUpload) {
      onFileUpload(files);
      // Reset file input to allow selecting the same file again
      e.target.value = '';
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check for pasted files
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && onFileUpload) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          onFileUpload([file]);
          return;
        }
      }
    }
  };

  const inputBg = isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900';
  const inputBorder = isDarkMode 
    ? 'border-gray-600 focus:border-blue-500' 
    : 'border-gray-300 focus:border-blue-500';
  const buttonBg = isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700';
  const iconColor = isDarkMode ? 'text-gray-300' : 'text-gray-500';
  const iconHover = isDarkMode ? 'hover:text-white' : 'hover:text-gray-700';
  const disabledStyle = disabled || isSubmitting ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className={`flex items-end p-2 border rounded-lg ${inputBg} ${inputBorder} ${disabledStyle}`}>
        {/* File upload button */}
        <div className="flex-shrink-0 mr-2">
          <button
            type="button"
            onClick={handleFileClick}
            disabled={disabled || isSubmitting}
            className={`p-2 rounded-full ${iconColor} ${iconHover} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
            aria-label="Attach file"
            title="Attach file"
          >
            <FiPaperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            multiple
            disabled={disabled || isSubmitting}
          />
        </div>
        
        {/* Main text input */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onPaste={handlePaste}
            rows={rows}
            className={`w-full px-3 py-2 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none ${isDarkMode ? 'placeholder-gray-400' : 'placeholder-gray-500'}`}
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
            aria-label="Type a message"
          />
          
          {/* Character counter */}
          {value.length > 0 && (
            <div className={`text-xs text-right mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {value.length}/4000
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex-shrink-0 ml-2 flex items-center">
          {/* Code insert button */}
          {onCodeInsert && (
            <button
              type="button"
              onClick={onCodeInsert}
              disabled={disabled || isSubmitting}
              className={`p-2 rounded-full ${iconColor} ${iconHover} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              aria-label="Insert code"
              title="Insert code"
            >
              <FiCode className="w-5 h-5" />
            </button>
          )}
          
          {/* Voice input button */}
          {onVoiceInput && (
            <button
              type="button"
              onClick={onVoiceInput}
              disabled={disabled || isSubmitting}
              className={`p-2 rounded-full ${isRecording ? 'text-red-500' : iconColor} ${iconHover} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              aria-label={isRecording ? 'Stop recording' : 'Voice input'}
              title={isRecording ? 'Stop recording' : 'Voice input'}
            >
              {isRecording ? (
                <FiStopCircle className="w-5 h-5 animate-pulse" />
              ) : (
                <FiMic className="w-5 h-5" />
              )}
            </button>
          )}
          
          {/* Send button */}
          <button
            type="submit"
            disabled={!value.trim() || isSubmitting || disabled}
            className={`ml-2 p-2 rounded-full text-white ${buttonBg} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${!value.trim() || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Send message"
          >
            <FiSend className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Keyboard shortcut hint */}
      <div className={`mt-1 text-xs text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        {isSubmitting ? 'Sending...' : 'Press Enter to send, Shift+Enter for new line'}
      </div>
    </form>
  );
};

MessageInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onFileUpload: PropTypes.func,
  onCodeInsert: PropTypes.func,
  onVoiceInput: PropTypes.func,
  isRecording: PropTypes.bool,
  isSubmitting: PropTypes.bool,
  isDarkMode: PropTypes.bool,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string
};



export default MessageInput;
