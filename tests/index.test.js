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
  has('HTML title', /<title>\s*Fabriant\ | Weaving Intelligence into Cloud\s*<\/title>/i.test(html));
  has('language attribute', /<html[^>]*lang="en"/i.test(html));
});

test('navigation links', () => {
  ['services', 'process', 'outcomes', 'team', 'contact'].forEach((id) => {
    has(`nav link for #${id}`, new RegExp(`<a[^>]*href="#${id}"`, 'i').test(html));
  });
});

test('mobile hamburger menu', () => {
  has('hamburger toggle button', /<button[^>]*id="nav-toggle"/i.test(html));
  has('toggle has aria-label', /<button[^>]*aria-label="Toggle navigation"/i.test(html));
  has('toggle has aria-expanded', /<button[^>]*aria-expanded="false"/i.test(html));
  has('nav-links has id for JS', /<div[^>]*id="nav-links"/i.test(html));
  has('hamburger JS toggle handler', /navToggle\.addEventListener\("click"/.test(html));
  has('nav links close on click', /navLinks\.classList\.remove\("is-open"\)/.test(html));
});

test('hero content', () => {
  has('hero headline', /Cloud excellence, engineered for velocity and resilience\./i.test(html));
  has('hero metrics for uptime', /99\.95%/i.test(html));
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
  has('at least four service cards', cardCount >= 4);
});

test('process and outcomes sections', () => {
  has('process section', /<section[^>]*id="process"/i.test(html));
  has('outcomes section', /<section[^>]*id="outcomes"/i.test(html));
  ['Discover & align', 'Design & blueprint', 'Build & automate', 'Operate & optimize'].forEach((step) => {
    has(`process step ${step}`, new RegExp(step.replace(/&/g, '&amp;'), 'i').test(html));
  });
});

test('values section', () => {
  has('values section', /<section[^>]*id="values"/i.test(html));
  ['Reliability', 'Innovation', 'Trust', 'Excellence'].forEach((value) => {
    has(`value tile ${value}`, new RegExp(value, 'i').test(html));
  });
});

test('contact section', () => {
  has('contact section', /<section[^>]*id="contact"/i.test(html));
  has('contact heading', /Contact Us/i.test(html));
  has('name input', /<input[^>]*id="contact-name"/i.test(html));
  has('no email input', !/<input[^>]*id="contact-email"/i.test(html));
  has('message textarea', /<textarea[^>]*id="contact-message"/i.test(html));
  has('mailto link', /href="mailto:[^"]+"/i.test(html));
  has('submit link has id for JS wiring', /<a[^>]*id="contact-submit"/i.test(html));
  has('click handler wires name into body', /getElementById\("contact-name"\)/.test(html));
  has('click handler does not reference email', !/getElementById\("contact-email"\)/.test(html));
});
