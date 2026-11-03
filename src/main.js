import {initExperience} from './experience.js';
import {company,services,pages,articles,audiences,process} from './content.js';
import {header,footer,cta,button,card,arrow,icon} from './components.js';
import {submitEnquiry} from './integrations.js';

const path=location.pathname.replace(/^\/|\/$/g,'');
const current=pages.find(([p])=>p===path);
const bySlug=slug=>services.find(s=>s.slug===slug);
const shapes='<span class="hero-shape a" aria-hidden="true"></span><span class="hero-shape b" aria-hidden="true"></span><span class="hero-shape c" aria-hidden="true"></span>';

const hero=(title,description,color='lavender',art='')=>`<section class="page-hero ${color}">${shapes}<div class="shell page-hero-inner"><div><div class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span>${services.some(s=>s.slug===path)?`<a href="/services">Services</a><span aria-hidden="true">/</span>`:''}<span aria-current="page">${current?.[1]||'Page not found'}</span></div><h1>${title}</h1><p>${description}</p></div>${art?`<div class="page-hero-art" aria-hidden="true">${art}</div>`:''}</div></section>`;

const processSteps=()=>`<ol class="process">${process.map(([t,d],i)=>`<li style="--i:${i}"><span class="process-dot">0${i+1}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}</ol>`;

function home(){
  const keywords=services.flatMap(s=>s.items);
  const pillars=[
    [{...services[0],slug:'services?category=Technology'},'Technology'],
    [{...services[2],slug:'services?category=Learning',title:'Learning & development'},'Learning'],
    [{...services[3],slug:'services?category=People',title:'People & consulting'},'People']
  ];
  return `<section class="hero"><span class="hero-shape a" aria-hidden="true"></span><span class="hero-shape b" aria-hidden="true"></span><div class="shell hero-inner"><div><span class="eyebrow"><span class="pulse" aria-hidden="true"></span>Learning · Technology · People</span><h1 class="split"><span>People.</span><br><em>Technology.</em><br><span>Possibilities.</span></h1><p>Connecting learning, technology and human potential to help individuals and organisations move forward.</p><div class="actions">${button('Explore our services','services')}${button('Get to know us','about',true)}</div><ul class="hero-facts"><li><strong>${services.length}</strong> service areas</li><li><strong>3</strong> connected practices</li><li><strong>1</strong> people-first approach</li></ul></div><div class="hero-visual"><div class="hero-photo"><img src="/team.jpg" alt="Indian professionals sharing ideas around a laptop in a bright office" fetchpriority="high" width="960" height="640"></div><a class="float-chip mint" href="/services?category=Technology" style="--d:0s">${icon('Technology')}Technology & IT</a><a class="float-chip lavender" href="/services?category=Learning" style="--d:-2s">${icon('Learning')}Learning & development</a><a class="float-chip peach" href="/services?category=People" style="--d:-4s">${icon('People')}People & consulting</a></div></div></section>
