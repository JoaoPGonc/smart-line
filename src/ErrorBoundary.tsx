import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 text-red-900 h-full w-full overflow-y-auto font-mono text-xs z-50 absolute inset-0">
          <h1 className="text-xl font-bold mb-4">React Error</h1>
          <p className="mb-4">An unexpected error occurred in the component tree.</p>
          <pre className="whitespace-pre-wrap break-all bg-white p-4 rounded shadow">
            {this.state.error?.toString()}
          </pre>
          <pre className="whitespace-pre-wrap break-all bg-white p-4 rounded shadow mt-4">
            {this.state.error?.stack}
          </pre>
          <button 
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
