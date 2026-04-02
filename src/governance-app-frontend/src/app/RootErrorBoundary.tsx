import { Component, type ErrorInfo, type ReactNode } from 'react';

import { analytics } from '@features/analytics/service';
import { AnalyticsEvent } from '@features/analytics/events';
import i18n from '@/i18n/config';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/** Extracts the first component name from a React componentStack string. */
const extractFirstComponent = (componentStack: string): string => {
  const match = /\s+at\s+(\w+)/.exec(componentStack);
  return match?.[1] ?? 'Unknown';
};

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    analytics.event(AnalyticsEvent.FrontendError, {
      error_type: error.name,
      component: extractFirstComponent(errorInfo.componentStack ?? ''),
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-semibold">
            {i18n.t(($) => $.errors.errorBoundary.title)}
          </p>
          <p className="text-sm text-gray-500">
            {i18n.t(($) => $.errors.errorBoundary.description)}
          </p>
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            onClick={() => (window.location.href = '/dashboard')}
          >
            {i18n.t(($) => $.errors.errorBoundary.tryAgain)}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
