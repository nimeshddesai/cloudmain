const http = require("node:http");
const crypto = require("node:crypto");
const { getRingVersion } = require("../lib/topology");

const region = process.env.REGION || "USEA";
const ring = process.env.RING || "ring0";
const port = Number(process.env.PORT || 3100);

const items = new Map([
  ["sku-100", { id: "sku-100", name: "Azure Trail Shoes", price: 129 }],
  ["sku-200", { id: "sku-200", name: "Observability Backpack", price: 89 }],
  ["sku-300", { id: "sku-300", name: "Rollback Hoodie", price: 59 }]
]);

const carts = new Map();
const purchases = [];

let metrics = createEmptyMetrics();

function createEmptyMetrics() {
  return {
    startedAt: new Date().toISOString(),
    api: {
      GetItem: emptyApiMetrics(),
      AddItemToCart: emptyApiMetrics(),
      PurchaseItem: emptyApiMetrics()
    },
    synthetic: {
      checkoutPass: 0,
      checkoutFail: 0
    },
    dependency: {
      dbWriteFailures: 0
    }
  };
}

function emptyApiMetrics() {
  return {
    requests: 0,
    success: 0,
    failure: 0,
    latencyMs: []
  };
}

function recordApi(name, statusCode, startedAt) {
  const api = metrics.api[name];
  const latency = Date.now() - startedAt;
  api.requests += 1;
  api.latencyMs.push(latency);
  if (statusCode >= 200 && statusCode < 400) {
    api.success += 1;
  } else {
    api.failure += 1;
  }
}

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function metricsSnapshot() {
  const api = {};
  for (const [name, value] of Object.entries(metrics.api)) {
    api[name] = {
      requests: value.requests,
      success: value.success,
      failure: value.failure,
      successRate: value.requests === 0 ? 1 : value.success / value.requests,
      p95LatencyMs: percentile(value.latencyMs, 95)
    };
  }

  return {
    region,
    ring,
    version: getRingVersion(region, ring),
    capacityPercent: Number(process.env.CAPACITY_PERCENT || 0),
    api,
    synthetic: metrics.synthetic,
    dependency: metrics.dependency,
    purchases: purchases.length
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname.startsWith("/items/")) {
    return handleApi("GetItem", res, async () => {
      const id = url.pathname.split("/").pop();
      const item = items.get(id);
      return item ? [200, item] : [404, { error: "Item not found" }];
    });
  }

  if (req.method === "POST" && url.pathname === "/cart/items") {
    return handleApi("AddItemToCart", res, async () => {
      const body = await readBody(req);
      const item = items.get(body.itemId);
      if (!item) {
        return [404, { error: "Item not found" }];
      }
      const cartId = body.cartId || crypto.randomUUID();
      const cart = carts.get(cartId) || [];
      cart.push({ itemId: body.itemId, quantity: body.quantity || 1 });
      carts.set(cartId, cart);
      return [200, { cartId, items: cart }];
    });
  }

  if (req.method === "POST" && url.pathname === "/purchase") {
    return handleApi("PurchaseItem", res, async () => {
      const version = getRingVersion(region, ring);
      if (version === "v2-bad") {
        return [500, { error: "Payment capture regression in v2-bad" }];
      }

      const body = await readBody(req);
      const cart = carts.get(body.cartId);
      if (!cart || cart.length === 0) {
        return [400, { error: "Cart is empty" }];
      }

      const purchase = {
        id: crypto.randomUUID(),
        cartId: body.cartId,
        customerId: body.customerId || "synthetic-customer",
        items: cart,
        createdAt: new Date().toISOString(),
        version
      };
      purchases.push(purchase);
      carts.delete(body.cartId);
      return [200, purchase];
    });
  }

  if (req.method === "GET" && url.pathname === "/metrics") {
    return sendJson(res, 200, metricsSnapshot());
  }

  if (req.method === "POST" && url.pathname === "/admin/metrics/reset") {
    metrics = createEmptyMetrics();
    return sendJson(res, 200, { reset: true });
  }

  if (req.method === "POST" && url.pathname === "/admin/synthetic-result") {
    const body = await readBody(req);
    if (body.ok) {
      metrics.synthetic.checkoutPass += 1;
    } else {
      metrics.synthetic.checkoutFail += 1;
    }
    return sendJson(res, 200, metrics.synthetic);
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, 200, {
      ok: true,
      region,
      ring,
      version: getRingVersion(region, ring)
    });
  }

  return sendJson(res, 404, { error: "Not found" });
}

async function handleApi(name, res, handler) {
  const startedAt = Date.now();
  try {
    const [statusCode, payload] = await handler();
    recordApi(name, statusCode, startedAt);
    return sendJson(res, statusCode, payload);
  } catch (error) {
    metrics.dependency.dbWriteFailures += name === "PurchaseItem" ? 1 : 0;
    recordApi(name, 500, startedAt);
    return sendJson(res, 500, { error: error.message });
  }
}

const server = http.createServer((req, res) => {
  route(req, res).catch((error) => {
    sendJson(res, 500, { error: error.message });
  });
});

server.listen(port, () => {
  console.log(
    `[service] ${region}/${ring} listening on http://localhost:${port}`
  );
});
