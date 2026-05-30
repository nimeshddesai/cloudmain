const { requestJson } = require("../utils/request-json");

async function runCheckout(baseUrl) {
  const cartId = `synthetic-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const result = {
    baseUrl,
    ok: false,
    steps: []
  };

  try {
    const item = await requestJson(`${baseUrl}/items/sku-100`);
    result.steps.push({ api: "GetItem", ok: item.statusCode === 200 });

    const add = await requestJson(`${baseUrl}/cart/items`, {
      method: "POST",
      body: { cartId, itemId: "sku-100", quantity: 1 }
    });
    result.steps.push({ api: "AddItemToCart", ok: add.statusCode === 200 });

    const purchase = await requestJson(`${baseUrl}/purchase`, {
      method: "POST",
      body: { cartId, customerId: "synthetic-customer" }
    });
    result.steps.push({
      api: "PurchaseItem",
      ok: purchase.statusCode === 200,
      statusCode: purchase.statusCode
    });

    result.ok = result.steps.every((step) => step.ok);
    await requestJson(`${baseUrl}/admin/synthetic-result`, {
      method: "POST",
      body: { ok: result.ok }
    });
    return result;
  } catch (error) {
    result.error = error.message;
    await requestJson(`${baseUrl}/admin/synthetic-result`, {
      method: "POST",
      body: { ok: false }
    }).catch(() => {});
    return result;
  }
}

if (require.main === module) {
  const baseUrl = process.argv[2] || "http://localhost:3100";
  runCheckout(baseUrl).then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { runCheckout };
