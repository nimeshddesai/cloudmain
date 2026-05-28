const { evaluateHealth } = require("./health-gate");
const {
  findRing,
  readTopology,
  ringKey,
  setRingVersion
} = require("../lib/topology");
const { runCheckout } = require("../synthetic/run-checkout");
const { requestJson } = require("../utils/request-json");

async function main() {
  const targetVersion = process.argv[2] || "v2-bad";
  const topology = readTopology();

  console.log(`[pipeline] starting rollout of ${targetVersion}`);

  for (const key of topology.rolloutOrder) {
    const target = findRing(key);
    const baseUrl = `http://localhost:${target.port}`;
    console.log(`[pipeline] deploying ${targetVersion} to ${ringKey(target)}`);

    await requestJson(`${baseUrl}/admin/metrics/reset`, { method: "POST" });
    setRingVersion(target, targetVersion);

    for (let index = 0; index < topology.healthGate.requiredSyntheticPasses; index += 1) {
      const result = await runCheckout(baseUrl);
      console.log(
        `[synthetic] ${ringKey(target)} checkout ${index + 1}: ${result.ok ? "PASS" : "FAIL"}`
      );
    }

    const metrics = await requestJson(`${baseUrl}/metrics`);
    const gate = evaluateHealth(metrics.body, topology.healthGate);
    if (!gate.healthy) {
      console.log(`[gate] ${ringKey(target)} is unhealthy`);
      for (const failure of gate.failures) {
        console.log(`  - ${failure}`);
      }
      console.log(`[rollback] reverting ${ringKey(target)} to v1`);
      setRingVersion(target, "v1");
      await requestJson(`${baseUrl}/admin/metrics/reset`, { method: "POST" });
      process.exit(1);
    }

    console.log(`[gate] ${ringKey(target)} healthy; proceeding`);
  }

  console.log(`[pipeline] rollout of ${targetVersion} completed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
