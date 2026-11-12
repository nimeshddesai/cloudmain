// Checks that apply to every page, plus links, sitemap and deployment config
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const { root, buildDir, pages, noindexPages, readBuild, page, contains, has, fileForUrl, postUrls } = require('./helpers');

const site = JSON.parse(fs.readFileSync(path.join(root, 'src/_data/site.json'), 'utf8'));
const urls = Object.keys(pages);

test('every page has metadata', () => {
  urls.forEach((url) => {
    const html = page(url);
    has(`${url} lang="en"`, /<html[^>]*lang="en"/i.test(html));
    has(`${url} title`, /<title>[^<]+\| ?Fabriant|<title>Fabriant \|/i.test(html));
    has(`${url} meta description`, /<meta name="description" content="[^"]{40,}"/i.test(html));
    has(`${url} og:title`, /<meta property="og:title" content="[^"]+"/i.test(html));
    if (noindexPages.includes(url)) {
      has(`${url} noindex`, /<meta name="robots" content="noindex"/i.test(html));
      has(`${url} no canonical`, !/rel="canonical"/i.test(html));
    } else {
      has(`${url} canonical`, html.includes(`<link rel="canonical" href="https://fabriant.com${url}" />`));
    }
  });
});

test('every page has the shared header, footer and assets', () => {
  urls.forEach((url) => {
    const html = page(url);
    site.nav.forEach((item) => has(`${url} nav link ${item.url}`, html.includes(`<a href="${item.url}"`)));
    has(`${url} free assessment button`, /<a class="cta" href="\/contact\/"/.test(html));
    has(`${url} hamburger`, /<button[^>]*id="nav-toggle"[^>]*aria-controls="nav-links"/.test(html));
    site.footerLinks.forEach((item) => has(`${url} footer link ${item.url}`, new RegExp(`<footer[\\s\\S]*href="${item.url}"`).test(html)));
    has(`${url} footer email`, /<footer[\s\S]*mailto:contact@fabriant\.com/.test(html));
    has(`${url} footer RITE`, /<footer[\s\S]*Built on <strong>RITE<\/strong>/.test(html));
    ['base', 'layout', 'components'].forEach((name) =>
      has(`${url} ${name}.css`, html.includes(`/assets/css/${name}.css?v=${site.assetVersion}`)));
    has(`${url} main.js`, html.includes(`/assets/js/main.js?v=${site.assetVersion}`));
  });
});

test('current page is highlighted in the nav', () => {
  const current = (html) => (html.match(/<a[^>]*href="([^"]+)"[^>]*aria-current="page"/g) || [])
    .map((tag) => tag.match(/href="([^"]+)"/)[1]);
  has('nothing highlighted on home', current(page('/')).length === 0);
  ['/services/', '/how-to-start/', '/about/', '/blog/', '/contact/'].forEach((url) => {
    const marked = current(page(url));
    has(`only ${url} highlighted on ${url}`, marked.length === 1 && marked[0] === url);
  });
});

test('CTA band shows on content pages only', () => {
  const band = (url) => contains(page(url), 'Start with a complimentary 1-week assessment');
  ['/', '/services/', '/how-to-start/', '/about/', '/faq/', '/blog/'].forEach((url) => has(`CTA band on ${url}`, band(url)));
  ['/contact/', '/contact/thanks/', '/404.html'].forEach((url) => has(`no CTA band on ${url}`, !band(url)));
});

test('claims and pricing guardrails on every page', () => {
  urls.forEach((url) => {
    const html = page(url);
    ['99.95%', '2-4x', '24/7'].forEach((claim) =>
      has(`no "${claim}" on ${url}`, !contains(html, claim)));
    has(`no dollar prices on ${url}`, !/\$\s?\d/.test(html));
    // fabriant.cloud is the alias for pitches; the site itself always points at fabriant.com
    has(`no fabriant.cloud URLs on ${url}`, !/https?:\/\/(www\.)?fabriant\.cloud/i.test(html));
  });
});

test('internal links and images point to real files and sections', () => {
  const htmlFiles = [...Object.values(pages), ...postUrls().map((u) => `${u.slice(1)}index.html`)];
  htmlFiles.forEach((file) => {
    const html = readBuild(file);
    const refs = [...html.matchAll(/(?:href|src)="(\/(?!\/)[^"]*)"/g)].map((m) => m[1]);
    refs.forEach((ref) => {
      const target = fileForUrl(ref);
      has(`${file} → ${ref} exists`, fs.existsSync(target));
      const hash = ref.split('#')[1];
      if (hash) {
        has(`${file} → ${ref} has #${hash}`, fs.readFileSync(target, 'utf8').includes(`id="${hash}"`));
      }
    });
  });
});

test('old single-page links are redirected to real pages', () => {
  const js = readBuild('assets/js/main.js');
  ['offerings', 'start', 'process', 'model', 'team', 'values', 'faq', 'contact'].forEach((id) => {
    const m = js.match(new RegExp(`\\b${id}: "([^"]+)"`));
    has(`redirect for #${id}`, m);
    const target = fileForUrl(m[1]);
    has(`#${id} target ${m[1]} exists`, fs.existsSync(target));
    const hash = m[1].split('#')[1];
    if (hash) has(`#${id} target has #${hash}`, fs.readFileSync(target, 'utf8').includes(`id="${hash}"`));
  });
  // #overview and #outcomes stay on the home page
  ['overview', 'outcomes'].forEach((id) => has(`home keeps #${id}`, page('/').includes(`id="${id}"`)));
});

test('sitemap and robots.txt', () => {
  const sitemap = readBuild('sitemap.xml');
  urls.filter((u) => !noindexPages.includes(u)).forEach((url) =>
    has(`sitemap lists ${url}`, sitemap.includes(`<loc>https://fabriant.com${url}</loc>`)));
  noindexPages.forEach((url) => has(`sitemap omits ${url}`, !sitemap.includes(url)));
  has('robots.txt points to sitemap', /Sitemap: https:\/\/fabriant\.com\/sitemap\.xml/.test(readBuild('robots.txt')));
});

test('fabriant.com is the main site, fabriant.cloud serves as an alias', () => {
  const redirects = readBuild('_redirects');
  const rule = (from, to) => new RegExp(`^${from.replace(/\./g, '\\.')}/\\*\\s+${to.replace(/\./g, '\\.')}/:splat\\s+301!$`, 'm').test(redirects);
  has('fabriant.com is not redirected', !/^https:\/\/fabriant\.com\//m.test(redirects));
  has('fabriant.cloud is not redirected', !/^https:\/\/fabriant\.cloud\//m.test(redirects));
  has('www.fabriant.com → fabriant.com', rule('https://www.fabriant.com', 'https://fabriant.com'));
  has('www.fabriant.cloud → fabriant.cloud', rule('https://www.fabriant.cloud', 'https://fabriant.cloud'));
  ['fabriant.ai', 'fabriant.in', 'fabriants.com', 'fabriant.info'].forEach((domain) => {
    has(`${domain} → fabriant.com`, rule(`https://${domain}`, 'https://fabriant.com'));
    has(`www.${domain} → fabriant.com`, rule(`https://www.${domain}`, 'https://fabriant.com'));
  });
});

test('netlify has no catch-all rewrite to the home page', () => {
  const toml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
  has('no catch-all redirect', !/\[\[redirects\]\][\s\S]*from\s*=\s*"\/\*"/.test(toml));
  has('404 page built', fs.existsSync(path.join(buildDir, '404.html')));
});
