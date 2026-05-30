const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const { readTopology } = require("../lib/topology");

const topology = readTopology();
const serverPath = path.resolve(__dirname, "..", "service", "server.js");
const children = [];

async function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function start() {
  const occupied = [];
  for (const target of topology.rings) {
    if (await isPortOpen(target.port)) {
      occupied.push(`${target.region}/${target.ring} on port ${target.port}`);
    }
  }

  if (occupied.length > 0) {
    console.error("[service] demo services appear to be running already:");
    for (const entry of occupied) {
      console.error(`  - ${entry}`);
    }
    console.error("[service] stop the existing services before starting another copy.");
    process.exitCode = 1;
    return;
  }

  for (const target of topology.rings) {
    const child = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        REGION: target.region,
        RING: target.ring,
        PORT: String(target.port),
        CAPACITY_PERCENT: String(target.capacityPercent)
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.stdout.on("data", (data) => process.stdout.write(data));
    child.stderr.on("data", (data) => process.stderr.write(data));
    child.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[service] ${target.region}/${target.ring} exited with ${code}`);
      }
    });
    children.push(child);
  }
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

process.on("SIGINT", () => {
  shutdown();
});

process.on("SIGTERM", () => {
  shutdown();
});

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
