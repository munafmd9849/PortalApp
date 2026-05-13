import React from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
          <div className="bg-white p-8 rounded-3xl border border-rose-200 shadow-xl max-w-2xl w-full flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Component Render Failed</h2>
            <p className="text-slate-500 mb-8 font-medium">
              The application encountered a critical rendering error and could not display this page.
            </p>
            
            <div className="w-full bg-slate-900 rounded-xl p-4 overflow-auto text-left mb-8 max-h-64">
              <p className="text-rose-400 font-mono text-xs font-bold mb-2">
                {this.state.error?.toString()}
              </p>
              <pre className="text-slate-400 font-mono text-[10px]">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}
