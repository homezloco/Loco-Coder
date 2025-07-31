import React from 'react';

/**
 * ErrorBoundary - Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the whole application
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error information for debugging
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Optional: send error to logging service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      const { fallbackComponent: FallbackComponent } = this.props;
      
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} reset={() => this.setState({ hasError: false })} />;
      }
      
      // Default error UI
      return (
        <div style={{
          padding: '20px',
          margin: '10px',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          color: '#721c24',
          position: 'relative'
        }}>
          <h3>Something went wrong</h3>
          <p>This component encountered an error. We've been notified and are working to fix it.</p>
          <button 
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
          {this.props.showDetails && (
            <details style={{ marginTop: '15px', whiteSpace: 'pre-wrap' }}>
              <summary>Error details</summary>
              <p>{this.state.error && this.state.error.toString()}</p>
              <p style={{ color: '#666' }}>
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </p>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
