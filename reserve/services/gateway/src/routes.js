// src/routes.js  — CORRECTED
import { createProxyMiddleware } from "http-proxy-middleware";
import { SERVICES } from "./config/services.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { apiRateLimiter } from "./middleware/rateLimit.js";

export function buildRoutes(app) {
  app.use("/api", apiRateLimiter);
  app.use("/api", authMiddleware);

  for (const [name, svc] of Object.entries(SERVICES)) {
    app.use(
      svc.prefix,
      createProxyMiddleware({
        target: svc.url,
        changeOrigin: true,
        pathRewrite: { [`^${svc.prefix}`]: "" },
        on: {
          // v3 uses the `on` object, not top-level onProxyReq.
          proxyReq: (proxyReq, req) => {
            if (req.id) proxyReq.setHeader("X-Request-ID", req.id);
            req.log?.info("proxy.request", {
              target: name,
              path: req.originalUrl,
            });
          },
          error: (err, req, res) => {
            req.log?.error("proxy.error", {
              target: name,
              message: err.message,
            });
            if (!res.headersSent) {
              res.status(502).json({
                error: {
                  message: `Upstream service '${name}' unavailable`,
                  code: "UPSTREAM_UNAVAILABLE",
                },
              });
            }
          },
        },
      }),
    );
  }
}
