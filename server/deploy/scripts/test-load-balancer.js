#!/usr/bin/env node
/**
 * test-load-balancer.js
 * --------------------------------------------------------------------
 * Lightweight load balancer test harness for the sdn-project Kubernetes
 * deployment. Hammers an HTTP endpoint (by default
 * http://localhost:8080/api/v1/categories/products) through the
 * ingress-nginx controller for a configurable duration, aggregates
 * latency and per-backend-pod attribution, and prints a human-readable
 * report.
 *
 * The backend /health route returns the pod hostname in the response
 * body and as the `X-Backend-Instance` response header, which is what
 * this script uses to count requests per pod.
 *
 * Pure Node built-ins — no extra dependencies required.
 *
 * Usage:
 *   node test-load-balancer.js [options]
 *
 *   --url <url>           Target URL (default: http://localhost:8080/api/v1/categories/products)
 *   --path <path>         Override path on default base; ignored if --url is given
 *   --duration <seconds>  Total wall-clock duration        (default: 10)
 *   --concurrency <n>     Parallel workers                  (default: 10)
 *   --rps <n>             Per-worker target RPS (throttle). Omit for fire-and-forget.
 *   --timeout <ms>        Per-request timeout               (default: 5000)
 *   -h, --help            Show this help
 *
 * Memory caps (to keep memory bounded on long runs):
 *   - results[] is capped at 5000 entries (FIFO).
 *   - per-pod latency arrays are capped at 100000 entries (FIFO).
 *
 * Notes:
 *   - The 500/15min rate limit on the backend applies per IP. Default
 *     settings (10s, c=10, unlimited RPS) stay well under that. If you
 *     push much harder, expect 429s to dominate the report.
 *   - Connections are kept alive (HTTP keep-alive) so the underlying TCP
 *     socket is reused across requests. This avoids saturating the
 *     single-threaded `kubectl port-forward` bottleneck when running the
 *     test through a port-forwarded ingress-nginx.
 *   - The script does NOT parse the response body; it only reads status
 *     code and the `X-Backend-Instance` header.
 */

"use strict";

const http = require("http");
const https = require("https");
const { URL } = require("url");

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS = {
  base: "http://localhost:8080",
  defaultPath: "/api/v1/categories/products",
  defaultUrl: "http://localhost:8080/api/v1/categories/products",
  duration: 10,
  concurrency: 10,
  rps: null,
  timeout: 5000,
};

const MAX_RESULTS = 5000;
const MAX_LATENCIES_PER_POD = 100000;

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function printHelp() {
  const lines = [
    "Usage: node test-load-balancer.js [options]",
    "",
    "  --url <url>           Target URL (default: " + DEFAULTS.defaultUrl + ")",
    "  --path <path>         Override path on default base; ignored if --url is given",
    "  --duration <seconds>  Total wall-clock duration        (default: " + DEFAULTS.duration + ")",
    "  --concurrency <n>     Parallel workers                  (default: " + DEFAULTS.concurrency + ")",
    "  --rps <n>             Per-worker target RPS (throttle). Omit for fire-and-forget.",
    "  --timeout <ms>        Per-request timeout               (default: " + DEFAULTS.timeout + ")",
    "  -h, --help            Show this help",
    "",
    "Examples:",
    "  node test-load-balancer.js",
    "  node test-load-balancer.js --duration 30 --concurrency 20 --rps 50",
    "  node test-load-balancer.js --url http://localhost:8080/health --duration 5",
  ];
  process.stdout.write(lines.join("\n") + "\n");
}

