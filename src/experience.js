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

  // Content is visible by default. Animate only when it enters the viewport;
  // no hidden content, scroll listeners, animation library or layout shifts.
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (!reduceMotion.matches) entry.target.animate(
          [{opacity: 0, transform: 'translateY(18px)'}, {opacity: 1, transform: 'translateY(0)'}],
          {duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)'}
        );
      });
    }, {threshold: 0.12});
    document.querySelectorAll('.service-card, .about-block, .value-list > div, .article, .cta > .shell, .offering-list > div').forEach(el => observer.observe(el));
    reduceMotion.addEventListener('change', () => {
      if (reduceMotion.matches) document.getAnimations().forEach(a => a.finish());
    });
  }
}
