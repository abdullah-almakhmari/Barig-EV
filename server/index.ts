import express from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { productionErrorHandler } from "./security";

const app = express();
const httpServer = createServer(app);

const isDev = process.env.NODE_ENV !== "production";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: isDev 
          ? ["'self'", "https://*.tile.openstreetmap.org", "wss:", "ws:"] 
          : ["'self'", "https://*.tile.openstreetmap.org"],
        frameAncestors: isDev 
          ? ["'self'", "https://*.replit.dev", "https://*.replit.com", "https://replit.com"] 
          : ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: isDev ? false : { action: "sameorigin" },
  }),
);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

/**
 * Start server explicitly (no auto-start on import).
 */
export async function startServer() {
  await registerRoutes(httpServer, app);

  app.use(productionErrorHandler);

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = Number.parseInt(process.env.PORT ?? "5000", 10);

  return new Promise<void>((resolve, reject) => {
    httpServer.once("error", (err) => reject(err));
    httpServer.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
      resolve();
    });
  });
}

/**
 * Only auto-start when this file is the actual entrypoint.
 * This prevents accidental server start during build scripts that import this module.
 */
const isEntrypoint =
  process.argv[1]?.endsWith("dist/index.cjs") ||
  process.argv[1]?.endsWith("server/index.ts");
if (isEntrypoint) {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { app, httpServer };
