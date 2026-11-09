/* Browser preferences; gracefully handles private mode and unavailable storage. */
(() => {
  'use strict';
  const blog = window.GomaaBlog;
  let memory = { saved: [], view: 'grid' };

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(blog.config.storageKey));
      memory = {
        saved: Array.isArray(value?.saved) ? value.saved.filter(Number.isSafeInteger) : [],
        view: value?.view === 'list' ? 'list' : 'grid',
      };
    } catch { /* Keep the in-memory preferences when storage cannot be read. */ }
    return { saved: [...memory.saved], view: memory.view };
  }

  function write(preferences) {
    memory = { saved: [...preferences.saved], view: preferences.view };
    try {
      localStorage.setItem(blog.config.storageKey, JSON.stringify(memory));
      return true;
    } catch {
      return false;
    }
  }

  blog.storage = { read, write };
})();
