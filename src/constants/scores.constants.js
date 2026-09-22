"use strict";

/** Field limits for an incoming score record. */
const SCORE_LIMITS = Object.freeze({
  NAME_MAX_LENGTH: 24,
  ANSWERS_MAX: 500,
  MISTAKES_MAX: 500,
  SECONDS_MAX: 60 * 60 * 6,
  STOPS_MAX: 12,
  STOP_NAME_MAX_LENGTH: 40,
});

/** Pagination defaults and ceilings for the list endpoint. */
const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 200,
});

/** How many records the store keeps before the oldest are dropped. */
const RETENTION = Object.freeze({
  MAX_RECORDS: 5000,
});

const SORT_FIELDS = Object.freeze(["ts", "accuracy", "mistakes", "answers", "seconds"]);
const SORT_ORDERS = Object.freeze(["asc", "desc"]);

module.exports = { SCORE_LIMITS, PAGINATION, RETENTION, SORT_FIELDS, SORT_ORDERS };
