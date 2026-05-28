const { spawn } = require("node:child_process");
const path = require("node:path");
const { readTopology } = require("../lib/topology");

const topology = readTopology();
const serverPath = path.resolve(__dirname, "..", "service", "server.js");
const children = [];

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

function shutdown() {
  for (const child of children) {
    child.kill();
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
