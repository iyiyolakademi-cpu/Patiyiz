/* Patiyiz: saved content in an Instagram-style 3-column importance list.
 * Reads/writes ONLY the signed-in user's public.post_saves.importance.
 * This module never creates a second save record or changes post visibility.
 */
(() => {
  'use strict';
  let context = null;
  let filter = 'all';
  let activeChoice = null;
  let busy = false;
  const options = {
    green: {title: 'Yeşil', explanation: 'Çok önemli değil · Sonra bakabilirim'},
    orange: {title: 'Turuncu', explanation: 'Orta önemli · Yakında inceleyeceğim'},
    red: {title: 'Kırmızı', explanation: 'Kesin bak · Öncelikli olarak incele'}
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g,
    ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const ownSaves = () => (context?.data?.saves || []).filter(row =>
    row.user_id === context?.me?.id && context.saved.has(row.post_id));
  const savedRow = id => ownSaves().find(row => row.post_id === id);
  const importance = id => options[savedRow(id)?.importance] ? savedRow(id).importance : 'green';

  function visiblePosts() {
    if (!context?.me) return [];
    const savedTimes = new Map(ownSaves().map(row => [row.post_id, row.created_at]));
    return context.data.posts.filter(post =>
      context.saved.has(post.id) &&
      !context.blocked.has(post.author_id) &&
      (filter === 'all' || importance(post.id) === filter)
    ).sort((a, b) =>
      new Date(savedTimes.get(b.id) || b.created_at) -
      new Date(savedTimes.get(a.id) || a.created_at) ||
      String(b.id).localeCompare(String(a.id))
    );
  }

  function mediaTile(post, i) {
    const images = Array.isArray(post.images) ? post.images.filter(Boolean) : [];
    const cover = post.video_cover_url || images[0] || post.image_url || '';
    const video = post.video_url ||
      (Array.isArray(post.media_videos) ? post.media_videos.find(Boolean) : '') || '';
    const isVideo = !!video || post.post_format === 'reels';
    const tag = importance(post.id);
    const fallback = String(post.body || 'Kaydedilen içerik').trim().slice(0, 100);
    const media = cover
      ? '<img src="' + esc(cover) + '" alt="" loading="' + (i < 6 ? 'eager' : 'lazy') + '" decoding="async">'
      : video
        ? '<video src="' + esc(video) + '" muted playsinline webkit-playsinline preload="metadata" aria-hidden="true"></video>'
        : '<span class="pati-saved-text-tile">' + esc(fallback) + '</span>';
    const kind = isVideo ? '<span class="pati-saved-kind" aria-hidden="true">▶</span>' :
      images.length > 1 ? '<span class="pati-saved-kind" aria-hidden="true">▣</span>' : '';
    return '<article class="pati-saved-tile" data-importance="' + tag + '">' +
      '<button type="button" class="pati-saved-tile-open" data-saved-action="open" data-id="' +
      esc(post.id) + '" aria-label="Kaydedilen gönderiyi aç">' + media + kind + '</button>' +
      '<button type="button" class="pati-saved-level" data-saved-action="priority" data-id="' +
      esc(post.id) + '" aria-label="' + options[tag].title +
      ' önem derecesini değiştir" title="Önem derecesini değiştir"><span></span></button></article>';
  }

  function render(ctx) {
    if (ctx) context = ctx;
    if (!context?.me?.id) return;
    const root = document.getElementById('main-content');
    if (!root) return;
    const items = visiblePosts();
    const filters = [['all','Tümü'],['green','Yeşil'],['orange','Turuncu'],['red','Kırmızı']];
    const intro = !context.saved.size ? 'Henüz kaydettiğin bir paylaşım yok.' :
      filter !== 'all' ? 'Bu önem düzeyinde henüz kayıt yok.' :
      'Kaydedilmiş paylaşım bulunamadı.';
    root.innerHTML =
      '<section class="pati-saved-screen" aria-label="Kaydedilen paylaşımlar">' +
      '<header class="pati-saved-page-header">' +
      '<button type="button" class="pati-saved-back" data-saved-action="back" aria-label="Ana akışa dön">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" aria-hidden="true"><path d="m15 4-8 8 8 8"/></svg></button>' +
      '<h1>Kaydedildi</h1><span aria-hidden="true" class="pati-saved-header-space"></span>' +
      '</header>' +
      '<div class="pati-saved-filters" role="group" aria-label="Önem listesi">' +
      filters.map(([id, title]) =>
        '<button type="button" class="pati-saved-filter' + (filter === id ? ' active' : '') +
        '" data-saved-action="filter" data-level="' + id +
        '" aria-pressed="' + (filter === id) + '">' +
        (id !== 'all' ? '<i class="pati-saved-color-dot ' + id + '" aria-hidden="true"></i>' : '') +
        title + '</button>'
      ).join('') +
      '</div>' +
      '<div class="pati-saved-subhead"><h2>Önem listesi</h2><span>' + items.length + ' kayıt</span></div>' +
      (items.length
        ? '<div class="pati-saved-grid">' + items.map(mediaTile).join('') + '</div>'
        : '<div class="pati-saved-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg><p>' +
          intro + '</p><small>' +
          (!context.saved.size ? 'Akıştan bir gönderiyi kaydederek başlayabilirsin.' :
          'Tümü sekmesinden kayıtlarının önem rengini değiştirebilirsin.') +
          '</small></div>') +
      '<p class="pati-saved-hint">Önem derecesini değiştirmek için görselin köşesindeki renkli noktaya dokun.</p>' +
      '</section>';
    context.fetchMissingSavedPosts();
  }

  function closeChoice() {
    document.getElementById('pati-saved-choice-overlay')?.remove();
    activeChoice = null;
  }

  function openChoice(id) {
    if (!context?.me?.id || !context.saved.has(id)) return;
    closeChoice();
    activeChoice = id;
    const layer = document.createElement('div');
    layer.className = 'pati-saved-choice-overlay';
    layer.id = 'pati-saved-choice-overlay';
    layer.innerHTML =
      '<div class="pati-saved-choice-scrim" data-saved-action="dismiss"></div>' +
      '<section class="pati-saved-choice-panel" role="dialog" aria-modal="true" aria-label="Önem derecesi seç">' +
      '<header><h2>Ne kadar önemli?</h2><button type="button" data-saved-action="dismiss" aria-label="Kapat">×</button></header>' +
      '<p>Bu kaydı tekrar incelemek için önem derecesini belirle.</p>' +
      Object.entries(options).map(([level, item]) =>
        '<button type="button" class="pati-saved-choice-row" data-saved-action="assign" data-level="' +
        level + '" aria-pressed="' + (importance(id) === level) + '">' +
        '<i class="pati-saved-color-dot ' + level + '"></i><span><strong>' + item.title +
        '</strong><small>' + item.explanation + '</small></span>' +
        (importance(id) === level ? '<b aria-hidden="true">✓</b>' : '') +
        '</button>'
      ).join('') + '</section>';
    document.body.appendChild(layer);
    layer.querySelector('.pati-saved-choice-row')?.focus();
  }

  async function assignImportance(level) {
    if (!context || !activeChoice || !options[level] || busy) return;
    const id = activeChoice;
    const owner = context.me?.id;
    if (!owner || !context.saved.has(id)) return;
    busy = true;
    const buttons = [...document.querySelectorAll('.pati-saved-choice-row')];
    buttons.forEach(button => button.disabled = true);
    try {
      const result = await context.sb.from('post_saves')
        .update({importance:level})
        .eq('user_id', owner)
        .eq('post_id', id)
        .select('post_id,importance')
        .single();
      if (result.error) throw result.error;
      if (context.me?.id !== owner) return;
      if (result.data?.post_id !== id || result.data?.importance !== level) {
        throw new Error('Kaydedilen önem derecesi doğrulanamadı.');
      }
      const record = context.data.saves.find(row => row.user_id === owner && row.post_id === id);
      if (record) record.importance = level;
      closeChoice();
      if (document.querySelector('#main-content > .pati-saved-screen')) render();
      context.notify('Önem derecesi: ' + options[level].title);
    } catch (err) {
      if (context.me?.id === owner) {
        context.notify('Önem derecesi kaydedilemedi: ' + String(err?.message || 'Tekrar dene'), true);
        buttons.forEach(button => button.disabled = false);
      }
    } finally {
      busy = false;
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-saved-action]');
    if (!button) return;
    const action = button.dataset.savedAction;
    if (action === 'assign') {
      event.preventDefault();
      void assignImportance(button.dataset.level);
    } else if (action === 'dismiss') {
      if (!busy) closeChoice();
    } else if (action === 'filter') {
      if (button.dataset.level === 'all' || options[button.dataset.level]) {
        filter = button.dataset.level;
        render();
      }
    } else if (action === 'back') {
      context?.navigate('home');
    } else if (action === 'open') {
      context?.openPost(button.dataset.id);
    } else if (action === 'priority') {
      openChoice(button.dataset.id);
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeChoice && !busy) closeChoice();
  });
  function choose(id, ctx) {
    if (ctx) context = ctx;
    openChoice(id);
  }
  window.PatiyizSavedV2 = {render, visiblePosts, choose};
})();
