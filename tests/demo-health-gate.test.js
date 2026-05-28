const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateHealth } = require("../demo/pipeline/health-gate");

const criteria = {
  minimumRequestsPerApi: 3,
  minimumSuccessRate: 0.99,
  maximumP95LatencyMs: 750,
  requiredSyntheticPasses: 3
};

function healthyMetrics() {
  return {
    api: {
      GetItem: { requests: 3, successRate: 1, p95LatencyMs: 20 },
      AddItemToCart: { requests: 3, successRate: 1, p95LatencyMs: 30 },
      PurchaseItem: { requests: 3, successRate: 1, p95LatencyMs: 50 }
    },
    synthetic: { checkoutPass: 3, checkoutFail: 0 },
    dependency: { dbWriteFailures: 0 }
  };
}

test("health gate passes when all API and synthetic metrics are healthy", () => {
  const result = evaluateHealth(healthyMetrics(), criteria);
  assert.equal(result.healthy, true);
  assert.deepEqual(result.failures, []);
});

test("health gate fails when PurchaseItem is broken but other APIs are healthy", () => {
  const metrics = healthyMetrics();
  metrics.api.PurchaseItem = { requests: 3, successRate: 0, p95LatencyMs: 40 };
  metrics.synthetic = { checkoutPass: 0, checkoutFail: 3 };

  const result = evaluateHealth(metrics, criteria);

  assert.equal(result.healthy, false);
  assert.match(result.failures.join("\n"), /PurchaseItem success rate/);
  assert.match(result.failures.join("\n"), /synthetic checkout failed/);
});
