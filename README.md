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
