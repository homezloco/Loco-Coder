console.log('Script starting...');

// Simple test to check if React is loaded
if (!window.React) {
  console.error('React is not loaded!');
  document.body.innerHTML = `
    <h1 style="color: red">Error: React not loaded</h1>
    <p>Check the browser console for more details.</p>
  `;
} else {
  console.log('React is available:', window.React.version);
  
  // Create a simple component
  const App = () => {
    console.log('Rendering App component');
    return React.createElement('div', { 
      style: { 
        padding: '20px', 
        fontFamily: 'Arial, sans-serif' 
      }
    }, [
      React.createElement('h1', { key: 'h1' }, 'Hello from React!'),
      React.createElement('p', { key: 'p1' }, 'If you see this, React is working!'),
      React.createElement('p', { key: 'p2' }, 'Check the console for more details.')
    ]);
  };
  
  // Render the app
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }
    
    console.log('Creating root...');
    const root = window.ReactDOM.createRoot(rootElement);
    
    console.log('Rendering...');
    root.render(
      window.React.createElement(window.React.StrictMode, null,
        window.React.createElement(App)
      )
    );
    
    console.log('Render complete');
    
  } catch (error) {
    console.error('Error:', error);
    document.body.innerHTML = `
      <h1 style="color: red">Error</h1>
      <p>${error.message}</p>
      <pre>${error.stack}</pre>
    `;
  }
}
