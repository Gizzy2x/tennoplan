import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // During `npm run dev`, API calls to /api/* won't be available.
  // Use `vercel dev` for full-stack local development (runs both Vite + serverless functions).
  // For frontend-only work, the useWorldState hook falls back to predictive math automatically.
});
