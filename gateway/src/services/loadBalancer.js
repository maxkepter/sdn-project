const http = require("http");
const environment = require("../config/environment");

let backends = environment.backends.map((url) => ({
  url,
  healthy: true,
  consecutiveFailures: 0,
}));

let currentIndex = 0;
let healthCheckTimer = null;
let stoppingHealthChecks = false;

const log = (msg) => {
  console.log(`[loadBalancer] ${msg}`);
};

const getBackend = () => {
  const healthy = backends.filter((b) => b.healthy);
  if (healthy.length === 0) {
    return null;
  }
  const target = healthy[currentIndex % healthy.length];
  currentIndex = (currentIndex + 1) % healthy.length;
  return target.url;
};

const getBackends = () => backends.map((b) => ({
  url: b.url,
  healthy: b.healthy,
  consecutiveFailures: b.consecutiveFailures,
}));

const findBackend = (url) => backends.find((b) => b.url === url);

const markUnhealthy = (url) => {
  const backend = findBackend(url);
  if (!backend) {
    return;
  }
  if (backend.healthy) {
    log(`Marking backend ${url} as UNHEALTHY`);
    backend.healthy = false;
  }
  backend.consecutiveFailures += 1;
};

const markHealthy = (url) => {
  const backend = findBackend(url);
  if (!backend) {
    return;
  }
  if (!backend.healthy) {
    log(`Marking backend ${url} as HEALTHY`);
    backend.healthy = true;
  }
  backend.consecutiveFailures = 0;
};

const probeBackend = (backend, timeoutMs) =>
  new Promise((resolve) => {
    let settled = false;
    try {
      const req = http.get(
        `${backend.url}/health`,
        { timeout: timeoutMs },
        (res) => {
          // Drain the response so the socket can be released.
          res.on("data", () => {});
          res.on("end", () => {
            if (settled) return;
            settled = true;
            resolve({ ok: res.statusCode === 200, statusCode: res.statusCode });
          });
        },
      );
      req.on("timeout", () => {
        if (settled) return;
        settled = true;
        req.destroy(new Error("Request timed out"));
      });
      req.on("error", (err) => {
        if (settled) return;
        settled = true;
        resolve({ ok: false, error: err.message });
      });
    } catch (err) {
      if (settled) return;
      settled = true;
      resolve({ ok: false, error: err.message });
    }
  });

const startHealthChecks = (
  intervalMs = 10000,
  timeoutMs = 3000,
  maxFailures = 2,
) => {
  if (healthCheckTimer) {
    return;
  }
  stoppingHealthChecks = false;
  log(
    `Starting health checks every ${intervalMs}ms (timeout=${timeoutMs}ms, maxFailures=${maxFailures})`,
  );

  const runChecks = async () => {
    if (stoppingHealthChecks) return;
    for (const backend of backends) {
      if (stoppingHealthChecks) return;
      try {
        const result = await probeBackend(backend, timeoutMs);
        if (result.ok) {
          if (!backend.healthy) {
            log(`Backend ${backend.url} is now HEALTHY`);
          }
          backend.healthy = true;
          backend.consecutiveFailures = 0;
        } else {
          backend.consecutiveFailures += 1;
          const reason = result.error
            ? `error: ${result.error}`
            : `status ${result.statusCode}`;
          log(
            `Backend ${backend.url} check failed (${reason}) — ${backend.consecutiveFailures}/${maxFailures}`,
          );
          if (
            backend.healthy &&
            backend.consecutiveFailures >= maxFailures
          ) {
            backend.healthy = false;
            log(`Backend ${backend.url} marked UNHEALTHY after ${maxFailures} failures`);
          }
        }
      } catch (err) {
        backend.consecutiveFailures += 1;
        log(
          `Backend ${backend.url} threw ${err.message} — ${backend.consecutiveFailures}/${maxFailures}`,
        );
        if (
          backend.healthy &&
          backend.consecutiveFailures >= maxFailures
        ) {
          backend.healthy = false;
          log(`Backend ${backend.url} marked UNHEALTHY after ${maxFailures} failures`);
        }
      }
    }
  };

  // Kick off an initial probe so unhealthy backends are detected immediately.
  runChecks();
  healthCheckTimer = setInterval(runChecks, intervalMs);
};

const stopHealthChecks = () => {
  if (!healthCheckTimer) {
    return;
  }
  stoppingHealthChecks = true;
  clearInterval(healthCheckTimer);
  healthCheckTimer = null;
  log("Health checks stopped");
};

module.exports = {
  getBackend,
  getBackends,
  markUnhealthy,
  markHealthy,
  startHealthChecks,
  stopHealthChecks,
};