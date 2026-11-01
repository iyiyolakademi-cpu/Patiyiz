/* Mobile Reels caption disclosure and single-active-player safety.
   Complements app.js without replacing its scroll-snap playback observer. */
(() => {
  'use strict';
  const main = document.getElementById('main-content');
  if (!main) return;
  let pending = false;
  function enhanceCaptions(){
    pending = false;
    for (const caption of main.querySelectorAll('.pati-reel-caption:not([data-pati-disclosure])')) {
      const text = caption.querySelector('.pati-reel-caption-text');
      if (!text) continue;
      caption.dataset.patiDisclosure = '1';
      const length = text.textContent.trim().length;
      if (length < 75) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pati-reel-caption-toggle';
      button.textContent = 'Devamını gör';
      button.setAttribute('aria-label', 'Video açıklamasının tamamını göster');
      button.setAttribute('aria-expanded', 'false');
      caption.appendChild(button);
      // Hide the control if the caption already fits in two lines.
      requestAnimationFrame(() => {
        if (!button.isConnected) return;
        const clipped = text.scrollHeight > text.clientHeight + 3;
        if (!clipped && length < 106) button.hidden = true;
      });
    }
  }
  function schedule(){
    if (pending) return;
    pending = true;
    requestAnimationFrame(enhanceCaptions);
  }
  const observer = new MutationObserver(records => {
    if (records.some(record => record.addedNodes.length && (
        record.target === main || record.target.closest?.('.pati-reels-viewport')))) schedule();
  });
  observer.observe(main, {childList:true,subtree:true});
  schedule();

  document.addEventListener('click', event => {
    const button = event.target.closest?.('.pati-reel-caption-toggle');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const caption = button.closest('.pati-reel-caption');
    if (!caption) return;
    const expanded = caption.classList.toggle('is-expanded');
    button.textContent = expanded ? 'Daha az göster' : 'Devamını gör';
    button.setAttribute('aria-expanded', String(expanded));
    button.setAttribute('aria-label', expanded ? 'Video açıklamasını daralt' : 'Video açıklamasının tamamını göster');
  }, true);

  // Pause Reel playback when the application is backgrounded or another page takes focus.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) for (const video of main.querySelectorAll('.pati-reel-video')) {
      if (!video.paused) video.pause();
    }
  });

  // A second video starting to play must immediately silence the prior Reel.
  // The app's own observer still determines which slide should autoplay.
  document.addEventListener('play', event => {
    const playing = event.target;
    if (!(playing instanceof HTMLVideoElement) ||
        !playing.matches('#main-content .pati-reel-video')) return;
    for (const other of main.querySelectorAll('.pati-reel-video')) {
      if (other !== playing && !other.paused) other.pause();
    }
  }, true);
})();
