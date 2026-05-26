/**
 * Root error boundary — catches uncaught render errors and routes them to
 * the central event logger so they surface in Settings → Event Log.
 *
 * Without this, a crash inside any feature component blanks the screen with
 * no record of what happened. With this, the user (or the dev) can open
 * Settings, see the exact error + stack, and act on it.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/adapters/logging/logger';

interface Props {
  children: ReactNode;
  /** Optional named scope — included in the log entry to pinpoint where it came from. */
  scope?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('ui', `${error.name}: ${error.message}`, {
      scope:          this.props.scope ?? 'root',
      stack:          error.stack?.split('\n').slice(0, 12).join('\n'),
      componentStack: info.componentStack?.split('\n').slice(0, 8).join('\n'),
    }, 'ErrorBoundary');
  }

  handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="error-boundary-fallback">
        <div className="error-boundary-card">
          <div className="error-boundary-title">Something broke while rendering</div>
          <div className="error-boundary-message">
            {this.state.error.name}: {this.state.error.message}
          </div>
          <div className="error-boundary-hint">
            The error has been recorded in Settings → Event Log. You can try
            recovering without losing your session, or reload the app.
          </div>
          <div className="error-boundary-actions">
            <button onClick={this.handleReset} className="error-boundary-btn">
              Try to recover
            </button>
            <button
              onClick={() => window.location.reload()}
              className="error-boundary-btn error-boundary-btn--ghost"
            >
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
