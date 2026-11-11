# Fabriant website

Static marketing site for Fabriant, a specialist Azure platform-engineering partner.
Live at https://fabriant.com (the main site). https://fabriant.cloud serves the same pages as an alias and is the address used in pitches and external references.

Built with [Eleventy](https://www.11ty.dev/): pages share one layout, so the header, footer and page `<head>` are written once.

## Pages

| URL | Source | Content |
|---|---|---|
| `/` | `src/index.njk` | Hero, business problems, services preview, outcomes |
| `/services/` | `src/services.njk` | The five offerings (from `src/_data/offerings.json`) |
| `/how-to-start/` | `src/how-to-start.njk` | Engagements and the four-phase process |
| `/about/` | `src/about.njk` | How we work, team, backer, RITE values |
| `/faq/` | `src/faq.njk` | Common questions |
| `/contact/` | `src/contact/index.njk` | Netlify contact form |
| `/contact/thanks/` | `src/contact/thanks.njk` | Shown after the form is sent (not indexed) |
| `/404.html` | `src/404.njk` | Not-found page (not indexed) |

## Structure

```
src/
  _data/site.json          name, URL, email, nav and footer links, form topics, asset version
  _data/offerings.json     the five offerings (used on Home and Services)
  _includes/layouts/       base.njk: <head>, header, footer, scripts
  _includes/partials/      header, footer, CTA band
  assets/css/              base.css, layout.css, components.css
  assets/js/main.js        menu toggle, contact topic pre-select, old-link redirects
  images/
  _redirects  robots.txt   copied as-is
  sitemap.njk              builds sitemap.xml
eleventy.config.js         builds src/ into build/
tests/                     checks run against the built site in build/
```

### Common changes

- **Add a page:** create `src/<name>.njk` with `layout`, `title`, `description` and `permalink` front matter. Add it to `nav` or `footerLinks` in `site.json` if it should be linked, and to `pages` in `tests/helpers.js`.
- **Change the nav or footer:** edit `site.json`.
- **Change CSS or JS:** bump `assetVersion` in `site.json` so browsers fetch the new files (they're cached for a year).
- **Per-page options in front matter:** `noindex: true` keeps a page out of search and the sitemap, and `hideCtaBand: true` removes the closing "free assessment" band.

## Running locally

```bash
npm install
npm start
```

Then open http://localhost:8080. Pages rebuild and reload as you edit.

## Tests

```bash
npm test
```

This builds the site, then checks every page: metadata, shared header and footer, highlighted nav item, guardrails against unproven claims and published prices, page content, and that every internal link and image exists.

## Deployment (Netlify)

Netlify's GitHub integration builds every push with `npm ci && npm test` (see `netlify.toml`) and publishes `build/`.

- **Push to `main`** → production.
- **Pull request** → a deploy preview URL is posted on the PR.

Links to the old single-page site (for example `/#offerings`) are sent to the new pages by `src/assets/js/main.js`.

### Domains

- **`fabriant.com`** is the main site: set it as the primary domain in Netlify → Domain management. Canonical URLs, the sitemap and social-share links all use it (`url` in `src/_data/site.json`).
- **`fabriant.cloud`** is a domain alias for pitches and external references. It serves the same pages without redirecting, and search engines are pointed to the `fabriant.com` versions through the canonical URLs.
- **Other domains** (`fabriant.ai`, `fabriant.in`, `fabriants.com`, `fabriant.info`) are added as domain aliases, and `src/_redirects` sends them to `fabriant.com`.

### Contact form

The contact form uses Netlify Forms (form name `contact`) and sends people to `/contact/thanks/` after submitting. In Netlify → Forms → Form notifications, add an email notification to `contact@fabriant.com`.

### Local preview with Netlify rules

```bash
npm install -g netlify-cli
netlify dev
```
