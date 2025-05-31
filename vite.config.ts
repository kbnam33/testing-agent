import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "src/client"),
  base: "/",
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:3001",
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true
      }
    }
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true
  }
});
