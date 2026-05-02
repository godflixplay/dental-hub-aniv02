import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";

const isVercelBuild = process.env.VERCEL === "1";

export default defineConfig({
  // Lovable preview precisa do build Cloudflare/Worker para server functions.
  // Vercel continua usando o build SSR Node consumido por api/index.js.
  cloudflare: isVercelBuild ? false : { viteEnvironment: { name: "ssr" } },
  vite: {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "@tanstack/react-router",
        "@tanstack/react-query",
      ],
    },
    server: {
      host: "::",
      port: 8080,
    },
  },
});
