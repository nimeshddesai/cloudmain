const state = {
  mode: "current",
  scenario: "healthy"
};

const data = {
  current: {
    title: "Regional Health",
    healthy: {
      overall: "All Systems Operational",
      detail: "East US and West US are serving checkout traffic normally.",
      impact: "0%",
      band: "healthy",
      deployment: "Idle",
      apis: [
        ["GetItem", "Operational", "99.99%"],
        ["AddItemToCart", "Operational", "99.98%"],
        ["PurchaseItem", "Operational", "99.97%"]
      ],
      topology: [
        ["East US", "Operational", "50% capacity"],
        ["West US", "Operational", "50% capacity"]
      ],
      synthetic: [
        ["GetItem", "Passed", "200"],
        ["AddItemToCart", "Passed", "200"],
        ["PurchaseItem", "Passed", "200"]
      ],
      timeline: [
        ["No active deployment", "Traffic is balanced across both regions."]
      ]
    },
    bad: {
      overall: "Partial Outage",
      detail: "A bad patch in East US is breaking checkout while catalog and cart APIs remain available.",
      impact: "50%",
      band: "outage",
      deployment: "Rollback",
      apis: [
        ["GetItem", "Operational", "99.99%"],
        ["AddItemToCart", "Operational", "99.98%"],
        ["PurchaseItem", "Partial Outage", "0.00% in East US"]
      ],
      topology: [
        ["East US", "Partial Outage", "50% impacted"],
        ["West US", "Operational", "50% healthy"]
      ],
      synthetic: [
        ["GetItem", "Passed", "200"],
        ["AddItemToCart", "Passed", "200"],
        ["PurchaseItem", "Failed", "500"]
      ],
      timeline: [
        ["v2-bad deployed to East US", "Regional rollout exposes 50% capacity."],
        ["Synthetic checkout failed", "PurchaseItem returned HTTP 500."],
        ["Rollback started", "Pipeline stopped before West US."]
      ]
    },
    recovered: {
      overall: "All Systems Operational",
      detail: "East US has rolled back to v1 and checkout has recovered.",
      impact: "0%",
      band: "healthy",
      deployment: "Recovered",
      apis: [
        ["GetItem", "Operational", "99.99%"],
        ["AddItemToCart", "Operational", "99.98%"],
        ["PurchaseItem", "Operational", "99.96%"]
      ],
      topology: [
        ["East US", "Operational", "50% capacity"],
        ["West US", "Operational", "50% capacity"]
      ],
      synthetic: [
        ["GetItem", "Passed", "200"],
        ["AddItemToCart", "Passed", "200"],
        ["PurchaseItem", "Passed", "200"]
      ],
      timeline: [
        ["Rollback completed", "East US restored to v1."],
        ["Synthetic checkout passed", "Customer checkout is healthy again."]
      ]
    }
  },
  sliced: {
    title: "Ring Health",
    healthy: {
      overall: "All Systems Operational",
      detail: "All production rings are healthy across East US and West US.",
      impact: "0%",
      band: "healthy",
      deployment: "Idle",
      apis: [
        ["GetItem", "Operational", "99.99%"],
        ["AddItemToCart", "Operational", "99.98%"],
        ["PurchaseItem", "Operational", "99.97%"]
      ],
      topology: [
        ["East US Ring0", "Operational", "5% capacity"],
        ["East US Ring1", "Operational", "45% capacity"],
        ["West US Ring0", "Operational", "5% capacity"],
        ["West US Ring1", "Operational", "45% capacity"]
      ],
      synthetic: [
        ["GetItem", "Passed", "200"],
        ["AddItemToCart", "Passed", "200"],
        ["PurchaseItem", "Passed", "200"]
      ],
      timeline: [
        ["No active deployment", "All rings are on a healthy version."]
      ]
    },
    bad: {
      overall: "Degraded Performance",
      detail: "The same bad patch is contained to East US Ring0 before expanding to larger rings.",
      impact: "5%",
      band: "degraded",
      deployment: "Rollback",
      apis: [
        ["GetItem", "Operational", "99.99%"],
        ["AddItemToCart", "Operational", "99.98%"],
        ["PurchaseItem", "Degraded in Ring0", "0.00% in East US Ring0"]
      ],
      topology: [
        ["East US Ring0", "Degraded", "5% impacted"],
        ["East US Ring1", "Operational", "45% protected"],
        ["West US Ring0", "Operational", "5% protected"],
        ["West US Ring1", "Operational", "45% protected"]
      ],
      synthetic: [
        ["GetItem", "Passed", "200"],
        ["AddItemToCart", "Passed", "200"],
        ["PurchaseItem", "Failed", "500"]
      ],
      timeline: [
        ["v2-bad deployed to East US Ring0", "Initial blast radius is 5%."],
        ["Targeted synthetic failed", "PurchaseItem returned HTTP 500."],
        ["Health gate blocked rollout", "Ring1 and West US were not exposed."],
        ["Rollback started", "East US Ring0 returns to v1."]
      ]
    },
    recovered: {
      overall: "All Systems Operational",
      detail: "East US Ring0 recovered after rollback; remaining rings stayed healthy.",
      impact: "0%",
      band: "healthy",
      deployment: "Recovered",
      apis: [
        ["GetItem", "Operational", "99.99%"],
        ["AddItemToCart", "Operational", "99.98%"],
        ["PurchaseItem", "Operational", "99.97%"]
      ],
      topology: [
        ["East US Ring0", "Operational", "5% capacity"],
        ["East US Ring1", "Operational", "45% capacity"],
        ["West US Ring0", "Operational", "5% capacity"],
        ["West US Ring1", "Operational", "45% capacity"]
      ],
      synthetic: [
        ["GetItem", "Passed", "200"],
        ["AddItemToCart", "Passed", "200"],
        ["PurchaseItem", "Passed", "200"]
      ],
      timeline: [
        ["Rollback completed", "East US Ring0 restored to v1."],
        ["Targeted synthetic passed", "Checkout is healthy in the first ring."]
      ]
    }
  }
};

