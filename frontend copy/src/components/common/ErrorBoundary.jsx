import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to your monitoring here if available
    // console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="border border-yellow-300 bg-yellow-50 text-yellow-800 rounded-md p-3 text-sm">
          <div className="font-medium">A preview error occurred.</div>
          <div className="opacity-80">The editor remains available. Try again or reload.</div>
        </div>
      );
    }
    return this.props.children;
  }
}
