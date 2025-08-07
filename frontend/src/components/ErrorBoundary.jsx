import React from 'react';
import PropTypes from 'prop-types';

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

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // If a reset function was provided, call it
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      const { fallbackComponent: FallbackComponent } = this.props;
      
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} reset={this.handleRetry} />;
      }
      
      // Default error UI
      return (
        <div className="error-boundary p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg mx-auto my-8">
          <div className="flex items-center mb-4">
            <div className="bg-red-100 dark:bg-red-900 p-2 rounded-full">
              <svg className="w-6 h-6 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold ml-2 text-gray-800 dark:text-white">Something went wrong</h2>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            We're sorry, but an error occurred while rendering this component. Our team has been notified.
          </p>
          
          <div className="flex flex-col space-y-4">
            <button 
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Try Again
            </button>
            
            <button 
              onClick={this.handleGoHome}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            >
              Go to Home Page
            </button>
          </div>
          
          {this.props.showDetails && (
            <details className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">Technical Details</summary>
              <div className="mt-2">
                <p className="text-red-600 dark:text-red-400 text-sm">{this.state.error && this.state.error.toString()}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">Component stack trace:</p>
                <pre className="mt-1 p-2 bg-gray-200 dark:bg-gray-800 rounded text-xs overflow-auto max-h-48">
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.func,
  onReset: PropTypes.func,
  showDetails: PropTypes.bool
};

ErrorBoundary.defaultProps = {
  showDetails: process.env.NODE_ENV === 'development'
};

export default ErrorBoundary;
