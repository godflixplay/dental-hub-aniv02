import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import path from "node:path";

// Config para deploy SSR na Vercel (Node runtime).
// IMPORTANTE: removido o preset @lovable.dev/vite-tanstack-config e o plugin
// do Cloudflare. Isso QUEBRA o preview da Lovable, mas é necessário para o
// build SSR rodar como serverless function Node na Vercel.
//
// Output esperado:
//   dist/client/   -> assets estáticos (servidos pela Vercel CDN)
//   dist/server/   -> bundle SSR (chamado por /api/index.js)
export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
  server: {
    host: "::",
    port: 8080,
  },
});
