import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keep a useful signal in production without leaking sensitive info to UI.
    console.error("App crashed:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The app couldn’t load. This is usually caused by a failed script load or a
            misconfigured build environment.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button onClick={this.handleReload} className="sm:w-auto">
              Reload
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Provide quick debug instructions for non-technical users.
                alert(
                  "Open browser DevTools → Console/Network and look for red errors (failed JS/CSS requests or missing env variables).",
                );
              }}
              className="sm:w-auto"
            >
              How to debug
            </Button>
          </div>

          {import.meta.env.DEV && this.state.error?.message ? (
            <pre className="mt-6 max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs">
              {this.state.error.message}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }
}