<div class="marquee" aria-label="Areas we work in"><div class="marquee-track">${[0,1].map(n=>`<div class="marquee-group" ${n?'aria-hidden="true"':''}>${keywords.map(k=>`<span>${k}</span>`).join('')}</div>`).join('')}</div></div>
<div class="shell statement"><span>Learning that <em>empowers.</em></span><span>Technology that <em>enables.</em></span><span>People who <em>thrive.</em></span></div>
<section class="shell section"><span class="label">What we do</span><h2>Different strengths. Shared possibilities.</h2><p class="section-intro">A focused set of services that brings learning, technology and people together to create<br class="desktop"> meaningful and lasting impact.</p><div class="cards stagger">${pillars.map(([s,k])=>card(s,k)).join('')}</div></section>
<section class="audience-band"><div class="shell section"><div class="section-heading"><div><span class="label">Who we serve</span><h2>Find the right place to start.</h2></div>${button('View all services','services',true)}</div><div class="audiences stagger">${audiences.map((a,i)=>`<article class="audience" style="--i:${i}"><span class="audience-no">0${i+1}</span><h3>${a.title}</h3><p>${a.text}</p><div class="audience-links">${a.links.map(l=>`<a href="/${l}">${bySlug(l).title}${arrow}</a>`).join('')}</div></article>`).join('')}</div></div></section>
<section class="shell section"><div class="section-heading"><div><span class="label">How we work</span><h2>A clear path from idea to impact.</h2></div></div>${processSteps()}</section>
<section class="shell about-block"><div class="about-media"><img src="/team.jpg" alt="A collaborative team discussion" loading="lazy" width="960" height="640"><span class="about-badge">${icon('Learning')}<span>Learning, technology<br>&amp; people, together</span></span></div><div><span class="label">About us</span><h2>Progress starts<br>with people.</h2><p>Soft Binomials India is a people, learning and technology company that helps individuals and organisations move forward.</p><p>We bring together practical technology expertise, meaningful learning experiences and a people-first consulting approach to solve real business challenges and create new opportunities for growth.</p><ul class="checks"><li>Programmes shaped around your context</li><li>Practical outcomes, not one-size-fits-all</li><li>One partner across technology, learning and people</li></ul>${button('About us','about',true)}</div></section>${cta()}`;
}

function servicePage(s){
  return `${hero(s.heading,s.intro,s.color,`<span class="art-ring"></span>${icon(s.slug)}`)}<section class="shell detail-layout section"><aside aria-label="Browse services"><h3>Our services</h3>${services.map(x=>`<a href="/${x.slug}" ${x.slug===s.slug?'aria-current="page"':''}>${x.title}${arrow}</a>`).join('')}</aside><div><span class="label">${s.title}</span><h2>Built around your next step.</h2><p class="lead">${s.detail}</p><div class="audience-note ${s.color}"><strong>Who it’s for</strong><p>${s.audience}</p></div><h3 class="spaced">How we can help</h3><div class="offering-list stagger">${s.items.map((item,i)=>`<div style="--i:${i}"><span>0${i+1}</span><h3>${item}</h3></div>`).join('')}</div><h3 class="spaced">A thoughtful approach, from the start.</h3>${processSteps()}<p>Tell us what you have in mind and we’ll explore a programme or solution that fits.</p>${button('Discuss your requirements',`contact?service=${s.slug}`)}</div></section><section class="shell related-section"><div class="section-heading"><div><span class="label">Keep exploring</span><h2>Connected expertise.</h2></div><a class="text-link" href="/services">View all services ${arrow}</a></div><div class="cards stagger">${services.filter(x=>x.slug!==s.slug).sort((a,b)=>Number(b.group===s.group)-Number(a.group===s.group)).slice(0,2).map(x=>card(x)).join('')}</div></section>${cta()}`;
}

function servicesIndex(){
  return `${hero('Connected expertise.<br>More possibilities.','Explore services for your business, your team and your own development.')}<section class="shell section"><div class="filters" role="group" aria-label="Filter services">${['All','Technology','Learning','People'].map((s,i)=>`<button data-filter="${s}" aria-pressed="${i===0}">${s}</button>`).join('')}</div><div class="cards all-services stagger">${services.map(s=>`<div data-category="${s.group}">${card(s)}</div>`).join('')}<div class="guide-card"><div><span class="label">Not sure where to start?</span><h3>Tell us your goal. We’ll suggest the right mix.</h3><p>Many needs span technology, learning and people. Share yours and we’ll shape a clear next step together.</p></div>${button('Start a conversation','contact')}</div></div></section>${cta()}`;
}

function contact(){
  const next=[['Share your goals','A few lines about what you want to achieve.'],['We shape a brief','We clarify scope, format and the right service mix.'],['Agree next steps','A practical plan you can act on with confidence.']];
  return `${hero('Good things start<br>with a conversation.','Tell us a little about your goals. Let’s explore the possibilities together.')}<section class="shell section contact-grid"><div><h2>What’s your next step?</h2><p>Whether you’re building a team, exploring a learning pathway or planning a digital project, start here.</p><ol class="next-steps">${next.map(([t,d],i)=>`<li><span>${i+1}</span><div><h3>${t}</h3><p>${d}</p></div></li>`).join('')}</ol><div class="contact-note"><h3>A conversation with purpose.</h3><p>Share your interests and we’ll help you shape a clear brief.</p><p class="small">Prepare a private enquiry brief to download and keep. Online submission is not available yet.</p></div></div><form id="enquiry" novalidate><h2>Your next chapter, in a few words.</h2><p class="form-intro">All fields are required unless marked optional.</p><div class="form-row"><label>Your name<input name="name" autocomplete="name" required maxlength="100" placeholder="Full name"></label><label>Email address<input name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@company.com"></label></div><label>Organisation <span>(optional)</span><input name="organisation" autocomplete="organization" maxlength="160" placeholder="Company or institution"></label><fieldset class="interest"><legend>I’m interested in</legend><div class="interest-options"><label><input type="radio" name="service" value="general" checked><span>A general conversation</span></label>${services.map(s=>`<label><input type="radio" name="service" value="${s.slug}"><span>${s.title}</span></label>`).join('')}</div></fieldset><label>How can we help?<textarea name="message" required minlength="10" maxlength="4000" rows="5" placeholder="Tell us about your goals, team or project…"></textarea><span class="char-count" aria-hidden="true">0 / 4000</span></label><label class="consent"><input type="checkbox" required> <span>I understand how my information is handled as described in the <a href="/privacy">privacy notice</a>.</span></label><button class="button" type="submit">Prepare enquiry ${arrow}</button><div id="enquiry-result" tabindex="-1" hidden><p id="form-status" role="status" aria-live="polite"></p><a id="download" hidden download="soft-binomials-enquiry.txt" class="button">Download your enquiry ${arrow}</a></div></form></section>`;
}