function parseArgs(argv) {
  const args = {
    url: null,
    path: null,
    duration: DEFAULTS.duration,
    concurrency: DEFAULTS.concurrency,
    rps: DEFAULTS.rps,
    timeout: DEFAULTS.timeout,
    showHelp: false,
  };

  const needValue = (flag, val) => {
    if (val === undefined) {
      process.stderr.write("ERROR: missing value for " + flag + "\n");
      process.exit(2);
    }
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "-h":
      case "--help":
        args.showHelp = true;
        break;
      case "--url":
        needValue(a, argv[i + 1]);
        args.url = argv[++i];
        break;
      case "--path":
        needValue(a, argv[i + 1]);
        args.path = argv[++i];
        break;
      case "--duration":
        needValue(a, argv[i + 1]);
        args.duration = parseFloat(argv[++i]);
        break;
      case "--concurrency":
        needValue(a, argv[i + 1]);
        args.concurrency = parseInt(argv[++i], 10);
        break;
      case "--rps":
        needValue(a, argv[i + 1]);
        args.rps = parseFloat(argv[++i]);
        break;
      case "--timeout":
        needValue(a, argv[i + 1]);
        args.timeout = parseInt(argv[++i], 10);
        break;
      default:
        process.stderr.write("ERROR: unknown option: " + a + "\n");
        process.exit(2);
    }
  }

  // Final URL resolution.
  if (!args.url) {
    args.url = DEFAULTS.base + (args.path || DEFAULTS.defaultPath);
  } else if (args.path) {
    process.stderr.write(
      "WARN: --path is ignored because --url was provided\n",
    );
  }

  // Validation.
  if (!(args.duration > 0)) {
    process.stderr.write("ERROR: --duration must be > 0\n");
    process.exit(2);
  }
  if (!(args.concurrency >= 1)) {
    process.stderr.write("ERROR: --concurrency must be >= 1\n");
    process.exit(2);
  }
  if (!(args.timeout > 0)) {
    process.stderr.write("ERROR: --timeout must be > 0\n");
    process.exit(2);
  }
  if (args.rps !== null && !(args.rps > 0)) {
    process.stderr.write("ERROR: --rps must be > 0 (omit to disable throttle)\n");
    process.exit(2);
  }

  return args;
}

// ---------------------------------------------------------------------------
// Aggregator
// ---------------------------------------------------------------------------

function createCtx(durationMs) {
  return {
    startedAt: Date.now(),
    deadline: Date.now() + durationMs,
    results: [],
    perPod: new Map(),
    counts: { total: 0, ok2xx: 0, non2xx: 0, errors: 0 },
    stopRequested: false,
  };
}

function record(ctx, result) {
  ctx.counts.total++;

  const status = result.status || 0;
  const isErr = !!result.err;
  if (isErr) {
    ctx.counts.errors++;
  } else if (status >= 200 && status < 300) {
    ctx.counts.ok2xx++;
  } else {
    ctx.counts.non2xx++;
  }

  const pod = result.instance || "(unknown)";
  let agg = ctx.perPod.get(pod);
  if (!agg) {
    agg = { count: 0, errors: 0, latencies: [] };
    ctx.perPod.set(pod, agg);
  }
  agg.count++;
  if (isErr || status >= 500 || status === 0) {
    agg.errors++;
  }
  agg.latencies.push(result.ms);
  if (agg.latencies.length > MAX_LATENCIES_PER_POD) {
    agg.latencies.splice(0, agg.latencies.length - MAX_LATENCIES_PER_POD);
  }

  ctx.results.push(result);
  if (ctx.results.length > MAX_RESULTS) {
    ctx.results.splice(0, ctx.results.length - MAX_RESULTS);
  }
}

// ---------------------------------------------------------------------------
// Request function
// ---------------------------------------------------------------------------

