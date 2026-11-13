// Content checks for each page
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const { root, buildDir, page, readBuild, contains, has, postUrls } = require('./helpers');

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
  has('no outcomes section', !html.includes('id="outcomes"'));
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
  has('company intro', contains(html, 'Fabriant is a U.S. registered company with an engineering team based in Pune, India.'));
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
  has('seven questions', (html.match(/<details>/g) || []).length === 7);
  has('pricing answer', contains(html, 'How is a paid sprint priced?'));
  has('migrations and onboarding answer', contains(html, 'We support Azure migrations and onboarding.'));
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
  has('status message area', /<div class="form-status" id="form-status" role="alert" hidden><\/div>/.test(html));
  has('email for the error message', /<form[^>]*data-email="contact@fabriant\.com"/.test(html));
});

test('contact form shows thanks only after a confirmed submission', () => {
  const js = readBuild('assets/js/main.js');
  has('submit handled in script', /form\.addEventListener\("submit"/.test(js) && /event\.preventDefault\(\)/.test(js));
  has('local preview is not sent', /isLocalPreview/.test(js) && /Not sent: this is a local preview/.test(js));
  has('response is checked before redirecting', /if \(!response\.ok\) throw/.test(js));
  has('failure shows an error', /Your message could not be sent/.test(js));
});

test('engineering: list page and published posts', () => {
  const list = page('/engineering/');
  has('engineering h1', contains(list, '<h1>Engineering</h1>'));
  has('draft template is not published', !fs.existsSync(path.join(buildDir, 'engineering/example-post')));
  const posts = postUrls();
  if (posts.length === 0) {
    has('empty state when no posts', contains(list, 'No articles yet'));
    has('no latest-articles section on home', !page('/').includes('id="latest-articles"'));
    return;
  }
  has('no empty state when posts exist', !contains(list, 'No articles yet'));
  has('latest articles on home', page('/').includes('id="latest-articles"'));
  const sitemap = readBuild('sitemap.xml');
  posts.forEach((url) => {
    const html = readBuild(`${url.slice(1)}index.html`);
    has(`${url} listed on /engineering/`, list.includes(`href="${url}"`));
    has(`${url} in sitemap`, sitemap.includes(`<loc>https://fabriant.com${url}</loc>`));
    has(`${url} title`, /<title>[^<]+ \| Fabriant Engineering<\/title>/.test(html));
    has(`${url} description`, /<meta name="description" content="[^"]{20,}"/.test(html));
    has(`${url} canonical`, html.includes(`<link rel="canonical" href="https://fabriant.com${url}" />`));
    has(`${url} article og:type`, html.includes('<meta property="og:type" content="article" />'));
    has(`${url} date`, /<time datetime="\d{4}-\d{2}-\d{2}">/.test(html));
    has(`${url} back link`, html.includes('href="/engineering/"'));
    has(`${url} not a draft`, !contains(html, 'Draft (not published)'));
    const hero = html.match(/<figure class="post-hero">s*<img src="([^"]+)" alt="([^"]*)"/);
    if (hero) {
      has(`${url} main image has alt text`, hero[2].trim().length > 0);
      has(`${url} main image used for sharing`, html.includes(`<meta property="og:image" content="https://fabriant.com${hero[1]}" />`));
    }
  });
});

test('thank-you and 404 pages', () => {
  has('thank-you message', contains(page('/contact/thanks/'), 'Your message has been sent'));
  has('404 message', contains(page('/404.html'), '<h1>Page not found</h1>'));
});
