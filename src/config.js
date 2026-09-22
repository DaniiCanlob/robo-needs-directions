"use strict";

const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..");

/** Every environment-driven value the app reads, resolved once. */
const config = Object.freeze({
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || "0.0.0.0",

  publicDir: process.env.PUBLIC_DIR || path.join(ROOT_DIR, "public"),
  dataDir: process.env.DATA_DIR || path.join(ROOT_DIR, "data"),
  dataFile: "scores.json",

  /** Comma-separated list, or "*" to allow any origin. */
  corsOrigin: process.env.CORS_ORIGIN || "*",

  /** Reject bodies larger than this many bytes. */
  maxBodyBytes: Number(process.env.MAX_BODY_BYTES || 8 * 1024),

  /** Per-IP write throttle. */
  rateLimit: Object.freeze({
    windowMs: Number(process.env.RATE_WINDOW_MS || 60_000),
    maxWrites: Number(process.env.RATE_MAX_WRITES || 30),
  }),

  /** Set ADMIN_TOKEN to require it on DELETE /api/scores. */
  adminToken: process.env.ADMIN_TOKEN || "",
});

module.exports = { config, ROOT_DIR };
