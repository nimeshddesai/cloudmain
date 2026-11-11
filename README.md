# Fabriant website

Static marketing site for Fabriant, a specialist Azure platform-engineering partner.
Live at https://fabriant.cloud (other Fabriant domains redirect there via `_redirects`).

## Structure

- `index.html` – single-page site: Overview, Offerings, How to start, Process, How we work, Outcomes, About, FAQ, Contact
- `styles.css` – all styles
- `images/` – logo, favicon, team and investor images
- `_redirects` – Netlify domain redirects (all domains → fabriant.cloud)
- `netlify.toml` – Netlify build, headers and SPA fallback
- `tests/index.test.js` – content and structure checks, including guardrails against unproven claims and published prices

## Running locally

Use any static file server from the repository root:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Tests

```bash
npm test
```

## Deployment (Netlify)

Netlify's GitHub integration builds every push:

- **Push to `main`** → `npm ci && npm test && npm run build`, then publishes `build/` to production.
- **Pull request** → a deploy preview URL is posted on the PR.

### Domains

`fabriant.cloud` is the primary domain. In Netlify → Domain management, set `fabriant.cloud` as the primary domain and add `fabriant.com` and the other Fabriant domains as domain aliases; `_redirects` then sends them all to `fabriant.cloud`.

### Contact form

The contact form uses Netlify Forms (form name `contact`). In Netlify → Forms → Form notifications, add an email notification to `contact@fabriant.com`.

### Local preview with Netlify rules

```bash
npm install -g netlify-cli
netlify dev
```
