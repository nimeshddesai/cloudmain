const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('assert');

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const has = (label, condition) => {
  assert.ok(condition, `Expected ${label}`);
};

test('document metadata', () => {
  has('HTML title', /<title>\s*CloudMain Solutions \| Azure Cloud Services\s*<\/title>/i.test(html));
  has('language attribute', /<html[^>]*lang="en"/i.test(html));
});

test('navigation links', () => {
  ['services', 'process', 'outcomes', 'contact'].forEach((id) => {
    has(`nav link for #${id}`, new RegExp(`<a[^>]*href="#${id}"`, 'i').test(html));
  });
});

test('hero content', () => {
  has('hero headline', /Cloud excellence, engineered for velocity and resilience\./i.test(html));
  has('hero metrics for uptime', /99\.95%/i.test(html));
  has('hero metrics for savings', /40%/i.test(html));
  has('hero metrics for deployments', /2-4x/i.test(html));
});

test('services section coverage', () => {
  has('services section', /<section[^>]*id="services"/i.test(html));
  const services = [
    'Azure CI/CD',
    'Azure Kubernetes',
    'COGS review',
    'Azure Security',
    'Azure Migrations',
    'Cloud operations'
  ];
  services.forEach((service) => {
    has(`${service} present`, new RegExp(service.replace(/\//g, '\\/'), 'i').test(html));
  });
  const cardCount = (html.match(/class="card"/g) || []).length;
  has('at least six service cards', cardCount >= 6);
});

test('process and outcomes sections', () => {
  has('process section', /<section[^>]*id="process"/i.test(html));
  has('outcomes section', /<section[^>]*id="outcomes"/i.test(html));
  ['Discover & align', 'Design & blueprint', 'Build & automate', 'Operate & optimize'].forEach((step) => {
    has(`process step ${step}`, new RegExp(step.replace(/&/g, '&amp;'), 'i').test(html));
  });
});

test('contact call-to-action', () => {
  has('contact section', /<section[^>]*id="contact"/i.test(html));
  has('mailto link', /href="mailto:hello@cloudmainsolutions.com"/i.test(html));
});
