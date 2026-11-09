/* Data normalization and filtering stay independent of the page renderer. */
(() => {
  'use strict';
  const blog = window.GomaaBlog;
  const normalize = (value) => String(value || '').toLowerCase()
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

  function truncate(text, length) {
    const value = String(text).replace(/\s+/g, ' ').trim();
    if (value.length <= length) return value;
    const end = value.lastIndexOf(' ', length);
    return value.slice(0, end > length * .65 ? end : length) + '…';
  }

  function displayTitle(post) {
    const title = String(post.title || '').trim();
    const generic = /^(السلام عليكم[.!،\s]*|بوست الجمع[ةه][.!،\s]*)$/;
    if (title && !generic.test(title)) return truncate(title, 115);
    const line = post.content.split('\n').map((text) => text.trim()).find((text) =>
      text.length > 35 && !/^#/.test(text) && !/^(السلام عليكم|بوست الجمع|عدنا إليكم|عدنا اليكم|نلحق يوم)/.test(text));
    return truncate(line || title || 'تدوينة الجمعة', 115);
  }

  function prepare(raw) {
    if (!raw || !Array.isArray(raw.posts)) throw new Error('Missing posts array');
    return raw.posts.filter((post) => Number.isSafeInteger(post.id) && typeof post.content === 'string')
      .map((post) => {
        const date = new Date(post.date);
        const validDate = !Number.isNaN(date.getTime());
        return Object.freeze({
          ...post,
          displayTitle: displayTitle(post),
          excerpt: truncate(post.content.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/^السلام عليكم\s*/, ''), 200),
          year: validDate ? String(date.getUTCFullYear()) : '',
          timestamp: validDate ? date.getTime() : 0,
          minutes: Math.max(1, Math.ceil(post.content.trim().split(/\s+/).length / blog.config.wordsPerMinute)),
          searchText: normalize(post.title + ' ' + post.content),
        });
      }).sort((a, b) => b.timestamp - a.timestamp);
  }

  function filter(posts, state) {
    const terms = normalize(state.query).split(' ').filter(Boolean);
    return posts.filter((post) =>
      (!state.year || post.year === state.year)
      && (!state.savedOnly || state.saved.has(post.id))
      && terms.every((term) => post.searchText.includes(term)))
      .sort((a, b) => state.sort === 'oldest' ? a.timestamp - b.timestamp
        : state.sort === 'shortest' ? a.minutes - b.minutes || b.timestamp - a.timestamp
          : b.timestamp - a.timestamp);
  }

  function getYears(posts) {
    const counts = new Map();
    posts.forEach((post) => { if (post.year) counts.set(post.year, (counts.get(post.year) || 0) + 1); });
    return [...counts].sort(([a], [b]) => b.localeCompare(a));
  }

  function formatDate(post) {
    return post.timestamp ? new Intl.DateTimeFormat(blog.config.locale, {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo',
    }).format(new Date(post.timestamp)) : 'بدون تاريخ';
  }

  blog.posts = { normalize, truncate, prepare, filter, getYears, formatDate };
})();
