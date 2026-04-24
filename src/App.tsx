import { QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./components/layout/AppShell";
import { ThemeEditor } from "./components/dev/ThemeEditor";
import { queryClient } from "./lib/queryClient";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
      <ThemeEditor />
    </QueryClientProvider>
  );
}
