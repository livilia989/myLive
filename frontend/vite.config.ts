import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    // 개발 중에는 /api 요청을 backend 로 넘긴다 (CORS 없이 동작)
    proxy: { "/api": `http://localhost:${process.env.API_PORT ?? 8787}` },
  },
});
