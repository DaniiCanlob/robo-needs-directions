"use strict";

const http = require("node:http");

const { config } = require("./src/config");
const { handle } = require("./src/routes");
const { sendError } = require("./src/lib/http");

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error("[server] unhandled error on %s %s:", req.method, req.url, err);
    if (!res.headersSent) {
      sendError(res, 500, "internal_error", "Something went wrong on the server.");
    } else {
      res.end();
    }
  });
});

server.listen(config.port, config.host, () => {
  console.log(`Robo Directions running on http://localhost:${config.port}`);
  console.log(`Scores file: ${config.dataDir}/${config.dataFile}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`\n[server] ${signal} — shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
