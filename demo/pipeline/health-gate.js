function evaluateHealth(metrics, criteria) {
  const failures = [];

  for (const [apiName, api] of Object.entries(metrics.api)) {
    if (api.requests < criteria.minimumRequestsPerApi) {
      failures.push(
        `${apiName} has only ${api.requests} requests; need ${criteria.minimumRequestsPerApi}`
      );
    }
    if (api.successRate < criteria.minimumSuccessRate) {
      failures.push(
        `${apiName} success rate ${formatPercent(api.successRate)} is below ${formatPercent(criteria.minimumSuccessRate)}`
      );
    }
    if (api.p95LatencyMs > criteria.maximumP95LatencyMs) {
      failures.push(
        `${apiName} p95 latency ${api.p95LatencyMs}ms exceeds ${criteria.maximumP95LatencyMs}ms`
      );
    }
  }

  if (metrics.synthetic.checkoutPass < criteria.requiredSyntheticPasses) {
    failures.push(
      `synthetic checkout passed ${metrics.synthetic.checkoutPass} times; need ${criteria.requiredSyntheticPasses}`
    );
  }
  if (metrics.synthetic.checkoutFail > 0) {
    failures.push(`synthetic checkout failed ${metrics.synthetic.checkoutFail} times`);
  }
  if (metrics.dependency.dbWriteFailures > 0) {
    failures.push(`DB write failures detected: ${metrics.dependency.dbWriteFailures}`);
  }

  return {
    healthy: failures.length === 0,
    failures
  };
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

module.exports = { evaluateHealth };
