const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'build');

if (!fs.existsSync(path.join(buildDir, 'index.html'))) {
  throw new Error('build/ is missing. Run "npm test", which builds the site first.');
}

// URL → built file, for every page the site publishes
const pages = {
  '/': 'index.html',
  '/services/': 'services/index.html',
  '/how-to-start/': 'how-to-start/index.html',
  '/about/': 'about/index.html',
  '/faq/': 'faq/index.html',
  '/engineering/': 'engineering/index.html',
  '/contact/': 'contact/index.html',
  '/contact/thanks/': 'contact/thanks/index.html',
  '/404.html': '404.html'
};
const noindexPages = ['/contact/thanks/', '/404.html'];

const readBuild = (file) => fs.readFileSync(path.join(buildDir, file), 'utf8');
const page = (url) => readBuild(pages[url]);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/&/g, '&(amp;)?');
const contains = (html, text) => new RegExp(escape(text), 'i').test(html);

const has = (label, condition) => {
  if (!condition) throw new Error(`Expected ${label}`);
};

// Resolve a site-relative URL like /services/#id to its built file
const fileForUrl = (url) => {
  const clean = url.split('#')[0].split('?')[0];
  const rel = clean.endsWith('/') ? `${clean}index.html` : clean;
  return path.join(buildDir, rel);
};

// Published articles in the build, as URLs like /engineering/my-post/
const postUrls = () => {
  const dir = path.join(buildDir, 'engineering');
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'index.html')))
    .map((d) => `/engineering/${d.name}/`);
};

module.exports = { root, buildDir, pages, noindexPages, readBuild, page, contains, has, fileForUrl, postUrls };
