import React from "react";

/**
 * Lightweight route-level error boundary.
 * Prevents a single render error from blanking the entire app.
 * Logs to console in dev; in production renders an inline recoverable card.
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
        return { error };
    }
    componentDidCatch(error, info) {
        // eslint-disable-next-line no-console
        console.error("[ErrorBoundary]", error, info);
    }
    handleReset = () => {
        this.setState({ error: null });
        if (typeof window !== "undefined") window.location.reload();
    };
    render() {
        if (this.state.error) {
            return (
                <div className="min-h-[60vh] flex items-center justify-center p-6" data-testid="error-boundary">
                    <div className="max-w-lg rounded-md border border-amber-500/30 bg-amber-500/5 p-6">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
                            Something went sideways
                        </p>
                        <h2 className="font-heading mt-2 text-xl font-semibold text-white">
                            We couldn't render this page.
                        </h2>
                        <p className="mt-2 text-sm text-slate-300">
                            {String(this.state.error?.message || this.state.error || "Unknown error")}
                        </p>
                        <button
                            onClick={this.handleReset}
                            data-testid="error-boundary-reload"
                            className="mt-4 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-cyan-400"
                        >
                            Reload page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
