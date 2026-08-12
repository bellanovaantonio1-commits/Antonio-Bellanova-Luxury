import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const fallback = this.props.fallback;
      if (fallback) return fallback;

      return (
        <div className="p-12 bg-white rounded-[32px] border border-red-100 shadow-xl flex flex-col items-center justify-center text-center space-y-6">
          <div className="p-4 bg-red-50 rounded-full">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-serif tracking-tight text-gray-900">Ein Fehler ist aufgetreten</h3>
            <p className="text-[13px] text-gray-500 max-w-md mx-auto">
              Die Komponente konnte nicht geladen werden. Dies kann an ungültigen Import-Daten oder einem internen Fehler liegen.
            </p>
            {this.state.error && (
              <pre className="mt-4 p-4 bg-gray-50 rounded-xl text-[10px] text-red-600 font-mono overflow-auto max-w-full">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg"
          >
            <RefreshCw size={14} />
            Seite neu laden
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
