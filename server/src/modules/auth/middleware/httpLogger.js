const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "../../../logs");
const LOG_FILE = path.join(LOG_DIR, "http.log");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function write(level, message) {
  ensureLogDir();
  const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) process.stderr.write(`Logger write failed: ${err.message}\n`);
  });
  process.stdout.write(line);
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return "[Unserializable]";
  }
}

function httpLogger(req, res, next) {
  const { method, url, body } = req;
  const start = Date.now();

  write(
    "HTTP",
    `Incoming Request: ${method} ${url} - Body: ${safeStringify(body)}`,
  );

  res.on("finish", () => {
    const delay = Date.now() - start;
    write(
      "HTTP",
      `Outgoing Response: ${method} ${url} ${res.statusCode} - ${delay}ms`,
    );
  });

  res.on("close", () => {
    if (!res.writableEnded) {
      const delay = Date.now() - start;
      write("ERROR", `Request aborted: ${method} ${url} - ${delay}ms`);
    }
  });

  next();
}

function logError(method, url, err) {
  write(
    "ERROR",
    `Error: ${method} ${url} - ${err.message}${err.stack ? `\n${err.stack}` : ""}`,
  );
}

module.exports = { httpLogger, logError, write };
