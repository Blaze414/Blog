"use client";

import { Component, type ReactNode } from "react";

type DocumentViewerErrorBoundaryProps = {
  children: ReactNode;
  onError: () => void;
  resetKey: string;
};

type DocumentViewerErrorBoundaryState = {
  failed: boolean;
};

/** Contains parser or lazy-chunk failures so one attachment cannot crash an article. */
export class DocumentViewerErrorBoundary extends Component<
  DocumentViewerErrorBoundaryProps,
  DocumentViewerErrorBoundaryState
> {
  state: DocumentViewerErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): DocumentViewerErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  componentDidUpdate(previousProps: DocumentViewerErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
