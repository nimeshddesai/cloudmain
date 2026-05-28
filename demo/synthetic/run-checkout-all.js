const { readTopology } = require("../lib/topology");
const { runCheckout } = require("./run-checkout");

async function main() {
  const topology = readTopology();
  let failed = false;

  for (const target of topology.rings) {
    const baseUrl = `http://localhost:${target.port}`;
    const result = await runCheckout(baseUrl);
    console.log(
      `${target.region}/${target.ring} ${result.ok ? "PASS" : "FAIL"} ${baseUrl}`
    );
    if (!result.ok) {
      failed = true;
    }
  }

  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
