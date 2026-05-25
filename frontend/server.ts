import express from "express";
import path from "path";
import { Readable } from "stream";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PY_BACKEND_URL = process.env.PY_BACKEND_URL || "http://localhost:8000";

app.use("/api/py", async (req, res) => {
  try {
    const targetPath = req.originalUrl.replace(/^\/api\/py/, "");
    const targetUrl = `${PY_BACKEND_URL}${targetPath}`;
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (!value || key.toLowerCase() === "host") continue;
      headers.set(key, Array.isArray(value) ? value.join(",") : value);
    }

    const chunks: Buffer[] = [];
    if (req.method !== "GET" && req.method !== "HEAD") {
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
    }

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "content-encoding") {
        res.setHeader(key, value);
      }
    });

    if (!upstream.body) {
      res.end();
      return;
    }

    Readable.fromWeb(upstream.body as any).pipe(res);
  } catch (error) {
    console.error("Python backend proxy failed:", error);
    res.status(502).json({ error: "Python backend is not reachable." });
  }
});

app.use(express.json());

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Frontend running on http://localhost:${PORT}`);
    console.log(`Proxying /api/py/* to ${PY_BACKEND_URL}`);
  });
}

startServer();
