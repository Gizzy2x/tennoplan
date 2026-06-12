import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize density mode on <html> before React renders.
// Side-effect import: the module sets data-density="compact|standard"
// at evaluation time (auto-detected from viewport, or restored from
// localStorage). See src/store/uiSettings.ts.
import "./store/uiSettings";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
