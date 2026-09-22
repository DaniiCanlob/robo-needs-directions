"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const { config } = require("../config");

const MIME_TYPES = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
});

/**
 * Serve a file from the public directory.
 * @returns {Promise<boolean>} false when nothing matched, so the caller can 404.
 */
async function serveStatic(req, res, pathname) {
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const resolved = path.resolve(config.publicDir, relative);

  // never escape the public directory
  if (resolved !== config.publicDir && !resolved.startsWith(config.publicDir + path.sep)) {
    return false;
  }

  let stat;
  try {
    stat = await fsp.stat(resolved);
  } catch {
    return false;
  }
  if (stat.isDirectory()) return serveStatic(req, res, path.posix.join(pathname, "index.html"));

  const ext = path.extname(resolved).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    "Content-Length": stat.size,
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
  });

  if (req.method === "HEAD") {
    res.end();
    return true;
  }

  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(resolved);
    stream.on("error", reject);
    stream.on("end", resolve);
    stream.pipe(res);
  });
  return true;
}

module.exports = { serveStatic };
