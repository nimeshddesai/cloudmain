const { readTopology, writeDeploymentState } = require("../lib/topology");

const topology = readTopology();
const state = {};

for (const target of topology.rings) {
  state[target.region] ||= {};
  state[target.region][target.ring] = { version: "v1" };
}

writeDeploymentState(state);
console.log("[demo] reset all rings to v1");