function doRequest(target, timeoutMs) {
  const lib = target.protocol === "https:" ? https : http;
  return new Promise((resolve) => {
    const t0 = process.hrtime.bigint();
    const req = lib.request(
      {
        method: "GET",
        hostname: target.hostname,
        port:
          target.port ||
          (target.protocol === "https:" ? 443 : 80),
        path: (target.pathname || "/") + (target.search || ""),
        headers: {
          "User-Agent": "sdn-loadtest/1.0",
          Connection: "keep-alive",
          Accept: "application/json",
        },
      },
      (res) => {
        // Drain body so the socket can be released without buffering.
        res.resume();
        const t1 = process.hrtime.bigint();
        const rawInstance =
          res.headers["x-backend-instance"] ||
          res.headers["X-Backend-Instance"] ||
          null;
        resolve({
          status: res.statusCode,
          ms: Number(t1 - t0) / 1e6,
          err: null,
          instance: rawInstance,
          ts: Date.now(),
        });
      },
    );

    req.on("error", (err) => {
      const t1 = process.hrtime.bigint();
      resolve({
        status: 0,
        ms: Number(t1 - t0) / 1e6,
        err: err.message || String(err),
        instance: null,
        ts: Date.now(),
      });
    });

    req.setTimeout(timeoutMs, () => {
      // Destroy with an Error so the 'error' handler fires consistently.
      try {
        req.destroy(new Error("timeout"));
      } catch (_) {
        // ignore
      }
    });
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Worker loop
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function workerLoop(workerId, ctx, target, timeoutMs, rps) {
  // Cheap per-worker throttle: maintain a "next allowed" timestamp.
  const intervalMs = rps ? 1000 / rps : 0;
  let nextAt = Date.now();

  while (!ctx.stopRequested && Date.now() < ctx.deadline) {
    if (intervalMs > 0) {
      const now = Date.now();
      const wait = nextAt - now;
      if (wait > 0) {
        await sleep(wait);
      }
      nextAt += intervalMs;
      // If we fell far behind, reset the schedule so we don't burst.
      if (nextAt < Date.now() - 100) {
        nextAt = Date.now() + intervalMs;
      }
    }
    const result = await doRequest(target, timeoutMs);
    record(ctx, result);
  }
  return workerId;
}

// ---------------------------------------------------------------------------
// Progress ticker
// ---------------------------------------------------------------------------

function startTicker(ctx, isTTY) {
  let stopped = false;
  const iv = setInterval(() => {
    if (stopped) return;
    const elapsed = ((Date.now() - ctx.startedAt) / 1000).toFixed(1);
    const c = ctx.counts;
    const totalSec = (Date.now() - ctx.startedAt) / 1000;
    const rps = totalSec > 0 ? (c.total / totalSec).toFixed(1) : "0.0";
    const line =
      "[" +
      elapsed +
      "s] reqs=" +
      c.total +
      " 2xx=" +
      c.ok2xx +
      " non2xx=" +
      c.non2xx +
      " err=" +
      c.errors +
      " rps=" +
      rps +
      " pods=" +
      ctx.perPod.size;

    if (isTTY) {
      // Pad and overwrite the same line.
      process.stdout.write("\r" + line.padEnd(80, " "));
    } else {
      process.stdout.write(line + "\n");
    }

    if (Date.now() >= ctx.deadline && !ctx.stopRequested) {
      // Let the next tick naturally fall; the main loop will stop us.
    }
  }, 1000);
  return {
    stop() {
      stopped = true;
      clearInterval(iv);
    },
  };
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function attachShutdown(ctx) {
  let triggered = false;
  const handler = () => {
    if (triggered) {
      // Second Ctrl-C: hard exit.
      process.stderr.write("\nForce exit.\n");
      process.exit(130);
    }
    triggered = true;
    ctx.stopRequested = true;
    ctx.deadline = Date.now();
    process.stdout.write("\n==> Interrupted — flushing partial report...\n");
  };
  process.on("SIGINT", handler);
  process.on("SIGTERM", handler);
}

// ---------------------------------------------------------------------------
// Report builder
// ---------------------------------------------------------------------------

function pct(sortedArr, q) {
  if (sortedArr.length === 0) return 0;
  const i = Math.min(sortedArr.length - 1, Math.floor(q * sortedArr.length));
  return sortedArr[i];
}

function summarise(arr) {
  if (arr.length === 0) {
    return { min: 0, p50: 0, p95: 0, p99: 0, max: 0, mean: 0 };
  }
  const sorted = arr.slice().sort((a, b) => a - b);
  let sum = 0;
  for (const v of arr) sum += v;
  return {
    min: sorted[0],
    p50: pct(sorted, 0.5),
    p95: pct(sorted, 0.95),
    p99: pct(sorted, 0.99),
    max: sorted[sorted.length - 1],
    mean: sum / arr.length,
  };
}

function buildReport(ctx, opts) {
  const elapsedMs = Date.now() - ctx.startedAt;
  const totalSec = elapsedMs / 1000;
  const wallRps = totalSec > 0 ? ctx.counts.total / totalSec : 0;

  // Overall latency: ignore pure network errors (status 0 + err set).
  const okLatencies = [];
  for (const r of ctx.results) {
    if (!r.err && r.status >= 200 && r.status < 300) {
      okLatencies.push(r.ms);
    }
  }

  const pods = [];
  for (const [name, agg] of ctx.perPod.entries()) {
    pods.push({
      name,
      count: agg.count,
      errors: agg.errors,
      pct: ctx.counts.total > 0 ? (agg.count / ctx.counts.total) * 100 : 0,
      ...summarise(agg.latencies),
    });
  }
  pods.sort((a, b) => b.count - a.count);

  const slow = ctx.results
    .slice()
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 5);

  return {
    opts,
    elapsedMs,
    wallRps,
    counts: ctx.counts,
    overall: summarise(okLatencies),
    pods,
    distinctPods: ctx.perPod.size,
    slow,
  };
}

// ---------------------------------------------------------------------------
// Report printer
// ---------------------------------------------------------------------------

function pad(s, w, align) {
  s = String(s);
  if (s.length >= w) return s.slice(0, w);
  const fill = " ".repeat(w - s.length);
  return align === "right" ? fill + s : s + fill;
}

function fmtMs(n) {
  return n.toFixed(1);
}

function printReport(report) {
  const lines = [];
  const w = 72;
  const sep = "=".repeat(w);
  const sub = "-".repeat(w);

  lines.push(sep);
  lines.push(" LOAD-BALANCER TEST REPORT");
  lines.push(sep);
  lines.push(" URL:           " + report.opts.url);
  lines.push(
    " Duration:      " +
      (report.elapsedMs / 1000).toFixed(2) +
      " s (requested " +
      report.opts.duration +
      "s)",
  );
  lines.push(" Concurrency:   " + report.opts.concurrency);
  lines.push(
    " RPS limit:     " +
      (report.opts.rps ? report.opts.rps + " /worker" : "(unlimited)"),
  );
  lines.push(" Timeout:       " + report.opts.timeout + " ms");
  lines.push("");

  lines.push(sub);
  lines.push(" Totals");
  lines.push(sub);
  const c = report.counts;
  const pct = (n) =>
    report.counts.total > 0 ? ((n / report.counts.total) * 100).toFixed(1) + "%" : "0.0%";
  lines.push(" Total requests:    " + c.total);
  lines.push(" 2xx success:       " + pad(c.ok2xx, 6) + "  (" + pct(c.ok2xx) + ")");
  lines.push(" Non-2xx:           " + pad(c.non2xx, 6) + "  (" + pct(c.non2xx) + ")");
  lines.push(" Errors/timeout:   " + pad(c.errors, 6) + "  (" + pct(c.errors) + ")");
  lines.push(" Wall-clock:        " + (report.elapsedMs / 1000).toFixed(2) + " s");
  lines.push(" Achieved RPS:      " + report.wallRps.toFixed(1));
  lines.push("");

  lines.push(sub);
  lines.push(" Latency (ms) — 2xx responses only");
  lines.push(sub);
  const o = report.overall;
  lines.push(
    "   min     p50     p95     p99     max    mean",
  );
  lines.push(
    "  " +
      pad(fmtMs(o.min), 6, "right") +
      pad(fmtMs(o.p50), 7, "right") +
      pad(fmtMs(o.p95), 7, "right") +
      pad(fmtMs(o.p99), 7, "right") +
      pad(fmtMs(o.max), 7, "right") +
      pad(fmtMs(o.mean), 8, "right"),
  );
  lines.push("");

  lines.push(sub);
  lines.push(" Per-pod breakdown");
  lines.push(sub);
  lines.push(
    " " +
      pad("hostname", 30) +
      pad("reqs", 8, "right") +
      pad("%", 8, "right") +
      pad("errs", 6, "right") +
      pad("p50", 8, "right") +
      pad("p95", 8, "right"),
  );

  const maxPodCount = report.pods.length > 0 ? report.pods[0].count : 0;
  for (const pod of report.pods) {
    lines.push(
      " " +
        pad(pod.name, 30) +
        pad(pod.count, 8, "right") +
        pad(pod.pct.toFixed(1) + "%", 8, "right") +
        pad(pod.errors, 6, "right") +
        pad(fmtMs(pod.p50), 8, "right") +
        pad(fmtMs(pod.p95), 8, "right"),
    );
  }
  lines.push("");

  // ASCII bar chart
  if (report.pods.length > 0 && maxPodCount > 0) {
    lines.push(" Distribution:");
    const barWidth = 40;
    for (const pod of report.pods) {
      const filled = Math.max(0, Math.round((pod.count / maxPodCount) * barWidth));
      const bar = "#".repeat(filled) + " ".repeat(barWidth - filled);
      lines.push(
        " " + pad(pod.name, 30) + " |" + bar + "| " + pod.count,
      );
    }
    lines.push("");
  }

  // Top slow
  lines.push(sub);
  lines.push(" Top 5 slowest requests");
  lines.push(sub);
  if (report.slow.length === 0) {
    lines.push(" (no requests completed)");
  } else {
    for (const r of report.slow) {
      const inst = r.instance || "(unknown)";
      const status = r.status || (r.err ? "ERR" : "?");
      lines.push(
        "  " +
          pad(fmtMs(r.ms) + " ms", 12, "right") +
          " status=" +
          pad(status, 4) +
          " instance=" +
          inst +
          (r.err ? "  err=" + r.err : ""),
      );
    }
  }
  lines.push("");

  // Verdict
  lines.push(sep);
  lines.push(" VERDICT");
  lines.push(sep);
  if (c.total === 0) {
    lines.push("  ! WARN: no requests completed. Check --url and ingress/port-forward.");
  } else if (report.distinctPods === 1 && report.pods[0].name !== "(unknown)") {
    lines.push(
      "  ! WARN: all " +
        c.total +
        " requests went to a single pod (" +
        report.pods[0].name +
        ").",
    );
    lines.push("          Ingress may not be load balancing. Check:");
    lines.push("            - kubectl -n sdn get endpoints sdn-backend");
    lines.push("            - kubectl -n sdn describe ingress sdn-ingress");
    lines.push("            - nginx.ingress.kubernetes.io/load-balance annotation");
  } else if (report.distinctPods === 1 && report.pods[0].name === "(unknown)") {
    lines.push(
      "  ! WARN: no X-Backend-Instance header returned. Backend may not be reached.",
    );
    lines.push("          Curl the URL manually and verify the response headers.");
  } else if (c.errors / c.total > 0.1) {
    lines.push(
      "  ! WARN: error rate is " +
        ((c.errors / c.total) * 100).toFixed(1) +
        "%. Inspect backend logs.",
    );
  } else {
    lines.push(
      "  -> OK: requests spread across " +
        report.distinctPods +
        " distinct backend pod(s).",
    );
  }
  lines.push(sep);

  process.stdout.write(lines.join("\n") + "\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.showHelp) {
    printHelp();
    return;
  }

  let target;
  try {
    target = new URL(args.url);
  } catch (e) {
    process.stderr.write("ERROR: invalid --url: " + args.url + "\n");
    process.exit(2);
  }

  const durationMs = args.duration * 1000;
  const ctx = createCtx(durationMs);

  attachShutdown(ctx);

  const ticker = startTicker(ctx, !!process.stdout.isTTY);
  process.stdout.write(
    "==> target=" + args.url + " duration=" + args.duration + "s" +
      " concurrency=" + args.concurrency +
      (args.rps ? " rps=" + args.rps : " rps=unlimited") +
      " timeout=" + args.timeout + "ms\n",
  );

  const workers = [];
  for (let i = 0; i < args.concurrency; i++) {
    workers.push(workerLoop(i, ctx, target, args.timeout, args.rps));
  }
  await Promise.all(workers);

  ticker.stop();
  if (process.stdout.isTTY) {
    // Make sure the next line starts cleanly after the in-place ticker.
    process.stdout.write("\n");
  }

  const report = buildReport(ctx, args);
  printReport(report);
}

main().catch((err) => {
  process.stderr.write("FATAL: " + (err && err.stack ? err.stack : String(err)) + "\n");
  process.exit(2);
});
