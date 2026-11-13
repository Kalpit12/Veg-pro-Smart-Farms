"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback: ReactNode };
type State = { failed: boolean };

/**
 * Keeps a failed lazy chunk (e.g. a map that could not download offline) from
 * crashing the whole field app. Shows `fallback` instead and retries when the
 * device is back online.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidMount() {
    window.addEventListener("online", this.reset);
  }

  componentWillUnmount() {
    window.removeEventListener("online", this.reset);
  }

  reset = () => {
    if (this.state.failed) this.setState({ failed: false });
  };

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
