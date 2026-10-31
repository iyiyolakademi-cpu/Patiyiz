/* Patiyiz mobile feed selector — use existing feed routes; no new database tables. */
(() => {
  'use strict';
  const trigger = document.getElementById('pati-feed-menu-trigger');
  const menu = document.getElementById('pati-feed-menu');
  if (!trigger || !menu) return;
  const homeTabs = () => document.querySelector('#main-content > .pati-home-feed-tabs');
  const closeMenu = () => {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  };
  const syncMenu = () => {
    const following = homeTabs()?.querySelector('[data-id="following"]')?.getAttribute('aria-selected') === 'true';
    menu.querySelectorAll('[data-pati-feed-choice]').forEach(button => {
      const selected = button.dataset.patiFeedChoice === (following ? 'following' : 'all');
      button.setAttribute('aria-checked', String(selected));
    });
  };
  trigger.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (menu.hidden) {
      syncMenu();
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
    } else {
      closeMenu();
    }
  });
  menu.addEventListener('click', event => {
    const choice = event.target.closest('[data-pati-feed-choice]');
    if (choice && menu.contains(choice)) {
      event.preventDefault();
      event.stopPropagation();
      const mode = choice.dataset.patiFeedChoice;
      if (mode !== 'all' && mode !== 'following') return;
      closeMenu();
      if (!homeTabs()) {
        const homeButton = document.querySelector('#mobile-nav [data-view="home"]')
          || document.querySelector('#desktop-nav [data-view="home"]');
        homeButton?.click();
      }
      const tab = homeTabs()?.querySelector('[data-action="home-feed-tab"][data-id="' + mode + '"]');
      if (tab) {
        tab.click(); // Existing feed action loads the chosen timeline and keeps stories visible.
        window.scrollTo({top:0,behavior:'instant'});
      }
      return;
    }
    if (event.target.closest('[data-view="saved-posts"]')) {
      closeMenu(); // Let the existing delegated navigation handler open saved posts.
    }
  });
  document.addEventListener('click', event => {
    if (!menu.hidden && !menu.contains(event.target) && !trigger.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      closeMenu();
      trigger.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 740 && !menu.hidden) closeMenu();
  });
})();
