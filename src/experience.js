import {services} from './content.js';

export function initExperience() {
  const toggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');
  const closeMenu = (restoreFocus = false) => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    navigation.classList.remove('open');
    if (restoreFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    navigation.classList.toggle('open', open);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navigation.classList.contains('open')) closeMenu(true);
  });
  document.addEventListener('click', e => {
    if (!navigation.contains(e.target) && !toggle.contains(e.target)) closeMenu();
  });
  document.addEventListener('focusin', e => {
    if (!navigation.contains(e.target) && !toggle.contains(e.target)) closeMenu();
  });
  matchMedia('(min-width: 801px)').addEventListener('change', e => {
    if (e.matches) closeMenu();
  });

  const filters = [...document.querySelectorAll('[data-filter]')];
  if (filters.length) {
    const items = [...document.querySelectorAll('[data-category]')];
    const filterBar = document.querySelector('.filters');
    const status = document.createElement('p');
    status.className = 'result-count';
    status.setAttribute('role', 'status');
    filterBar.after(status);
    let search;
    if (document.querySelector('.all-services')) {
      const searchLabel = document.createElement('label');
      searchLabel.className = 'service-search';
      searchLabel.innerHTML = 'Find your next step<input type="search" placeholder="Search services, skills or interests…" aria-label="Search services" maxlength="120">';
      filterBar.before(searchLabel);
      search = searchLabel.querySelector('input');
    }
    const empty = document.createElement('div');
    empty.className = 'empty-results';
    empty.hidden = true;
    empty.innerHTML = '<h3>Let’s try a broader search.</h3><p>Try a different word or explore all our services.</p><button type="button" class="button secondary">Reset filters</button>';
    document.querySelector('.all-services, .articles').after(empty);
    const apply = (category, updateUrl = true) => {
      filters.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === category)));
      const query = search?.value.trim().toLowerCase() || '';
      let count = 0;
      items.forEach((item, i) => {
        const content = search ? `${item.textContent} ${services[i].items.join(' ')}` : item.textContent;
        item.hidden = !(category === 'All' || item.dataset.category === category) || !content.toLowerCase().includes(query);
        if (!item.hidden) count++;
      });
      status.textContent = `${count} ${search ? (count === 1 ? 'service' : 'services') : (count === 1 ? 'perspective' : 'perspectives')}${category === 'All' ? '' : ' in ' + category}${query ? ' matching your search' : ''}`;
      empty.hidden = count > 0;
      const guide = document.querySelector('.guide-card');
      if (guide) guide.hidden = category !== 'All' || Boolean(query);
      if (updateUrl) {
        const url = new URL(location.href);
        category === 'All' ? url.searchParams.delete('category') : url.searchParams.set('category', category);
        query ? url.searchParams.set('q', search.value.trim()) : url.searchParams.delete('q');
        history.replaceState(null, '', url);
      }
    };
    const params = new URLSearchParams(location.search);
    if (search) search.value = params.get('q') || '';
    const category = params.get('category');
    apply(filters.some(b => b.dataset.filter === category) ? category : 'All', false);
    filters.forEach(b => b.addEventListener('click', () => apply(b.dataset.filter)));
    search?.addEventListener('input', () => apply(filters.find(b => b.getAttribute('aria-pressed') === 'true').dataset.filter));
    empty.querySelector('button').addEventListener('click', () => {
      if (search) search.value = '';
      apply('All');
      (search || filters[0]).focus();
    });
  }

  document.querySelectorAll('.article details').forEach(details => {
    details.addEventListener('toggle', () => {
      details.querySelector('summary').firstChild.textContent = details.open ? 'Close perspective ' : 'Read perspective ';
    });
  });

  initMotion();
}

// Motion layer. Content is always visible without JS or animation support;
// everything below is progressive enhancement and honours reduced motion.
function initMotion() {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const root = document.documentElement;

  // Scroll progress, compact header and back-to-top share one rAF-throttled listener.
  const header = document.querySelector('header');
  const toTop = document.querySelector('.to-top');
  const heroPhoto = document.querySelector('.hero-photo img');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const max = root.scrollHeight - innerHeight;
    root.style.setProperty('--progress', max > 0 ? String(scrollY / max) : '0');
    header.classList.toggle('scrolled', scrollY > 24);
    toTop.hidden = scrollY < innerHeight * 0.9;
    if (heroPhoto && !reduceMotion.matches && scrollY < innerHeight) {
      heroPhoto.style.transform = `scale(1.08) translateY(${scrollY * 0.06}px)`;
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, {passive: true});
  onScroll();
  toTop.addEventListener('click', () => {
    scrollTo({top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth'});
    document.querySelector('.skip').focus({preventScroll: true});
  });

  // Cursor-following highlight on cards (pointer devices only).
  document.querySelectorAll('.service-card, .audience, .guide-card').forEach(card => {
    card.addEventListener('pointermove', e => {
      if (!fine.matches) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // Gentle 3D tilt on the hero visual.
  const visual = document.querySelector('.hero-visual');
  if (visual) {
    visual.addEventListener('pointermove', e => {
      if (!fine.matches || reduceMotion.matches) return;
      const r = visual.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      visual.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
      visual.style.setProperty('--ry', `${(x * 6).toFixed(2)}deg`);
    });
    visual.addEventListener('pointerleave', () => { visual.style.setProperty('--rx', '0deg'); visual.style.setProperty('--ry', '0deg'); });
  }

  if (!('IntersectionObserver' in window)) return;
  // Reveal elements as they enter; children of .stagger cascade.
  const targets = new Set(document.querySelectorAll('.section-heading, .section > h2, .section-intro, .about-block, .value-list > div, .cta > .shell, .audience-note, .next-steps li, .contact-grid form, .prose h2, .prose p'));
  document.querySelectorAll('.stagger > *').forEach(el => targets.add(el));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      const el = entry.target;
      if (reduceMotion.matches) return;
      const siblings = el.parentElement.classList.contains('stagger') ? [...el.parentElement.children].filter(c => !c.hidden) : [];
      const delay = Math.max(0, siblings.indexOf(el)) * 90;
      el.animate(
        [{opacity: 0, transform: 'translateY(26px) scale(.985)'}, {opacity: 1, transform: 'none'}],
        {duration: 750, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards'}
      );
    });
  }, {threshold: 0.12, rootMargin: '0px 0px -40px 0px'});
  targets.forEach(el => observer.observe(el));

  // Process timelines draw their connecting line when visible.
  const lineObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('in'); lineObserver.unobserve(entry.target); }
  }), {threshold: 0.3});
  document.querySelectorAll('.process').forEach(el => lineObserver.observe(el));

  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) document.getAnimations().forEach(a => a.finish());
  });
}
