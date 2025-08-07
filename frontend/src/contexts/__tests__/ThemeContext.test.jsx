import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../ThemeContext';

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock document methods
document.documentElement.classList = {
  add: jest.fn(),
  remove: jest.fn(),
  contains: jest.fn(),
};

// Test component that uses the theme context
const TestComponent = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div>
      <div data-testid="theme-state">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</div>
      <button 
        data-testid="toggle-theme-btn" 
        onClick={toggleTheme}
      >
        Toggle Theme
      </button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    document.documentElement.classList.add.mockClear();
    document.documentElement.classList.remove.mockClear();
    document.documentElement.classList.contains.mockClear();
  });

  test('should use system preference if no theme is stored', () => {
    // Mock system preference for dark mode
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Should use system preference (dark mode)
    expect(screen.getByTestId('theme-state')).toHaveTextContent('Dark Mode');
    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
  });

  test('should use stored theme preference if available', () => {
    // Set stored preference to light mode
    localStorage.setItem('theme', 'light');

    // Mock system preference for dark mode (should be ignored)
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Should use stored preference (light mode) instead of system preference
    expect(screen.getByTestId('theme-state')).toHaveTextContent('Light Mode');
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
  });

  test('should toggle theme correctly', async () => {
    // Start with light mode
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.contains.mockReturnValue(false);

    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Initial state should be light mode
    expect(getByTestId('theme-state')).toHaveTextContent('Light Mode');

    // Toggle to dark mode
    await act(async () => {
      userEvent.click(getByTestId('toggle-theme-btn'));
    });

    // Should now be in dark mode
    expect(getByTestId('theme-state')).toHaveTextContent('Dark Mode');
    expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');

    // Mock dark mode being active in DOM
    document.documentElement.classList.contains.mockReturnValue(true);

    // Toggle back to light mode
    await act(async () => {
      userEvent.click(getByTestId('toggle-theme-btn'));
    });

    // Should now be in light mode
    expect(getByTestId('theme-state')).toHaveTextContent('Light Mode');
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  test('should handle theme toggle in AppMain component', async () => {
    // Import the real AppMain component
    jest.dontMock('../../components/App/AppMain');
    const { default: AppMain } = require('../../components/App/AppMain');
    
    // Mock the ThemeContext to verify toggleTheme is called
    const mockToggleTheme = jest.fn();
    jest.mock('../ThemeContext', () => ({
      ...jest.requireActual('../ThemeContext'),
      useTheme: () => ({
        isDarkMode: true,
        toggleTheme: mockToggleTheme
      })
    }));
    
    // Mock other contexts to avoid errors
    jest.mock('../NewAuthContext', () => ({
      useAuth: () => ({ isAuthenticated: false, loading: false })
    }));
    jest.mock('../SettingsContext', () => ({
      useSettings: () => ({ settings: {}, loading: false })
    }));
    jest.mock('../NewProjectContext', () => ({
      useProject: () => ({ currentProject: null, loading: false })
    }));
    jest.mock('../NewApiContext', () => ({
      useApi: () => ({})
    }));
    jest.mock('../../components/feedback/FeedbackContext', () => ({
      useFeedback: () => ({})
    }));
    
    // Render AppMain with mocked contexts
    render(<AppMain />);
    
    // Verify that toggleDarkMode in AppMain calls toggleTheme from ThemeContext
    const toggleDarkMode = AppMain().props.menuActions.toggleDarkMode;
    toggleDarkMode();
    expect(mockToggleTheme).toHaveBeenCalled();
  });
});
