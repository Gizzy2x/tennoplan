import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // In local dev, forward /api/worldstate to the warframestat.us flat endpoint.
      // On Vercel, the serverless function at api/worldstate/index.ts handles this.
      '/api/worldstate': {
        target: 'https://api.warframestat.us',
        changeOrigin: true,
        rewrite: () => '/pc',
        secure: true,
      },
    },
  },
});
