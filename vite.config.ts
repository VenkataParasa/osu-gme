import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: { manualChunks: { charts: ["recharts"] } },
      input: {
        landing: resolve(__dirname, "app/index.html"),
        application: resolve(__dirname, "index.html"),
      },
    },
  },
});
