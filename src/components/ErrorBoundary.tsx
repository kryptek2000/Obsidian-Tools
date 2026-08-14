import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#FFFFFF] border border-[#E5E5E1] rounded-2xl p-8 shadow-xl text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-xl font-serif font-bold text-[#1A1A1A]">Vault View Recovered</h2>
              <p className="text-xs text-[#5A5A57] mt-1.5 leading-relaxed">
                An unexpected interface issue occurred. Your vault files remain intact in memory.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[#F7F7F4] border border-[#E5E5E1] rounded-xl text-left">
                <code className="text-[11px] font-mono text-[#DC2626] block truncate">
                  {this.state.error.message || String(this.state.error)}
                </code>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#333330] text-[#FCFCF9] text-xs font-semibold cursor-pointer transition-all shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Return to Overview</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-[#FFFFFF] hover:bg-[#F7F7F4] border border-[#E5E5E1] text-[#1A1A1A] text-xs font-medium cursor-pointer transition-all"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