const elements = {
  statusBand: document.querySelector(".status-band"),
  overallStatus: document.querySelector("#overall-status"),
  statusDetail: document.querySelector("#status-detail"),
  impactValue: document.querySelector("#impact-value"),
  apiSummary: document.querySelector("#api-summary"),
  topologyTitle: document.querySelector("#topology-title"),
  topologySummary: document.querySelector("#topology-summary"),
  syntheticSummary: document.querySelector("#synthetic-summary"),
  deploymentSummary: document.querySelector("#deployment-summary"),
  apiList: document.querySelector("#api-list"),
  topologyList: document.querySelector("#topology-list"),
  syntheticList: document.querySelector("#synthetic-list"),
  timeline: document.querySelector("#timeline")
};

document.querySelectorAll(".mode-button").forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    setActive(".mode-button", button);
    render();
  });
});

document.querySelectorAll(".scenario-button").forEach((button) => {
  button.addEventListener("click", () => {
    state.scenario = button.dataset.scenario;
    setActive(".scenario-button", button);
    render();
  });
});

function render() {
  const view = data[state.mode][state.scenario];
  elements.statusBand.className = `status-band ${view.band}`;
  elements.overallStatus.textContent = view.overall;
  elements.statusDetail.textContent = view.detail;
  elements.impactValue.textContent = view.impact;
  elements.topologyTitle.textContent = data[state.mode].title;
  elements.apiSummary.textContent = view.apis.some((item) => !isGood(item[1])) ? "Degraded" : "Healthy";
  elements.apiSummary.className = `pill ${view.apis.some((item) => !isGood(item[1])) ? "warn" : "good"}`;
  elements.syntheticSummary.textContent = view.synthetic.some((item) => !isGood(item[1])) ? "Failing" : "Passing";
  elements.syntheticSummary.className = `pill ${view.synthetic.some((item) => !isGood(item[1])) ? "bad" : "good"}`;
  elements.deploymentSummary.textContent = view.deployment;
  elements.deploymentSummary.className = `pill ${view.deployment === "Rollback" ? "warn" : view.deployment === "Recovered" ? "good" : "neutral"}`;

  const healthyTargets = view.topology.filter((item) => isGood(item[1])).length;
  elements.topologySummary.textContent = `${healthyTargets} of ${view.topology.length} healthy`;
  elements.topologySummary.className = `pill ${healthyTargets === view.topology.length ? "good" : "warn"}`;

  renderList(elements.apiList, view.apis, "component-row");
  renderList(elements.topologyList, view.topology, "component-row");
  renderList(elements.syntheticList, view.synthetic, "step-row");
  renderList(elements.timeline, view.timeline, "timeline-row", true);
}

function renderList(container, items, rowClass, neutral = false) {
  container.innerHTML = "";
  for (const item of items) {
    const row = document.createElement("li");
    row.className = rowClass;

    const dot = document.createElement("span");
    dot.className = `dot ${neutral ? "" : dotClass(item[1])}`;
    row.append(dot);

    const text = document.createElement("span");
    const title = document.createElement("span");
    title.className = "row-title";
    title.textContent = item[0];
    const subtitle = document.createElement("span");
    subtitle.className = "row-subtitle";
    subtitle.textContent = item[1];
    text.append(title, document.createElement("br"), subtitle);
    row.append(text);

    const metric = document.createElement("span");
    metric.className = "metric";
    metric.textContent = item[2] || "";
    row.append(metric);

    container.append(row);
  }
}

function setActive(selector, activeButton) {
  document.querySelectorAll(selector).forEach((button) => {
    button.classList.toggle("active", button === activeButton);
  });
}

function isGood(value) {
  return value === "Operational" || value === "Passed";
}

function dotClass(value) {
  if (value === "Failed" || value === "Partial Outage") {
    return "bad";
  }

  if (value.includes("Degraded")) {
    return "warn";
  }

  return "";
}

render();
