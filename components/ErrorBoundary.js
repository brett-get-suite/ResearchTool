'use client';

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-6 flex flex-col items-center gap-3 text-center">
          <span className="material-symbols-outlined text-[32px] text-secondary/40">error_outline</span>
          <p className="text-sm text-secondary font-label">This section couldn't load.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="pill-btn-secondary text-xs"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
