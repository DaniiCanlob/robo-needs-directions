"use strict";

const service = require("../services/scores.service");
const { config } = require("../config");
const { sendJson, sendError, readJsonBody, clientIp } = require("../lib/http");
const { createRateLimiter } = require("../lib/rate-limit");

const limiter = createRateLimiter();

/** GET /api/scores?page=&limit=&search=&sort=&order= */
async function listScores(req, res, url) {
  const q = url.searchParams;
  const result = await service.list({
    page: q.get("page"),
    limit: q.get("limit"),
    search: q.get("search"),
    sort: q.get("sort"),
    order: q.get("order"),
  });
  sendJson(res, 200, result);
}

/** GET /api/leaderboard?limit= */
async function getLeaderboard(req, res, url) {
  const result = await service.leaderboard({ limit: url.searchParams.get("limit") });
  sendJson(res, 200, result);
}

/** POST /api/scores */
async function createScore(req, res) {
  if (!limiter.allow(clientIp(req))) {
    sendError(res, 429, "rate_limited", "Too many scores from this address. Try again shortly.");
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendError(res, err.status || 400, err.code || "invalid_json", err.message);
    return;
  }

  try {
    const record = await service.create(body);
    sendJson(res, 201, record);
  } catch (err) {
    if (err instanceof service.ValidationError) {
      sendError(res, err.status, err.code, err.message);
      return;
    }
    throw err;
  }
}

/** DELETE /api/scores — guarded by ADMIN_TOKEN when one is set. */
async function clearScores(req, res) {
  if (config.adminToken) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (token !== config.adminToken) {
      sendError(res, 401, "unauthorized", "A valid admin token is required.");
      return;
    }
  }
  await service.clear();
  sendJson(res, 200, { cleared: true });
}

module.exports = { listScores, getLeaderboard, createScore, clearScores };
