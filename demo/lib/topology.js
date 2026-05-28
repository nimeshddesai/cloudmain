const fs = require("node:fs");
const path = require("node:path");

const demoRoot = path.resolve(__dirname, "..");
const topologyPath = path.join(demoRoot, "config", "topology.json");
const statePath = path.join(demoRoot, "state", "deployment-state.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readTopology() {
  return readJson(topologyPath);
}

function readDeploymentState() {
  return readJson(statePath);
}

function writeDeploymentState(state) {
  writeJson(statePath, state);
}

function ringKey(target) {
  return `${target.region}/${target.ring}`;
}

function findRing(key) {
  const topology = readTopology();
  const ring = topology.rings.find((candidate) => ringKey(candidate) === key);
  if (!ring) {
    throw new Error(`Unknown ring '${key}'`);
  }
  return ring;
}

function setRingVersion(target, version) {
  const state = readDeploymentState();
  state[target.region] ||= {};
  state[target.region][target.ring] ||= {};
  state[target.region][target.ring].version = version;
  writeDeploymentState(state);
}

function getRingVersion(region, ring) {
  const state = readDeploymentState();
  return state[region]?.[ring]?.version || "v1";
}

module.exports = {
  demoRoot,
  statePath,
  findRing,
  getRingVersion,
  readDeploymentState,
  readTopology,
  ringKey,
  setRingVersion,
  writeDeploymentState
};
