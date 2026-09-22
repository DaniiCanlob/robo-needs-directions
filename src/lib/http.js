"use strict";

const { config } = require("../config");

/** Send a JSON response. */
function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

/** Send an error in the shape every endpoint uses. */
function sendError(res, status, code, message) {
  sendJson(res, status, { error: { code, message } });
}

/** Attach permissive CORS headers so the page may be hosted elsewhere. */
function applyCors(req, res) {
  const allowed = config.corsOrigin;
  const origin = req.headers.origin;
  if (allowed === "*") {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin && allowed.split(",").map((s) => s.trim()).includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

/**
 * Read and parse a JSON request body.
 * Rejects with a `status` property so the caller can map it straight to a response.
 */
function readJsonBody(req, maxBytes = config.maxBodyBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        const err = new Error("Request body is too large.");
        err.status = 413;
        err.code = "payload_too_large";
        req.destroy();
        reject(err);
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (parseError) {
        const err = new Error("Body is not valid JSON.");
        err.status = 400;
        err.code = "invalid_json";
        reject(err);
      }
    });

    req.on("error", reject);
  });
}

/** The caller's address, honouring a single proxy hop. */
function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

module.exports = { sendJson, sendError, applyCors, readJsonBody, clientIp };
