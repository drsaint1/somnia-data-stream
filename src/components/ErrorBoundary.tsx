// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            fontSize: "18px",
            textAlign: "center",
            padding: "20px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ maxWidth: "600px", width: "100%" }}>
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>🏎️💥</div>

            <h1
              style={{
                fontSize: "32px",
                marginBottom: "16px",
                fontWeight: "bold",
                color: "#fff",
              }}
            >
              Oops! Race Crashed!
            </h1>

            <p
              style={{
                fontSize: "18px",
                opacity: 0.9,
                marginBottom: "24px",
                lineHeight: "1.5",
              }}
            >
              Something went wrong with the racing game. Don't worry - your car
              data is safe on the blockchain!
            </p>

            {this.state.error && (
              <div
                style={{
                  background: "rgba(0,0,0,0.3)",
                  padding: "16px",
                  borderRadius: "8px",
                  marginBottom: "24px",
                  textAlign: "left",
                  fontSize: "14px",
                  fontFamily: "monospace",
                  maxHeight: "200px",
                  overflow: "auto",
                }}
              >
                <details>
                  <summary
                    style={{
                      cursor: "pointer",
                      marginBottom: "8px",
                      color: "#ffd700",
                    }}
                  >
                    Error Details (Click to expand)
                  </summary>
                  <div style={{ color: "#ff6b6b" }}>
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "12px",
                        color: "#ccc",
                      }}
                    >
                      <strong>Stack:</strong>
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          wordWrap: "break-word",
                          marginTop: "4px",
                        }}
                      >
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </details>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={this.handleReset}
                style={{
                  background: "linear-gradient(45deg, #ffd700, #ffed4e)",
                  border: "none",
                  color: "#000",
                  padding: "12px 24px",
                  fontSize: "16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                🔄 Try Again
              </button>

              <button
                onClick={this.handleReload}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "2px solid #fff",
                  color: "#fff",
                  padding: "12px 24px",
                  fontSize: "16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.3)";
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.2)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                🔄 Reload Game
              </button>
            </div>

            <div
              style={{
                marginTop: "32px",
                padding: "16px",
                background: "rgba(0,0,0,0.2)",
                borderRadius: "8px",
                fontSize: "14px",
                opacity: 0.8,
              }}
            >
              <p style={{ margin: "0 0 8px 0" }}>
                <strong>🛡️ Your Data is Safe:</strong>
              </p>
              <ul
                style={{
                  textAlign: "left",
                  margin: 0,
                  paddingLeft: "20px",
                  lineHeight: "1.4",
                }}
              >
                <li>NFT cars are stored on Somnia blockchain</li>
                <li>Race scores are recorded in smart contracts</li>
                <li>Tournament entries are protected</li>
                <li>No data loss from this error</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 rounded-lg p-6 text-center">
        <div className="text-6xl mb-4">🏎️💥</div>
        <h2 className="text-2xl font-bold text-white mb-4">Game Crashed!</h2>
        <p className="text-gray-300 mb-6">
          Something went wrong, but your blockchain data is safe.
        </p>

        <div className="bg-red-900 bg-opacity-50 rounded p-3 mb-6 text-left">
          <p className="text-red-200 text-sm font-mono">{error.message}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={resetError}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded"
          >
            🔄 Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
          >
            🔄 Reload Page
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Your NFT cars and progress are safely stored on Somnia
        </p>
      </div>
    </div>
  );
};

export const useErrorHandler = () => {
  const handleError = (error: Error, errorInfo: { componentStack: string }) => {
    console.error("Game error:", error);
    console.error("Component stack:", errorInfo.componentStack);

    // analytics.track('game_error', { error: error.message, stack: error.stack });
  };

  return { handleError };
};
