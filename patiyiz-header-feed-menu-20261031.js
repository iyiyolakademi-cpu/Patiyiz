/* Patiyiz 2026-11-01: two real home timelines, accessible from the brand. */
(() => {
  'use strict';

  const CHOICES = [
    { mode: 'media', label: 'Gönderiler ve Reels', description: 'Fotoğraflar, videolar ve Reels', icon: 'i-image' },
    { mode: 'text', label: 'Tweet ve Sorular', description: 'Yazılar ve soru-cevap paylaşımları', icon: 'i-message' }
  ];
  let activeMode = 'media';
  const installed = [];

  function makeMenu(brand, kind) {
    if (!brand) return;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = kind === 'mobile' ? 'pati-feed-menu-trigger' : 'pati-feed-desktop-trigger';
    trigger.className = brand.className + ' pati-feed-brand-selector';
    trigger.setAttribute('aria-label', 'Patiyiz akışını seç');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', kind === 'mobile' ? 'pati-feed-menu' : 'pati-feed-desktop-menu');
    trigger.title = 'Akış türünü seç';
    while (brand.firstChild) trigger.appendChild(brand.firstChild);
    brand.replaceWith(trigger);

    const menu = document.createElement('div');
    menu.id = kind === 'mobile' ? 'pati-feed-menu' : 'pati-feed-desktop-menu';
    menu.className = 'pati-feed-menu pati-feed-category-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Akış türü');
    menu.hidden = true;
    menu.innerHTML = CHOICES.map(choice =>
      '<button type="button" role="menuitemradio" data-pati-feed-choice="' + choice.mode +
      '" aria-checked="false"><svg class="icon" aria-hidden="true"><use href="#' + choice.icon +
      '"></use></svg><span class="pati-feed-menu-label"><strong>' + choice.label +
      '</strong><small>' + choice.description +
      '</small></span><span class="pati-feed-selected" aria-hidden="true">✓</span></button>'
    ).join('');
    if (kind === 'mobile') trigger.closest('.mobile-header').appendChild(menu);
    else document.body.appendChild(menu);

    function close() {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }
    function sync() {
      menu.querySelectorAll('[data-pati-feed-choice]').forEach(button => {
        button.setAttribute('aria-checked', String(button.dataset.patiFeedChoice === activeMode));
      });
    }
    function open() {
      installed.forEach(item => item.close());
      if (kind === 'desktop') {
        const rect = trigger.getBoundingClientRect();
        menu.style.left = Math.max(8, Math.min(rect.right + 12, window.innerWidth - 296)) + 'px';
        menu.style.top = Math.max(8, Math.min(rect.top, window.innerHeight - 160)) + 'px';
      }
      sync();
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
    }

    trigger.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (menu.hidden) open(); else close();
    });
    menu.addEventListener('click', event => {
      const choice = event.target.closest('[data-pati-feed-choice]');
      if (!choice || !menu.contains(choice)) return;
      event.preventDefault();
      event.stopPropagation();
      const mode = choice.dataset.patiFeedChoice;
      if (mode !== 'media' && mode !== 'text') return;
      activeMode = mode;
      installed.forEach(item => { item.sync(); item.close(); });
      window.dispatchEvent(new CustomEvent('patiyiz:feed-mode', { detail: { mode } }));
      trigger.focus({ preventScroll: true });
    });
    installed.push({ trigger, menu, close, sync });
  }

  makeMenu(document.querySelector('#app-root > .mobile-header > .brand'), 'mobile');
  makeMenu(document.querySelector('#app-root .sidebar > .brand'), 'desktop');

  document.addEventListener('pointerdown', event => {
    installed.forEach(item => {
      if (!item.menu.hidden && !item.trigger.contains(event.target) && !item.menu.contains(event.target)) item.close();
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    installed.forEach(item => {
      if (!item.menu.hidden) { item.close(); item.trigger.focus({ preventScroll: true }); }
    });
  });
  window.addEventListener('resize', () => installed.forEach(item => item.close()));
  window.addEventListener('patiyiz:feed-mode-changed', event => {
    activeMode = event.detail?.mode === 'text' ? 'text' : 'media';
    installed.forEach(item => item.sync());
  });
})();
