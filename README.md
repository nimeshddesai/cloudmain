# CloudMain Solutions

Static website for CloudMain Solutions, highlighting Azure-focused cloud services.

## Running locally

Use any static file server from the repository root. For example:

```bash
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

## Tests

The site includes lightweight HTML structure checks using Node's built-in test runner:

```bash
npm test
```

## Retail observability demo

The engineering demo lives under `demo/` and is separate from the CloudMain marketing site. It models a retail service deployed across two regions and two production rings:

- `USEA/ring0` on port `3100` with 5% capacity
- `USEA/ring1` on port `3101` with 45% capacity
- `USWE/ring0` on port `3200` with 5% capacity
- `USWE/ring1` on port `3201` with 45% capacity

The service exposes:

- `GET /items/:id` for `GetItem`
- `POST /cart/items` for `AddItemToCart`
- `POST /purchase` for `PurchaseItem`
- `GET /metrics` for API, synthetic, dependency, and version metrics

Start the demo services from the repository root:

```bash
npm run demo:init
npm run demo:services
```

In a second terminal, run synthetic checkout traffic against all rings:

```bash
npm run demo:synthetic
```

To demonstrate a failed patch, run:

```bash
npm run demo:rollout:bad
```

The `v2-bad` patch intentionally breaks only `PurchaseItem`. `GetItem` and `AddItemToCart` continue to pass. The pipeline deploys to `USEA/ring0`, runs synthetic checkout traffic, reads `/metrics`, fails the health gate, stops rollout, and rolls the ring back to `v1`.

To demonstrate a successful rollout:

```bash
npm run demo:rollout:good
```

The gate criteria are configured in `demo/config/topology.json`.

## Deploying to Azure Static Web Apps

1. Create an Azure Static Web App and set the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret in your repository settings.
2. Push to `main` (or open a pull request). The workflow in `.github/workflows/azure-static-web-app.yml` will:
   - run the HTML structure tests,
   - package the static assets in `build/`,
   - upload the site to Azure.
3. If you need custom routing, adjust `staticwebapp.config.json` and rerun the workflow.
