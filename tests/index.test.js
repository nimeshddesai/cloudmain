const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8');

const has = (label, condition) => {
  assert.ok(condition, `Expected ${label}`);
};
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/&/g, '&(amp;)?');
const contains = (text) => new RegExp(escape(text), 'i').test(html);

test('document metadata', () => {
  has('HTML title', /<title>\s*Fabriant \| Weaving Intelligence into Cloud\s*<\/title>/i.test(html));
  has('language attribute', /<html[^>]*lang="en"/i.test(html));
  has('meta description', /<meta[^>]*name="description"/i.test(html));
  has('canonical on fabriant.cloud', /<link[^>]*rel="canonical"[^>]*href="https:\/\/fabriant\.cloud\/"/i.test(html));
});

test('navigation links', () => {
  ['overview', 'offerings', 'start', 'model', 'team', 'contact'].forEach((id) => {
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
  has('hero headline', contains('Safer releases. Stronger controls. Leaner cloud spend.'));
  has('free assessment CTA', contains('Request a free 1-week assessment'));
});

test('all sections present', () => {
  ['overview', 'offerings', 'start', 'process', 'model', 'outcomes', 'team', 'faq', 'contact'].forEach((id) => {
    has(`section #${id}`, new RegExp(`<section[^>]*id="${id}"`, 'i').test(html));
  });
});

test('five offerings', () => {
  [
    'Release reliability',
    'Secure AKS and DevSecOps',
    'Azure foundations',
    'AI production readiness',
    'Specialist capacity'
  ].forEach((name) => has(`offering ${name}`, contains(`<h3>${name}</h3>`)));
});

test('how to start: engagements', () => {
  ['Cloud Assessment Sprint', 'Platform Reliability Sprint', 'Security and Cost Assessment Sprint'].forEach((name) => {
    has(`engagement ${name}`, contains(name));
  });
  has('complimentary label', contains('Complimentary'));
  ['1 week', '6–8 weeks', '4–6 weeks'].forEach((d) => has(`duration ${d}`, contains(d)));
});

test('process steps', () => {
  ['Assess', 'Improve', 'Validate', 'Transfer'].forEach((step) => {
    has(`process step ${step}`, contains(`<h4>${step}</h4>`));
  });
});

test('about: co-founder and investor only', () => {
  has('co-founder', contains('Nimesh Desai'));
  has('investor', contains('Infocusp Innovations'));
  has('backed by heading', contains('Backed by'));
  has('no partners heading', !contains('Investors & Partners'));
});

test('values', () => {
  ['Reliability', 'Innovation', 'Trust', 'Excellence'].forEach((v) => has(`value ${v}`, new RegExp(v.slice(1), 'i').test(html)));
});

test('contact form', () => {
  has('netlify form', /<form[^>]*name="contact"[^>]*data-netlify="true"/i.test(html));
  has('form-name hidden field', /<input[^>]*name="form-name"[^>]*value="contact"/i.test(html));
  ['contact-name', 'contact-email', 'contact-company', 'contact-message'].forEach((id) => {
    has(`field ${id}`, new RegExp(`id="${id}"`, 'i').test(html));
  });
  has('topic select', /<select[^>]*id="contact-topic"/i.test(html));
  has('mailbox contact@fabriant.com', /mailto:contact@fabriant\.com/i.test(html));
});

test('claims and pricing guardrails', () => {
  ['99.95%', '2-4x', '24/7', 'Azure Migrations'].forEach((claim) => {
    has(`no "${claim}" claim`, !contains(claim));
  });
  has('no dollar prices', !/\$\s?\d/.test(html));
  has('no fabriant.com web links', !/https?:\/\/(www\.)?fabriant\.com/i.test(html));
});

test('redirects point to fabriant.cloud', () => {
  has('fabriant.com redirects to fabriant.cloud', /https:\/\/fabriant\.com\/\*\s+https:\/\/fabriant\.cloud\/:splat\s+301!/.test(redirects));
  has('no redirects into fabriant.com', !/\S[ \t]+https:\/\/(www\.)?fabriant\.com\//.test(redirects));
  has('fabriant.cloud does not redirect to itself', !/^https:\/\/fabriant\.cloud\/\*/m.test(redirects));
});
