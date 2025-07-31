import React, { useCallback, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import ChatPanel from '../ChatPanel';
import { useProject } from '../contexts/NewProjectContext';
import { useAI } from '../contexts/AIContext';
import { toast } from 'react-toastify';

const ChatPage = () => {
  const { projectId } = useParams();
  const { isDarkMode } = useTheme();
  const { currentProject } = useProject();

  // Use the AI context
  const { sendMessage, isTyping, isLoading, error } = useAI();
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({
    apiEndpoint: process.env.REACT_APP_AI_API_URL || 'http://localhost:11434',
    activeModel: 'deepseek-coder:33b',
    temperature: 0.7,
  });

  // Load messages from localStorage on mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('ai_chat_messages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('ai_chat_messages', JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to save chat messages:', err);
    }
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = useCallback(async (content) => {
    if (!content.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    // Update messages with user message
    setMessages(prev => [...prev, userMessage]);

    try {
      // Call the AI service
      const response = await sendMessage(content);
      
      const aiMessage = {
        id: `ai-${Date.now()}`,
        type: 'assistant',
        content: response.response || response,
        timestamp: new Date().toISOString(),
        model: response.model || settings.activeModel,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to get response from AI service');
    }
  }, [sendMessage, settings.activeModel]);

  // Handle retry for failed messages
  const handleRetryMessage = useCallback(async (messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (message && message.type === 'user') {
      await handleSendMessage(message.content);
    }
  }, [messages, handleSendMessage]);

  // Handle settings update
  const handleSettingsUpdate = useCallback((newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <ChatPanel
          codeIntegration={{
            getContext: () => ({
              code: '',
              language: 'javascript',
              filePath: '',
            }),
            applyCode: (code) => {
              console.log('Applying code:', code);
            },
            getLanguage: () => 'javascript',
          }}
          isDarkMode={isDarkMode}
          apiEndpoint={settings.apiEndpoint}
          settings={settings}
          onUpdateSettings={handleSettingsUpdate}
          projectId={projectId}
          projectName={currentProject?.name || 'Untitled Project'}
        />
      </div>
    </div>
  );
};

export default ChatPage;
