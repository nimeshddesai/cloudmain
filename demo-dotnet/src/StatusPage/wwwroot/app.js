const elements = {
  summary: document.querySelector("#summary"),
  overallStatus: document.querySelector("#overall-status"),
  overallDetail: document.querySelector("#overall-detail"),
  lastUpdated: document.querySelector("#last-updated"),
  windowLabel: document.querySelector("#window-label"),
  componentList: document.querySelector("#component-list")
};

const endpoint = document.querySelector("meta[name='status-endpoint']")?.content || "/api/status";
const scope = document.querySelector("meta[name='status-scope']")?.content || "public";

const labels = {
  Operational: "Operational",
  Degraded: "Degraded",
  Unknown: "Unknown"
};

async function loadStatus() {
  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Status request failed: ${response.status}`);
    }

    render(await response.json());
  } catch {
    render({
      generatedAtUtc: new Date().toISOString(),
      intervalSeconds: 30,
      overallStatus: "Unknown",
      components: []
    });
  }
}

function render(status) {
  const overall = normalizeStatus(status.overallStatus);
  elements.summary.className = `summary ${statusClass(overall)}`;
  elements.overallStatus.textContent = overall === "Operational"
    ? scope === "service-rings" ? "All ServiceRings Operational" : "All Systems Operational"
    : overall === "Degraded"
      ? scope === "service-rings" ? "Some ServiceRings Degraded" : "Some Services Degraded"
      : "Status Unavailable";
  elements.overallDetail.textContent = overall === "Operational"
    ? scope === "service-rings" ? "All production ServiceRings are operating normally." : "Retail services are operating normally."
    : overall === "Degraded"
      ? scope === "service-rings" ? "One or more production ServiceRings are experiencing degraded availability." : "One or more retail service components are experiencing degraded availability."
      : "Current service status could not be refreshed.";

  elements.lastUpdated.textContent = `Last updated ${formatTime(status.generatedAtUtc)}`;
  const intervalSeconds = Number(status.intervalSeconds || 30);
  const historyLength = Math.max(...(status.components || []).map((component) => (component.history || []).length), 60);
  elements.windowLabel.textContent = `Last ${Math.round((historyLength * intervalSeconds) / 60)} minutes`;
  elements.componentList.innerHTML = "";

  for (const component of status.components || []) {
    elements.componentList.append(renderComponent(component));
  }

  if (!status.components || status.components.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Status history is not available yet.";
    elements.componentList.append(empty);
  }
}

function renderComponent(component) {
  const row = document.createElement("article");
  row.className = "component-row";

  const nameBlock = document.createElement("div");
  const name = document.createElement("h4");
  name.textContent = component.name;
  const meta = document.createElement("p");
  meta.textContent = labels[normalizeStatus(component.status)];
  nameBlock.append(name, meta);

  const bars = document.createElement("div");
  bars.className = "bars";
  bars.setAttribute("aria-label", `${component.name} status history`);
  const points = (component.history || []).slice(-60);
  const paddedPoints = [
    ...Array.from({ length: Math.max(0, 60 - points.length) }, () => ({ status: "Unknown" })),
    ...points
  ];

  for (const point of paddedPoints) {
    const bar = document.createElement("span");
    const pointStatus = normalizeStatus(point.status);
    bar.className = `bar ${statusClass(pointStatus)}`;
    bar.title = point.timeUtc
      ? `${formatTime(point.timeUtc)} - ${labels[pointStatus]}`
      : labels[pointStatus];
    bars.append(bar);
  }

  const state = document.createElement("span");
  state.className = `pill ${statusClass(normalizeStatus(component.status))}`;
  state.textContent = labels[normalizeStatus(component.status)];

  row.append(nameBlock, bars, state);
  return row;
}

function normalizeStatus(value) {
  return value === "Operational" || value === "Degraded" ? value : "Unknown";
}

function statusClass(status) {
  if (status === "Operational") {
    return "operational";
  }

  if (status === "Degraded") {
    return "degraded";
  }

  return "unknown";
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });
}

loadStatus();
setInterval(loadStatus, 5000);
