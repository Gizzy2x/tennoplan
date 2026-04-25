import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./components/layout/AppShell";
import { queryClient } from "./lib/queryClient";
import { initMockData } from "./lib/mockdata/init";

export default function App() {
  useEffect(() => {
    // Initialize mock data if enabled in .env.development
    initMockData().catch(err => console.error("Mock data init failed:", err));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
