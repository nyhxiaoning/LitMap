import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "var(--font-sans, sans-serif)",
          color: "var(--color-text, #1a2624)",
          background: "#f3f7f6",
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>出错了</h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary, #5c6b67)", maxWidth: 400, textAlign: "center" }}>
            应用遇到了意外错误。请刷新页面重试。
          </p>
          {this.state.error && (
            <pre style={{
              fontSize: 11,
              color: "var(--color-accent, #5b8c85)",
              background: "rgba(255,255,255,0.6)",
              padding: "12px 16px",
              borderRadius: 8,
              maxWidth: 500,
              overflow: "auto",
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 20px",
              borderRadius: 20,
              border: "none",
              background: "var(--color-accent, #5b8c85)",
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
