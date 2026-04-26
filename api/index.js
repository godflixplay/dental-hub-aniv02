// Vercel Serverless Function adapter for TanStack Start SSR.
// Bridges Node IncomingMessage/ServerResponse <-> Web Fetch Request/Response.
//
// IMPORTANT: o caminho do bundle SSR depende de como tanstackStart() emite a
// build. Os caminhos abaixo cobrem as variações conhecidas. Ajuste se o build
// gerar outro nome.

import { createRequire } from "node:module";
import { Readable } from "node:stream";

const require = createRequire(import.meta.url);

let cachedHandler;

async function loadHandler() {
  if (cachedHandler) return cachedHandler;

  const candidates = [
    "../dist/server/server.js",
    "../dist/server/index.js",
    "../.output/server/index.mjs",
  ];

  const errors = [];
  for (const rel of candidates) {
    try {
      const mod = await import(rel);
      const fn = mod.default ?? mod.handler ?? mod.fetch;
      if (typeof fn === "function") {
        cachedHandler = fn;
        return fn;
      }
      errors.push(`${rel}: loaded but no default/handler/fetch export`);
    } catch (err) {
      errors.push(`${rel}: ${err?.message ?? String(err)}`);
    }
  }
  throw new Error(
    `[vercel adapter] SSR handler not found. Tried:\n${errors.join("\n")}`
  );
}

function buildWebRequest(req) {
  const protocol = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
  const url = `${protocol}://${host}${req.url}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else if (value != null) {
      headers.set(key, String(value));
    }
  }

  const method = (req.method ?? "GET").toUpperCase();
  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    init.body = Readable.toWeb(req);
    init.duplex = "half";
  }
  return new Request(url, init);
}

async function sendWebResponse(webRes, res) {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  if (!webRes.body) {
    res.end();
    return;
  }
  const nodeStream = Readable.fromWeb(webRes.body);
  nodeStream.pipe(res);
}

export default async function handler(req, res) {
  try {
    const fetchHandler = await loadHandler();
    const webReq = buildWebRequest(req);
    const webRes = await fetchHandler(webReq);
    await sendWebResponse(webRes, res);
  } catch (err) {
    console.error("[vercel adapter] SSR error", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(`SSR error: ${err?.message ?? "unknown"}`);
  }
}
