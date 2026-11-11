// Content checks for each page
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const { root, page, contains, has } = require('./helpers');

const site = JSON.parse(fs.readFileSync(path.join(root, 'src/_data/site.json'), 'utf8'));
const offerings = JSON.parse(fs.readFileSync(path.join(root, 'src/_data/offerings.json'), 'utf8'));
const offeringNames = [
  'Release reliability',
  'Secure AKS and DevSecOps',
  'Azure foundations',
  'AI production readiness',
  'Specialist capacity'
];

test('home page', () => {
  const html = page('/');
  has('home title', /<title>\s*Fabriant \| Weaving Intelligence into Cloud\s*<\/title>/i.test(html));
  has('hero headline', contains(html, 'Safer releases. Stronger controls. Leaner cloud spend.'));
  has('free assessment CTA', contains(html, 'Request a free 1-week assessment'));
  has('overview section', /<section[^>]*id="overview"/.test(html));
  has('outcomes section', /<section[^>]*id="outcomes"/.test(html));
  offerings.forEach((o) => has(`preview links to ${o.id}`, html.includes(`href="/services/#${o.id}"`)));
  has('link to all services', html.includes('href="/services/"'));
});

test('services page: five offerings', () => {
  const html = page('/services/');
  has('h1', contains(html, '<h1>What we do</h1>'));
  has('offerings data has five entries', offerings.length === 5);
  offeringNames.forEach((name) => has(`offering ${name}`, contains(html, `<h3>${name}</h3>`)));
  has('not-included small print', contains(html, 'Not included in the sprints'));
});

test('how to start page: engagements and process', () => {
  const html = page('/how-to-start/');
  has('h1', contains(html, '<h1>How to start</h1>'));
  ['Cloud Assessment Sprint', 'Platform Reliability Sprint', 'Security and Cost Assessment Sprint'].forEach((name) =>
    has(`engagement ${name}`, contains(html, name)));
  has('complimentary label', contains(html, 'Complimentary'));
  ['1 week', '6–8 weeks', '4–6 weeks'].forEach((d) => has(`duration ${d}`, contains(html, d)));
  ['Assess', 'Improve', 'Validate', 'Transfer'].forEach((step) => has(`process step ${step}`, contains(html, `<h4>${step}</h4>`)));
  has('process section', /<section[^>]*id="process"/.test(html));
  has('link to FAQ', html.includes('href="/faq/"'));
  ['free-assessment', 'release-reliability', 'security-and-cost', 'extra-engineers'].forEach((slug) =>
    has(`engagement button for ${slug}`, html.includes(`href="/contact/?topic=${slug}"`)));
});

test('about page: how we work, team, backer and values', () => {
  const html = page('/about/');
  has('h1', contains(html, '<h1>One team, working across time zones.</h1>'));
  has('company intro', contains(html, 'Fabriant is a U.S.-registered company with an engineering team based in Pune, India.'));
  ['Certified engineers', 'Everything as code', 'Within your standards'].forEach((c) => has(`card ${c}`, contains(html, c)));
  has('co-founder', contains(html, 'Nimesh Desai'));
  has('investor', contains(html, 'Infocusp Innovations'));
  has('backed by heading', contains(html, 'Backed by'));
  has('no partners heading', !contains(html, 'Investors & Partners'));
  ['team', 'values'].forEach((id) => has(`section #${id}`, new RegExp(`<section[^>]*id="${id}"`).test(html)));
  ['R', 'I', 'T', 'E'].forEach((letter, i) => {
    const word = ['eliability', 'nnovation', 'rust', 'xcellence'][i];
    has(`value ${letter}${word}`, html.includes(`<em class="value-initial">${letter}</em>${word}`));
  });
});

test('faq page', () => {
  const html = page('/faq/');
  has('h1', contains(html, '<h1>Questions we hear</h1>'));
  has('six questions', (html.match(/<details>/g) || []).length === 6);
  has('pricing answer', contains(html, 'How is a paid sprint priced?'));
});

test('contact page: Netlify form', () => {
  const html = page('/contact/');
  has('netlify form', /<form[^>]*name="contact"[^>]*action="\/contact\/thanks\/"[^>]*data-netlify="true"/i.test(html));
  has('form-name hidden field', /<input[^>]*name="form-name"[^>]*value="contact"/i.test(html));
  has('honeypot', /netlify-honeypot="company-website"/.test(html) && /name="company-website"/.test(html));
  ['contact-name', 'contact-email', 'contact-company', 'contact-message'].forEach((id) =>
    has(`field ${id}`, new RegExp(`id="${id}"`, 'i').test(html)));
  has('topic select', /<select[^>]*id="contact-topic"/i.test(html));
  site.topics.forEach((t) => has(`topic option ${t.slug}`, html.includes(`<option data-slug="${t.slug}">${t.label}</option>`)));
  has('mailbox contact@fabriant.com', /mailto:contact@fabriant\.com/i.test(html));
});

test('thank-you and 404 pages', () => {
  has('thank-you message', contains(page('/contact/thanks/'), 'Your message has been sent'));
  has('404 message', contains(page('/404.html'), '<h1>Page not found</h1>'));
});
