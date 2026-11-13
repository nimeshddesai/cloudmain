# Fabriant website

Static marketing site for Fabriant, a specialist Azure platform-engineering partner.
Live at https://fabriant.com (the main site). https://fabriant.cloud serves the same pages as an alias and is the address used in pitches and external references.

Built with [Eleventy](https://www.11ty.dev/): pages share one layout, so the header, footer and page `<head>` are written once.

## Pages

| URL | Source | Content |
|---|---|---|
| `/` | `src/index.njk` | Hero, business problems, services preview, latest articles |
| `/services/` | `src/services.njk` | The five offerings (from `src/_data/offerings.json`) |
| `/how-to-start/` | `src/how-to-start.njk` | Engagements and the four-phase process |
| `/about/` | `src/about.njk` | How we work, team, backer, RITE values |
| `/faq/` | `src/faq.njk` | Common questions |
| `/engineering/` | `src/engineering/index.njk` | List of articles, newest first |
| `/engineering/<name>/` | `src/engineering/posts/<name>.md` | One article (Markdown) |
| `/contact/` | `src/contact/index.njk` | Netlify contact form |
| `/contact/thanks/` | `src/contact/thanks.njk` | Shown after the form is sent (not indexed) |
| `/404.html` | `src/404.njk` | Not-found page (not indexed) |

## Structure

```
src/
  _data/site.json          name, URL, email, nav and footer links, form topics, asset version
  _data/offerings.json     the five offerings (used on Home and Services)
  _includes/layouts/       base.njk: <head>, header, footer, scripts; post.njk: article
  engineering/posts/       articles in Markdown (posts.11tydata.js holds shared settings)
  _includes/partials/      header, footer, CTA band
  assets/css/              base.css, layout.css, components.css
  assets/js/main.js        menu toggle, contact topic pre-select, old-link redirects
  images/
  _redirects  robots.txt   copied as-is
  sitemap.njk              builds sitemap.xml
eleventy.config.js         builds src/ into build/
tests/                     checks run against the built site in build/
```

### Adding an article

Articles live in `src/engineering/posts/`, one Markdown file each, and are listed at `/engineering/`.

1. **Create a branch:** `git checkout -b article/safer-aks-upgrades`.
2. **Copy the template:** copy `src/engineering/posts/example-post.md` to a new file. The file name becomes the URL, so use short lowercase words with hyphens: `safer-aks-upgrades.md` → `/engineering/safer-aks-upgrades/`.
3. **Fill in the details at the top:**
   ```yaml
   ---
   draft: true            # keep while writing: visible in npm start, not published
   title: Safer AKS upgrades
   description: One or two sentences for the article list and search results.
   date: 2026-11-20       # publish date, YYYY-MM-DD; sets the order (newest first)
   author: Nimesh Desai   # optional, defaults to Fabriant
   ---
   ```
4. **Add a main image (optional):** save it in `src/images/posts/`, ideally a JPEG about 1000–1600px wide and under 300 KB, and add to the details at the top:
   ```yaml
   image: /images/posts/safer-aks-upgrades.jpg
   imageAlt: What the image shows, for screen readers
   imageCaption: Optional caption   # optional
   ```
   It appears under the title, is never cropped, and is capped at 440px high. It is also the picture shown when the article is shared on LinkedIn and elsewhere. Don't also put it in the article text.
5. **Write the article** below the second `---` in Markdown. Use `##` for section headings (the title is already the main heading). For other pictures inside the text, use `![Alt text](/images/posts/name.jpg)`. Paragraphs are justified automatically on screens wider than a phone.
6. **Preview it:** run `npm start` and open http://localhost:8080/engineering/.
7. **Publish:** delete the `draft: true` line, then run `npm test`. It checks the article has a title, description, date and working links.
8. **Ship it:** commit, push and open a pull request. Check the article on the Netlify deploy preview, then merge to `main` to put it live.

Once published, the article appears on `/engineering/`, in the sitemap, and in "Latest articles" on the home page (that section shows only once at least one article is published). `example-post.md` is a draft template and is never published.

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

The contact form uses Netlify Forms (form name `contact`).

- **Netlify setup:** in Netlify → Forms, make sure **form detection is enabled** (Netlify finds the form when it builds the site; without this, submissions go nowhere). Then, under Form notifications, add an email notification to `contact@fabriant.com`.
- **How submitting works:** `src/assets/js/main.js` sends the form in the background and moves to `/contact/thanks/` only when Netlify confirms it stored the message. If sending fails, the form shows an error with the email address instead. Without JavaScript, the browser posts the form normally.
- **Local testing:** Netlify Forms only runs on Netlify, so on `localhost` the form shows "Not sent: this is a local preview" instead of pretending to send. Test real submissions on a Netlify deploy preview or the live site.

### Local preview with Netlify rules

```bash
npm install -g netlify-cli
netlify dev
```
