"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const { config } = require("../config");
const { RETENTION } = require("../constants/scores.constants");

const filePath = path.join(config.dataDir, config.dataFile);

/** In-memory mirror of the file, loaded once at boot. */
let records = null;
/** Serialises writes so two finishing players cannot clobber each other. */
let writeChain = Promise.resolve();

async function ensureLoaded() {
  if (records !== null) return;
  await fs.mkdir(config.dataDir, { recursive: true });
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    records = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.warn("[scores] could not read %s (%s) — starting empty", filePath, err.message);
    }
    records = [];
  }
}

/** Atomic write: a temp file in the same directory, then rename. */
async function persist() {
  const tmp = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(records), "utf8");
  await fs.rename(tmp, filePath);
}

async function findAll() {
  await ensureLoaded();
  return records;
}

async function insert(record) {
  await ensureLoaded();
  writeChain = writeChain.then(async () => {
    records.unshift(record);
    if (records.length > RETENTION.MAX_RECORDS) {
      records.length = RETENTION.MAX_RECORDS;
    }
    await persist();
  });
  await writeChain;
  return record;
}

async function clear() {
  await ensureLoaded();
  writeChain = writeChain.then(async () => {
    records = [];
    await persist();
  });
  await writeChain;
}

module.exports = { findAll, insert, clear, filePath };
