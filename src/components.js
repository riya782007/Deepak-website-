import {pages,company,services} from './content.js';
export const arrow = '<svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';

// One line-icon per practice group (homepage pillars) and per service.
const glyphs = {
  Technology: '<rect x="8" y="8" width="32" height="25" rx="2"/><path d="M3 37h42l-3 4H6z"/>',
  Learning: '<path d="M24 12C18 6 9 7 3 9v29c8-2 14-1 21 4 7-5 13-6 21-4V9c-7-2-14-3-21 3v30"/>',
  People: '<circle cx="24" cy="13" r="6"/><circle cx="8" cy="17" r="4"/><circle cx="40" cy="17" r="4"/><path d="M13 40v-5a11 11 0 0 1 22 0v5M2 37v-5a7 7 0 0 1 9-7m26 0a7 7 0 0 1 9 7v5"/>',
  'it-services': '<rect x="5" y="8" width="38" height="28" rx="3"/><path d="M5 15h38M19 22l-5 4 5 4m10-8 5 4-5 4M17 42h14"/>',
  'it-education': '<rect x="9" y="10" width="30" height="20" rx="2"/><path d="M4 36h40M20 18l-3 3 3 3m8-6 3 3-3 3"/><path d="M15 42h18"/>',
  'corporate-training': '<rect x="6" y="6" width="36" height="24" rx="2"/><path d="M24 30v6m-8 6 8-6 8 6M13 22l7-7 5 5 9-9"/>',
  'hr-consulting': glyphsPeople(),
  'student-services': '<path d="M3 18 24 8l21 10-21 10z"/><path d="M11 22v10c4 4 22 4 26 0V22M45 18v12"/>',
  'personal-development': '<path d="M24 42V22"/><path d="M24 26c0-8-6-13-15-13 0 9 6 13 15 13zm0-4c0-8 6-14 15-14 0 9-6 14-15 14z"/><path d="M14 42h20"/>',
  'digital-learning': '<rect x="5" y="9" width="38" height="26" rx="3"/><path d="m21 16 9 6-9 6z"/><path d="M15 41h18"/>'
};
function glyphsPeople(){return '<circle cx="24" cy="15" r="7"/><path d="M10 42v-4a14 14 0 0 1 28 0v4"/><path d="M37 8l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z"/>';}
export const icon = (key) => `<svg aria-hidden="true" width="42" height="42" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${glyphs[key]||glyphs.People}</svg>`;

export const button=(label,href,secondary=false)=>`<a class="button ${secondary?'secondary':''}" href="/${href}">${label}${arrow}</a>`;

export function header(path){return `<a class="skip" href="#main">Skip to content</a><div class="scroll-progress" aria-hidden="true"></div><header><div class="shell nav"><a class="brand" href="/" aria-label="Soft Binomials India home"><span class="brand-mark">sb<span>·</span></span><span>Soft Binomials<small>INDIA</small></span></a><button class="menu-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="navigation"><span></span><span></span><span></span></button><nav id="navigation" aria-label="Main navigation">${[['','Home'],['about','About us'],['services','Services'],['insights','Insights'],['contact','Contact']].map(([p,t])=>`<a href="/${p}" ${p===path?'aria-current="page"':p==='services'&&services.some(s=>s.slug===path)?'class="active-section"':''}>${t}</a>`).join('')}</nav>${button('Let’s talk','contact')}</div></header>`;}

export function footer(){return `<footer><div class="shell footer-grid"><div><a class="footer-brand" href="/"><span class="brand-mark">sb<span>·</span></span>${company.name}</a><p>Connecting learning, technology and human potential to help individuals and organisations move forward.</p></div><div><h3>Explore</h3>${pages.filter(([p])=>['about','services','insights','careers','social-impact'].includes(p)).map(([p,t])=>`<a href="/${p}">${t}</a>`).join('')}</div><div><h3>Our services</h3>${services.map(s=>`<a href="/${s.slug}">${s.title}</a>`).join('')}</div><div><h3>Let’s connect</h3><p>Have a question or a project in mind? Let’s start a conversation.</p>${button('Get in touch','contact',true)}</div></div><div class="shell footer-bottom"><span>© ${new Date().getFullYear()} Soft Binomials India</span><span>People. Technology. Possibilities.</span><a href="/privacy">Privacy</a></div></footer><button class="to-top" type="button" aria-label="Back to top" hidden><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 19V5m-6 6 6-6 6 6"/></svg></button>`;}

export const cta=()=>`<section class="cta"><span class="cta-orb one" aria-hidden="true"></span><span class="cta-orb two" aria-hidden="true"></span><div class="shell"><div><span class="label">Start a conversation</span><h2>Let’s build what’s next.</h2><p>Whether it’s a technology initiative, a learning journey or a people-focused<br class="desktop"> transformation, we’d love to explore what’s possible together.</p></div>${button('Let’s talk','contact')}</div></section>`;

// `key` lets homepage pillars use group icons while service cards use their own.
export const card=(s,key=s.slug)=>`<a class="service-card ${s.color}" href="/${s.slug}"><span class="card-icon">${icon(key)}</span><h3>${s.title}</h3><p>${s.intro}</p><span class="text-link">Explore ${s.title}${arrow}</span></a>`;
