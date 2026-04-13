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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('dexie')) return 'storage';
            if (id.includes('@tanstack')) return 'query';
            return 'vendor';
          }
        },
      },
    },
  },
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
