import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const ua = "Mozilla/5.0 (compatible; HouseholdCFO/1.0)";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    proxy: {
      "/api/yahoo2": {
        target: "https://query2.finance.yahoo.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo2/, ""),
        headers: { "User-Agent": ua },
      },
      "/api/yahoo": {
        target: "https://query1.finance.yahoo.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ""),
        headers: { "User-Agent": ua },
      },
      "/api/nasdaq": {
        target: "https://api.nasdaq.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nasdaq/, ""),
        headers: {
          "User-Agent": ua,
          Accept: "application/json",
        },
      },
    },
  },
});
