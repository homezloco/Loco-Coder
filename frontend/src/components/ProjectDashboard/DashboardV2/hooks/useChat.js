import { useState, useCallback } from 'react';
import { useApi } from '../../../../contexts/NewApiContext';
import { useFeedback } from '../../../feedback/FeedbackContext.jsx';

const useChat = () => {
  const { showErrorToast } = useFeedback();
  const api = useApi();
  
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [error, setError] = useState(null);

  // Send a message to the AI
  const sendMessage = useCallback(async (message) => {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now(),
      content: message,
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Send the message to the AI service
      const response = await api.ai.chat.send(message, {
        stream: true, // Enable streaming for a better user experience
      });

      // Handle streaming response
      if (response && typeof response[Symbol.asyncIterator] === 'function') {
        let fullResponse = '';
        const assistantMessageId = Date.now() + 1;
        
        // Add an empty assistant message that we'll update
        setMessages(prev => [
          ...prev, 
          {
            id: assistantMessageId,
            content: '',
            role: 'assistant',
            timestamp: new Date().toISOString(),
            isStreaming: true
          }
        ]);

        // Process the stream
        for await (const chunk of response) {
          if (chunk.content) {
            fullResponse += chunk.content;
            
            // Update the assistant's message with the latest content
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: fullResponse }
                : msg
            ));
          }
        }

        // Mark streaming as complete
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, isStreaming: false }
            : msg
        ));
      } else {
        // Fallback for non-streaming responses
        const assistantMessage = {
          id: Date.now() + 1,
          content: response?.content || 'I\'m sorry, I couldn\'t process your request.',
          role: 'assistant',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('Error sending message to AI:', err);
      setError('Failed to get a response from the AI. Please try again.');
      showErrorToast('Failed to get a response from the AI');
    } finally {
      setIsLoading(false);
    }
  }, [api.ai, showErrorToast]);

  // Clear the chat history
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Toggle chat visibility
  const toggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);

  return {
    messages,
    isLoading,
    error,
    isChatOpen,
    sendMessage,
    clearChat,
    toggleChat,
  };
};

export default useChat;
