import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useApi } from './NewApiContext';
import { toast } from 'react-toastify';

// Create the AI context
const AIContext = createContext();

// Custom hook to use the AI context
export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

// AI Provider component
export const AIProvider = ({ children }) => {
  const { api } = useApi();
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({
    model: 'deepseek-coder:33b',
    temperature: 0.7,
    maxTokens: 2000,
  });

  // Load messages from localStorage on mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('ai_chat_messages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (err) {
      console.error('Failed to load chat messages from localStorage:', err);
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('ai_chat_messages', JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to save chat messages to localStorage:', err);
    }
  }, [messages]);

  // Send a message to the AI service
  const sendMessage = useCallback(
    async (content) => {
      if (!content.trim()) return;

      const userMessage = {
        id: Date.now(),
        type: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      // Update messages with user message
      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);
      setIsLoading(true);
      setError(null);

      try {
        // Call the AI service
        const response = await api.chat(content, {
          model: settings.model,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
        });

        const aiMessage = {
          id: `ai-${Date.now()}`,
          type: 'assistant',
          content: response.response || response,
          timestamp: new Date().toISOString(),
          model: response.model || settings.model,
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch (err) {
        console.error('Error sending message to AI:', err);
        setError(err.message || 'Failed to get response from AI service');
        toast.error('Failed to get response from AI service');
      } finally {
        setIsTyping(false);
        setIsLoading(false);
      }
    },
    [api, settings]
  );

  // Clear the chat history
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
    }));
  }, []);

  // Context value
  const value = {
    messages,
    sendMessage,
    clearChat,
    isTyping,
    isLoading,
    error,
    settings,
    updateSettings,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

export default AIContext;
