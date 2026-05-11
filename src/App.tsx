import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./components/layout/AppShell";
import { queryClient } from "./lib/queryClient";
import { initMockData } from "./lib/mockdata/init";
import { startupIconSync } from "./adapters/assets/startupIconSync";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { logger } from "./adapters/logging/logger";

export default function App() {
  useEffect(() => {
    logger.info('system', 'Application started', {
      userAgent: navigator.userAgent,
      isTauri:   '__TAURI_INTERNALS__' in window,
      time:      new Date().toISOString(),
    }, 'App');

    initMockData().catch(err =>
      logger.error('system', 'Mock data init failed', err, 'App'),
    );
    // Download all wiki icons at startup — Alecaframe-style bulk preload.
    // Runs in background; app is fully usable immediately. Icons pop in as
    // each resolves. Subsequent launches skip already-cached items instantly.
    startupIconSync();
  }, []);

  return (
    <ErrorBoundary scope="app-root">
      <QueryClientProvider client={queryClient}>
        <AppShell />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
