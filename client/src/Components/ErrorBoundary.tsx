import { Component, type ErrorInfo, type ReactNode } from "react";
import "./ErrorBoundary.css";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[Error boundary] Unexpected React error.", error, errorInfo);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-boundary-page" dir="rtl">
          <div className="error-boundary-brand" dir="ltr" aria-label="TripMatch">
            Trip<span>Match</span>
          </div>

          <section
            className="error-boundary-card"
            aria-labelledby="error-boundary-title"
          >
            <div className="error-boundary-icon" aria-hidden="true">
              !
            </div>
            <h1 id="error-boundary-title">משהו השתבש</h1>
            <p>
              אירעה שגיאה בלתי צפויה. אפשר לנסות לטעון את העמוד מחדש.
            </p>
            <button
              className="error-boundary-action"
              type="button"
              onClick={this.handleReload}
            >
              טען מחדש
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
