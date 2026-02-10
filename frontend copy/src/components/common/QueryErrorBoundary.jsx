import React from 'react';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';

class QueryErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Query Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full border border-gray-200 text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaExclamationTriangle className="text-red-600 text-3xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              We encountered an error while loading the query system. This might be a temporary issue.
            </p>
            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg flex-1 flex items-center justify-center"
              >
                <FaRedo className="mr-2" />
                Try Again
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              If the problem persists, please contact the placement cell directly.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default QueryErrorBoundary;
