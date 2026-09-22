"use strict";

const { config } = require("../config");

/**
 * Fixed-window, in-memory write throttle. Enough for one classroom server;
 * swap for Redis if you ever run more than one instance.
 */
function createRateLimiter({ windowMs, maxWrites } = config.rateLimit) {
  const hits = new Map();

  function sweep(now) {
    for (const [key, entry] of hits) {
      if (now - entry.startedAt > windowMs) hits.delete(key);
    }
  }

  return {
    /** @returns {boolean} true when the caller is still within its quota. */
    allow(key) {
      const now = Date.now();
      if (hits.size > 5000) sweep(now);

      const entry = hits.get(key);
      if (!entry || now - entry.startedAt > windowMs) {
        hits.set(key, { startedAt: now, count: 1 });
        return true;
      }
      entry.count += 1;
      return entry.count <= maxWrites;
    },
  };
}

module.exports = { createRateLimiter };
