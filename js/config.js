/* Shared configuration. Scripts load in the order declared in index.html. */
window.GomaaBlog = window.GomaaBlog || {};
window.GomaaBlog.config = Object.freeze({
  pageSize: 9,
  defaultImage: 'assets/no-image.svg',
  storageKey: 'gomaa-blog:v1',
  wordsPerMinute: 190,
  locale: 'ar-EG-u-nu-latn',
});
