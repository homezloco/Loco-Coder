import React, { useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useProject } from '../contexts/NewProjectContext';
import { useApi } from '../contexts/NewApiContext';
import { FiSend, FiEdit2, FiSave, FiRefreshCw } from 'react-icons/fi';

const WritePage = () => {
  const { projectId } = useParams();
  const { isDarkMode } = useTheme();
  const { currentProject } = useProject();
  const { aiService } = useApi();
  
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const editorRef = useRef(null);

  const handleContentChange = (e) => {
    setContent(e.target.value);
    // Clear error when user types
    if (error) setError(null);
  };

  const generateSuggestions = useCallback(async () => {
    if (!content.trim()) {
      setError('Please enter some text first');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiService.chat(
        `Please provide 3 suggestions to improve or continue this text:\n\n${content}`,
        {
          temperature: 0.7,
          max_tokens: 150,
        }
      );

      if (response.choices && response.choices.length > 0) {
        const suggestionsText = response.choices[0].message.content;
        // Split suggestions by newlines and filter out empty lines
        const suggestionsList = suggestionsText
          .split('\n')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        setSuggestions(suggestionsList);
      }
    } catch (err) {
      console.error('Error generating suggestions:', err);
      setError('Failed to generate suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [content, aiService]);

  const applySuggestion = (suggestion) => {
    setContent(prev => prev + ' ' + suggestion);
    setSuggestions([]);
  };

  const saveContent = async () => {
    if (!content.trim()) {
      setError('Cannot save empty content');
      return;
    }
    
    // Implement save logic here
    console.log('Saving content:', content);
    // TODO: Add actual save functionality
  };

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold">
          {currentProject?.name || 'Untitled Document'}
        </h1>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleContentChange}
              className={`w-full h-64 p-4 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-800'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder="Start writing here..."
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="flex space-x-3 mb-6">
            <button
              onClick={generateSuggestions}
              disabled={isLoading}
              className={`flex items-center px-4 py-2 rounded-lg ${
                isLoading
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } transition-colors`}
            >
              {isLoading ? (
                <>
                  <FiRefreshCw className="animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <FiEdit2 className="mr-2" />
                  Get Suggestions
                </>
              )}
            </button>
            
            <button
              onClick={saveContent}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <FiSave className="mr-2" />
              Save
            </button>
          </div>
          
          {suggestions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">AI Suggestions</h3>
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' 
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                    onClick={() => applySuggestion(suggestion)}
                  >
                    <div className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{suggestion}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WritePage;
