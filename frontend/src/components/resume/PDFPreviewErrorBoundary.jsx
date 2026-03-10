import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

class PDFPreviewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PDF Preview Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-red-50 border border-red-200">
          <div className="text-center p-6">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">PDF Preview Error</h3>
            <p className="text-sm text-red-700 mb-4">
              The PDF preview encountered an error, but the editor remains functional.
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Preview
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PDFPreviewErrorBoundary;
