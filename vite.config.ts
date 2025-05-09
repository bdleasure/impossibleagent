import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import historyFallback from "./vite-history-fallback";

export default defineConfig({
  plugins: [cloudflare(), react(), tailwindcss(), historyFallback()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8080,
    host: true,
    fs: {
      strict: true,
    },
  },
});
