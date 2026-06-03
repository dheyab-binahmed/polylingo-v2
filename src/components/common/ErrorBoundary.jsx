import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 300,
            padding: 32,
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--text-base)" }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </div>
          <button
            className="btn-coral"
            onClick={() => this.setState({ error: null })}
            style={{ padding: "8px 20px" }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
