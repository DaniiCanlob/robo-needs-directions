"use strict";

const scores = require("./controllers/scores.controller");
const { serveStatic } = require("./lib/static");
const { applyCors, sendError, sendJson } = require("./lib/http");

const ROUTES = [
  { method: "GET", path: "/api/health", handler: (req, res) => sendJson(res, 200, { ok: true }) },
  { method: "GET", path: "/api/scores", handler: scores.listScores },
  { method: "POST", path: "/api/scores", handler: scores.createScore },
  { method: "DELETE", path: "/api/scores", handler: scores.clearScores },
  { method: "GET", path: "/api/leaderboard", handler: scores.getLeaderboard },
];

async function handle(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const matchingPath = ROUTES.filter((r) => r.path === url.pathname);

  if (matchingPath.length > 0) {
    const route = matchingPath.find((r) => r.method === req.method);
    if (!route) {
      const allowed = matchingPath.map((r) => r.method).join(", ");
      res.setHeader("Allow", allowed);
      sendError(res, 405, "method_not_allowed", `Use ${allowed} on ${url.pathname}.`);
      return;
    }
    await route.handler(req, res, url);
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    sendError(res, 404, "not_found", "No such endpoint.");
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    const served = await serveStatic(req, res, url.pathname);
    if (served) return;
  }

  sendError(res, 404, "not_found", "Nothing here.");
}

module.exports = { handle, ROUTES };