function insights(){return `${hero('Ideas for moving forward.','Perspectives on learning, people and technology.')}<section class="shell section"><p class="small">A few ideas to start a conversation. Editorial previews.</p><div class="filters" role="group" aria-label="Filter insights">${['All','Leadership','Learning','Technology'].map((s,i)=>`<button data-filter="${s}" aria-pressed="${i===0}">${s}</button>`).join('')}</div><div class="cards articles stagger">${articles.map((a,i)=>`<article class="article" data-category="${a.category}"><div class="article-art ${['peach','lavender','mint'][i]}"><span>0${i+1}</span>${['A little more<br>understanding.','Always<br>be learning.','Purpose before<br>platforms.'][i]}</div><span class="label">${a.category}</span><h2>${a.title}</h2><details><summary>Read perspective ${arrow}</summary><p>${a.text}</p></details></article>`).join('')}</div></section>${cta()}`;}

const editorial={
 'about':{title:'Different strengths.<br>One shared purpose.',intro:'Bringing people, learning and technology together to open up new possibilities.',heading:'Progress starts with people.',text:'Soft Binomials India brings a connected approach to technology services, education and people development. Our aim is simple: help individuals and organisations take their next step with clarity and confidence.',items:[['Technology with purpose','Digital solutions shaped around the needs of the people who use them.'],['Learning for life','Relevant learning experiences that turn knowledge into practical capability.'],['People at the centre','A thoughtful approach to growth, grounded in understanding and collaboration.']],extra:'about'},
 'social-impact':{title:'Progress means<br>bringing people along.',intro:'Explore opportunities to make learning and personal development more accessible.',heading:'Opportunity grows when we share it.',text:'Our social impact template creates a home for your community initiatives, digital literacy programmes and awareness activities. Add approved programme details, participation information and impact stories as initiatives are confirmed.',items:[['Digital inclusion','A place for community learning and digital literacy initiatives.'],['Personal wellbeing','A place for awareness activities, including freedom from addiction.'],['Community collaboration','A place for partnerships and opportunities to contribute.']]},
 'careers':{title:'Make room for<br>meaningful work.',intro:'For people who care about learning, thoughtful technology and helping others grow.',heading:'Bring your perspective.',text:'This is the future home of career opportunities at Soft Binomials India. There are no published vacancies at present. Explore our services to learn about the areas in which we work.',items:[['Technology','Building thoughtful digital experiences.'],['Learning','Helping people develop practical capabilities.'],['Consulting','Connecting people insights with meaningful action.']]}
};
const aboutExtra=()=>`<section class="shell about-block"><div class="about-media"><img src="/team.jpg" alt="A collaborative team discussion" loading="lazy" width="960" height="640"></div><div><span class="label">Our approach</span><h2>One partner for<br>your next step.</h2><p>Many challenges sit across technology, learning and people. We bring these strengths together so plans connect and progress lasts.</p>${processSteps()}</div></section>`;
function editorialPage(p){return `${hero(p.title,p.intro)}<section class="shell section editorial"><h2>${p.heading}</h2><p class="lead">${p.text}</p><div class="value-list stagger">${p.items.map(([t,d],i)=>`<div><span>0${i+1}</span><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></section>${p.extra==='about'?aboutExtra():''}${cta()}`;}

function privacy(){return `${hero('Your information,<br>handled thoughtfully.','Template privacy notice · to be reviewed before public launch.')}<section class="shell section prose"><h2>What this template does</h2><p>The enquiry form processes your details in your browser to create a downloadable text file. It does not send your enquiry to Soft Binomials India, store it on a server or retain it after you leave this page.</p><h2>Your choices</h2><p>Only enter details you are comfortable including in your enquiry. Avoid sensitive personal information. You control whether to download or share the prepared file.</p><h2>Cookies and external services</h2><p>This template does not use analytics, advertising cookies or third-party embeds. Fonts and images are served with the website. Hosting providers may process standard request logs according to their own policies.</p><h2>Before launch</h2><p>The company must add its approved legal identity, contact address, data retention rules and any service-provider disclosures when connecting enquiry delivery, CRM, payments, analytics or AI features.</p></section>`;}

const notFound=()=>`${hero('This page took<br>a different path.','The page you’re looking for could not be found. These are good places to continue.')}<section class="shell section"><div class="cards stagger">${[services[0],services[2],services[3]].map(s=>card(s)).join('')}</div><p style="margin-top:32px">${button('Back to home','')}</p></section>`;

const body=path===''?home():path==='services'?servicesIndex():bySlug(path)?servicePage(bySlug(path)):path==='contact'?contact():path==='insights'?insights():editorial[path]?editorialPage(editorial[path]):path==='privacy'?privacy():notFound();
document.title=`${current?.[1]||'Page not found'} | ${company.name}`;
document.querySelector('#app').innerHTML=header(path)+`<main id="main">${body}</main>`+footer();
initExperience();

const form=document.querySelector('#enquiry');
if(form){
  const selected=new URLSearchParams(location.search).get('service');
  if(services.some(s=>s.slug===selected))form.querySelector(`input[value="${selected}"]`).checked=true;
  const message=form.elements.message, counter=form.querySelector('.char-count');
  const result=document.querySelector('#enquiry-result'), status=document.querySelector('#form-status'), link=document.querySelector('#download');
  let file;
  // Inline validation: show errors after a field is first left, then live.
  form.querySelectorAll('input:not([type=radio]),textarea').forEach(f=>{
    f.addEventListener('blur',()=>f.classList.add('touched'));
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    form.querySelectorAll('input,textarea').forEach(f=>f.classList.add('touched'));
    if(!form.checkValidity()){form.querySelector(':invalid')?.focus();form.reportValidity();return;}
    const data=new FormData(form);
    const text=`Enquiry for ${company.name}\n\nName: ${data.get('name')}\nEmail: ${data.get('email')}\nOrganisation: ${data.get('organisation')}\nInterest: ${bySlug(data.get('service'))?.title||'General conversation'}\n\n${data.get('message')}`;
    if(file)URL.revokeObjectURL(file);
    try{
      const outcome=await submitEnquiry(data,text);
      result.hidden=false;
      if(outcome.sent){link.hidden=true;status.textContent='Thank you. Your enquiry has been sent.';}
      else{file=outcome.file;link.href=file;link.hidden=false;status.textContent='Your enquiry is ready to download. It has not been sent.';}
    }catch{result.hidden=false;link.hidden=true;status.textContent='Something went wrong. Please try again.';}
    result.classList.remove('pop');void result.offsetWidth;result.classList.add('pop');
    result.focus({preventScroll:true});
  });
  form.addEventListener('input',()=>{
    counter.textContent=`${message.value.length} / 4000`;
    link.hidden=true;result.hidden=true;status.textContent='';
  });
}
