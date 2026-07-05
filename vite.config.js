import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Deploy base: "/" locally and on Vercel; the GitHub Pages workflow sets
  // VITE_BASE_PATH=/Earth_Echoes_v2/ so the app works from a subpath.
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          globe: ["globe.gl"],
        },
      },
    },
  },
});
