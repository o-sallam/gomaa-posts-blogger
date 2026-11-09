/* Pure HTML renderers escape all values originating in the post export. */
(() => {
  'use strict';
  const blog = window.GomaaBlog;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
  const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  function meta(post) {
    return `<div class="post-meta"><time datetime="${escape(post.date)}">${escape(blog.posts.formatDate(post))}</time><span class="meta-dot"></span><span class="read-time">${icon('clock')}${post.minutes} د قراءة</span></div>`;
  }

  function saveButton(post, saved) {
    return `<button class="icon-button${saved ? ' is-saved' : ''}" data-save="${post.id}" aria-label="${saved ? 'إلغاء حفظ' : 'حفظ'} التدوينة: ${escape(post.displayTitle)}" aria-pressed="${saved}" title="${saved ? 'إلغاء الحفظ' : 'حفظ لوقت لاحق'}">${icon('bookmark')}</button>`;
  }

  function image(post, featured = false) {
    return `<button class="${featured ? 'featured-image-button' : 'card-image-button'}" data-open="${post.id}" aria-label="اقرأ: ${escape(post.displayTitle)}" tabindex="-1"><img src="${escape(blog.config.defaultImage)}" alt="رسم افتراضي لكتاب مفتوح" width="800" height="560" ${featured ? 'fetchpriority="high"' : 'loading="lazy"'}>${featured ? '' : `<span class="card-year">${escape(post.year)}</span>`}</button>`;
  }

  function featured(post, saved) {
    return `<article class="featured-card"><div class="featured-copy"><span class="post-tag">بوست الجمعة</span><h2><button class="post-open" data-open="${post.id}">${escape(post.displayTitle)}</button></h2><p class="featured-excerpt">${escape(post.excerpt)}</p>${meta(post)}<div class="featured-bottom"><button class="button button-tonal" data-open="${post.id}">اقرأ التدوينة ${icon('arrow')}</button>${saveButton(post, saved)}</div></div>${image(post, true)}</article>`;
  }

  function card(post, saved) {
    return `<article class="post-card" data-post-id="${post.id}">${image(post)}<div class="card-body">${meta(post)}<h3><button class="post-open card-title" data-open="${post.id}">${escape(post.displayTitle)}</button></h3><p class="card-excerpt">${escape(post.excerpt)}</p><div class="card-footer"><button class="text-button" data-open="${post.id}">اقرأ التدوينة ${icon('arrow')}</button>${saveButton(post, saved)}</div></div></article>`;
  }

  function yearFilters(years, selected) {
    const chips = [['', 'الكل'], ...years.slice(0, 3).map(([year]) => [year, year])]
      .map(([year, label]) => `<button class="filter-chip${selected === year ? ' is-active' : ''}" data-year="${year}" aria-pressed="${selected === year}">${label}</button>`).join('');
    const older = years.slice(3);
    return chips + (older.length ? `<select id="older-years" class="filter-chip${older.some(([year]) => year === selected) ? ' is-active' : ''}" aria-label="التصفية حسب السنوات السابقة"><option value="">سنوات سابقة</option>${older.map(([year]) => `<option value="${year}"${selected === year ? ' selected' : ''}>${year}</option>`).join('')}</select>` : '');
  }

  function archive(years, selected, expanded) {
    return years.slice(0, expanded ? years.length : 5).map(([year, count]) =>
      `<button class="archive-row${selected === year ? ' is-active' : ''}" data-year="${year}" aria-pressed="${selected === year}"><span class="archive-year">${year}</span><span class="archive-count">${count} تدوينة</span></button>`).join('');
  }

  let toastTimer;
  function toast(message) {
    const element = document.getElementById('toast');
    // Keep feedback above a modal's backdrop when the reader is open.
    const host = document.querySelector('dialog[open]') || document.body;
    if (element.parentElement !== host) host.append(element);
    element.textContent = message;
    element.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('is-visible'), 3000);
  }

  blog.ui = { escape, icon, meta, featured, card, yearFilters, archive, toast };
})();
