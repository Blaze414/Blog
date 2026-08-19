import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
let stopping = false;
let watcher;

function startWatcher() {
  watcher = spawn(process.execPath, [path.join(root, "scripts/watch-article-imports.mjs")], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  watcher.once("exit", (code, signal) => {
    if (stopping) return;
    console.error(`[dev] Article watcher stopped unexpectedly (${signal ?? code ?? "unknown"}); restarting.`);
    setTimeout(startWatcher, 1000);
  });
}

const site = spawn("npm", ["run", "dev:site"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

function stop(signal) {
  if (stopping) return;
  stopping = true;
  watcher?.kill(signal);
  site.kill(signal);
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => stop(signal));
}

site.once("error", (error) => {
  console.error(`[dev] Could not start the site: ${error.message}`);
  stop("SIGTERM");
  process.exitCode = 1;
});

site.once("exit", (code, signal) => {
  stop("SIGTERM");
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

startWatcher();
