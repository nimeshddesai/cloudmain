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

## Deploying to Azure Static Web Apps

1. Create an Azure Static Web App and set the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret in your repository settings.
2. Push to `main` (or open a pull request). The workflow in `.github/workflows/azure-static-web-app.yml` will:
   - run the HTML structure tests,
   - package the static assets in `build/`,
   - upload the site to Azure.
3. If you need custom routing, adjust `staticwebapp.config.json` and rerun the workflow.

## Deploying to Netlify via GitHub

### One-time setup

1. **Create a Netlify site** – Log in to [app.netlify.com](https://app.netlify.com), click **Add new site → Import an existing project**, and connect your GitHub repository. Netlify will detect [`netlify.toml`](netlify.toml) automatically; no extra UI config is needed.

### How it works

Netlify's native GitHub integration handles everything automatically — no GitHub Actions workflow or secrets are required:

- **Push to `main`** → Netlify runs the build command from `netlify.toml` (`npm ci && npm test`, then copies assets to `build/`) and publishes to production.
- **Pull request** → Netlify automatically deploys a **draft preview** URL and posts it as a commit status check on the PR.
- SPA fallback redirect, security headers, and asset cache policies are all defined in [`netlify.toml`](netlify.toml).

### Local preview

```bash
npm install -g netlify-cli
netlify dev
```

This serves the site locally using the same redirect and header rules defined in `netlify.toml`.
