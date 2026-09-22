"use strict";

const crypto = require("node:crypto");

const repository = require("../repositories/scores.repository");
const {
  SCORE_LIMITS,
  PAGINATION,
  SORT_FIELDS,
  SORT_ORDERS,
} = require("../constants/scores.constants");

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
    this.code = "invalid_score";
  }
}

function clampInt(value, min, max, fallback) {
  // URLSearchParams.get() yields null for a missing key, and Number(null) is 0
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function accuracyOf(answers, correct) {
  return answers > 0 ? Math.round((correct / answers) * 100) : 0;
}

/** Validate and normalise a record posted by the game. */
function normalise(input) {
  if (!input || typeof input !== "object") {
    throw new ValidationError("A score object is required.");
  }

  const name = String(input.name ?? "").trim().slice(0, SCORE_LIMITS.NAME_MAX_LENGTH);
  if (name.length === 0) throw new ValidationError("A player name is required.");

  const answers = clampInt(input.answers, 0, SCORE_LIMITS.ANSWERS_MAX, 0);
  const mistakes = clampInt(input.mistakes, 0, SCORE_LIMITS.MISTAKES_MAX, 0);
  const correct = clampInt(input.correct, 0, answers, Math.max(0, answers - mistakes));
  const seconds = clampInt(input.seconds, 0, SCORE_LIMITS.SECONDS_MAX, 0);

  const stops = Array.isArray(input.stops)
    ? input.stops
        .slice(0, SCORE_LIMITS.STOPS_MAX)
        .map((s) => String(s).slice(0, SCORE_LIMITS.STOP_NAME_MAX_LENGTH))
    : [];

  return {
    id: crypto.randomUUID(),
    name,
    nameKey: name.toLowerCase(),
    answers,
    correct,
    mistakes,
    accuracy: accuracyOf(answers, correct),
    seconds,
    stops,
    ts: Date.now(),
  };
}

async function create(input) {
  return repository.insert(normalise(input));
}

/**
 * Paginated, searchable list of games — newest first by default.
 * @returns {{items: object[], page: number, limit: number, total: number, totalPages: number}}
 */
async function list({ page, limit, search, sort, order } = {}) {
  const all = await repository.findAll();

  const term = String(search ?? "").trim().toLowerCase();
  const filtered = term
    ? all.filter((r) => r.nameKey.includes(term) || r.name.toLowerCase().includes(term))
    : all;

  const sortField = SORT_FIELDS.includes(sort) ? sort : "ts";
  const sortOrder = SORT_ORDERS.includes(order) ? order : "desc";
  const direction = sortOrder === "asc" ? 1 : -1;
  const sorted = filtered
    .slice()
    .sort((a, b) => ((a[sortField] ?? 0) - (b[sortField] ?? 0)) * direction);

  const safeLimit = clampInt(limit, 1, PAGINATION.MAX_LIMIT, PAGINATION.DEFAULT_LIMIT);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = clampInt(page, 1, totalPages, PAGINATION.DEFAULT_PAGE);
  const start = (safePage - 1) * safeLimit;

  return {
    items: sorted.slice(start, start + safeLimit),
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
  };
}

/** Per-player aggregate, best score first. */
async function leaderboard({ limit } = {}) {
  const all = await repository.findAll();
  const byPlayer = new Map();

  for (const r of all) {
    const entry = byPlayer.get(r.nameKey) ?? {
      name: r.name,
      games: 0,
      bestAccuracy: 0,
      totalMistakes: 0,
      totalAnswers: 0,
      lastPlayedAt: 0,
    };
    entry.games += 1;
    entry.totalMistakes += r.mistakes;
    entry.totalAnswers += r.answers;
    entry.bestAccuracy = Math.max(entry.bestAccuracy, r.accuracy);
    entry.lastPlayedAt = Math.max(entry.lastPlayedAt, r.ts);
    byPlayer.set(r.nameKey, entry);
  }

  const players = [...byPlayer.values()].sort(
    (a, b) => b.bestAccuracy - a.bestAccuracy || a.totalMistakes - b.totalMistakes,
  );

  const safeLimit = clampInt(limit, 1, PAGINATION.MAX_LIMIT, PAGINATION.DEFAULT_LIMIT);
  return {
    players: players.slice(0, safeLimit),
    totalPlayers: players.length,
    totalGames: all.length,
  };
}

async function clear() {
  await repository.clear();
}

module.exports = { create, list, leaderboard, clear, ValidationError };
