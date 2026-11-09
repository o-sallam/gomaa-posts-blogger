/* Application controller: navigation, filters, bookmarks, and the post reader. */
(() => {
  'use strict';
  const blog = window.GomaaBlog;
  const $ = (id) => document.getElementById(id);

  class BlogApp {
    constructor(data) {
      this.posts = blog.posts.prepare(data);
      this.byId = new Map(this.posts.map((post) => [post.id, post]));
      this.years = blog.posts.getYears(this.posts);
      const preferences = blog.storage.read();
      this.state = {
        query: '', year: '', sort: 'newest', view: preferences.view,
        savedOnly: false, saved: new Set(preferences.saved.filter((id) => this.byId.has(id))),
        limit: blog.config.pageSize,
      };
      this.archiveExpanded = false;
      this.currentPost = null;
      this.readerTrigger = null;
      this.bindEvents();
      this.render();
      this.syncHash();
    }

    render() {
      const { state } = this;
      const results = blog.posts.filter(this.posts, state);
      const visible = results.slice(0, state.limit);
      this.renderGrid(visible);
      $('year-filters').innerHTML = blog.ui.yearFilters(this.years, state.year);
      this.renderArchive();
      const showFeatured = !state.savedOnly && !state.query && !state.year && this.posts.length > 0;
      $('featured-section').hidden = !showFeatured;
      if (showFeatured) $('featured-post').innerHTML = blog.ui.featured(this.posts[0], state.saved.has(this.posts[0].id));
      $('posts-heading').textContent = state.savedOnly ? 'التدوينات المحفوظة' : 'كل التدوينات';
      $('total-count').textContent = results.length;
      $('saved-count').textContent = state.saved.size;
      $('stat-posts').textContent = this.posts.length;
      const firstYear = this.years.at(-1)?.[0] || '—';
      $('stat-since').textContent = firstYear;
      $('about-since').textContent = firstYear;
      $('results-summary').textContent = state.query || state.year
        ? `${results.length} تدوينة${state.query ? ` عن «${state.query}»` : ''}${state.year ? ` من سنة ${state.year}` : ''}` : '';
      $('empty-state').hidden = results.length > 0;
      $('empty-title').textContent = state.savedOnly && !state.saved.size ? 'أفكارك المحفوظة تبدأ من هنا' : 'لم نجد تدوينات';
      $('empty-description').textContent = state.savedOnly && !state.saved.size
        ? 'اضغط على علامة الحفظ بجانب أي تدوينة علشان ترجع لها بعدين.' : 'جرّب كلمة مختلفة أو اختر سنة أخرى.';
      $('load-more-wrap').hidden = results.length === 0;
      $('load-more').hidden = visible.length >= results.length;
      $('pagination-info').textContent = `عرض ${visible.length} من ${results.length} تدوينة`;
      document.querySelectorAll('[data-nav]').forEach((button) => {
        const active = (button.dataset.nav === 'saved') === state.savedOnly;
        button.classList.toggle('is-active', active);
        if (active) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
      ['grid', 'list'].forEach((view) => {
        const active = state.view === view;
        $(view + '-view').classList.toggle('is-active', active);
        $(view + '-view').setAttribute('aria-pressed', String(active));
      });
      if (this.currentPost) this.updateReaderSave();
    }

    renderGrid(visible) {
      const { state } = this;
      const grid = $('posts-grid');
      const ids = visible.map((post) => post.id);
      const previous = this.renderedIds || [];
      // Animate only cards that are new to the reader: a "load more" animates the
      // appended page, a filter/sort/view change animates the whole grid, and a
      // plain re-render (e.g. saving a post) animates nothing.
      const sameView = this.renderedView === state.view;
      const isAppend = sameView && previous.length <= ids.length && previous.every((id, i) => id === ids[i]);
      const firstNew = isAppend ? previous.length : 0;
      grid.innerHTML = visible.map((post) => blog.ui.card(post, state.saved.has(post.id))).join('');
      grid.classList.toggle('is-list', state.view === 'list');
      [...grid.children].slice(firstNew).forEach((card, index) => {
        card.classList.add('is-entering');
        card.style.setProperty('--i', Math.min(index, 8));
        card.addEventListener('animationend', () => card.classList.remove('is-entering'), { once: true });
      });
      this.renderedIds = ids;
      this.renderedView = state.view;
    }

    renderArchive() {
      $('archive-list').innerHTML = blog.ui.archive(this.years, this.state.year, this.archiveExpanded);
      $('all-years').hidden = this.years.length <= 5;
      $('all-years').setAttribute('aria-expanded', String(this.archiveExpanded));
      $('all-years').innerHTML = (this.archiveExpanded ? 'عرض سنين أقل' : 'عرض كل السنين') + blog.ui.icon('chevron');
    }

    reset(savedOnly = false) {
      Object.assign(this.state, { query: '', year: '', savedOnly, limit: blog.config.pageSize });
      $('search').value = '';
      this.render();
    }

    persist() {
      return blog.storage.write({ saved: [...this.state.saved], view: this.state.view });
    }

    toggleSave(id) {
      if (!this.byId.has(id)) return;
      const wasSaved = this.state.saved.has(id);
      if (wasSaved) this.state.saved.delete(id);
      else this.state.saved.add(id);
      const persisted = this.persist();
      this.render();
      if (!wasSaved) {
        document.querySelectorAll(`[data-save="${id}"]${$('reader').open ? ', #reader-save' : ''}`).forEach((button) => {
          button.classList.remove('pop');
          void button.offsetWidth; // restart the animation on a reused button
          button.classList.add('pop');
        });
      }
      blog.ui.toast(persisted
        ? wasSaved ? 'تمت إزالة التدوينة من المحفوظات' : 'تم حفظ التدوينة لوقت لاحق'
        : 'الحفظ متاح في هذه الجلسة فقط؛ تخزين المتصفح غير متاح');
      // Rendering replaces card buttons: restore keyboard focus to the same action.
      if (!$('reader').open) {
        document.querySelector(`[data-save="${id}"]`)?.focus({ preventScroll: true });
      }
    }

    updateReaderSave() {
      const saved = this.state.saved.has(this.currentPost.id);
      $('reader-save').setAttribute('aria-pressed', String(saved));
      $('reader-save').setAttribute('aria-label', saved ? 'إلغاء حفظ التدوينة' : 'حفظ التدوينة');
    }

    openPost(id, fromHash = false) {
      const post = this.byId.get(id);
      if (!post) { blog.ui.toast('هذه التدوينة غير موجودة'); return; }
      $('reader').classList.remove('is-closing');
      if (this.currentPost?.id === id && $('reader').open) return;
      this.readerTrigger = document.activeElement;
      this.currentPost = post;
      $('reader-title').textContent = post.displayTitle;
      $('reader-meta').innerHTML = blog.ui.meta(post);
      $('reader-content').replaceChildren(...post.content.split(/\n\s*\n/).map((text) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        return paragraph;
      }));
      this.updateReaderSave();
      if ($('about-dialog').open) $('about-dialog').close();
      if (!$('reader').open) $('reader').showModal();
      $('reader').scrollTop = 0;
      document.body.classList.add('dialog-open');
      document.title = `${post.displayTitle} — بوست الجمعة`;
      if (!fromHash) window.location.hash = `post=${post.id}`;
      $('reader-close').focus({ preventScroll: true });
    }

    syncHash() {
      const match = window.location.hash.match(/^#post=(\d+)$/);
      if (match) this.openPost(Number(match[1]), true);
      else if ($('reader').open) this.closeDialog($('reader'));
    }

    async sharePost() {
      if (!this.currentPost) return;
      try {
        const url = new URL(window.location.href);
        url.hash = `post=${this.currentPost.id}`;
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url.href);
        } else {
          const field = document.createElement('textarea');
          field.value = url.href;
          field.style.cssText = 'position:fixed;opacity:0;';
          $('reader').append(field);
          field.select();
          const copied = document.execCommand('copy');
          field.remove();
          if (!copied) throw new Error('Clipboard unavailable');
        }
        blog.ui.toast('تم نسخ رابط التدوينة');
      } catch {
        blog.ui.toast('تعذّر النسخ. يمكنك نسخ الرابط من شريط العنوان.');
      }
    }

    // Play the exit animation before closing; reduced-motion users close instantly.
    closeDialog(dialog) {
      if (!dialog.open || dialog.classList.contains('is-closing')) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { dialog.close(); return; }
      dialog.classList.add('is-closing');
      setTimeout(() => {
        if (!dialog.classList.contains('is-closing')) return; // reopened meanwhile
        dialog.classList.remove('is-closing');
        dialog.close();
      }, 220);
    }

    showAbout() {
      $('about-dialog').classList.remove('is-closing');
      $('about-dialog').showModal();
      document.body.classList.add('dialog-open');
    }

    bindEvents() {
      document.addEventListener('click', (event) => {
        const open = event.target.closest('[data-open]');
        const save = event.target.closest('[data-save]');
        const year = event.target.closest('[data-year]');
        const nav = event.target.closest('[data-nav]');
        if (open) this.openPost(Number(open.dataset.open));
        if (save) this.toggleSave(Number(save.dataset.save));
        if (year) {
          const fromArchive = Boolean(year.closest('.archive-list'));
          this.state.year = year.dataset.year;
          this.state.limit = blog.config.pageSize;
          this.render();
          if (fromArchive) $('posts').scrollIntoView();
          else document.querySelector(`.filter-chip[data-year="${this.state.year}"]`)?.focus({ preventScroll: true });
        }
        if (nav) { this.reset(nav.dataset.nav === 'saved'); $('posts').scrollIntoView(); }
        if (event.target.closest('.brand, .footer-brand')) this.reset();
      });
      $('search-form').addEventListener('submit', (event) => { event.preventDefault(); $('posts').scrollIntoView(); });
      $('search').addEventListener('input', () => {
        this.state.query = $('search').value.trim();
        this.state.limit = blog.config.pageSize;
        this.render();
      });
      $('year-filters').addEventListener('change', (event) => {
        if (event.target.id !== 'older-years') return;
        this.state.year = event.target.value;
        this.state.limit = blog.config.pageSize;
        this.render();
        $('older-years')?.focus({ preventScroll: true });
      });
      $('sort').addEventListener('change', () => {
        this.state.sort = $('sort').value;
        this.state.limit = blog.config.pageSize;
        this.render();
      });
      ['grid', 'list'].forEach((view) => $(view + '-view').addEventListener('click', () => {
        this.state.view = view;
        this.persist();
        this.render();
      }));
      $('load-more').addEventListener('click', () => {
        const previousLimit = this.state.limit;
        this.state.limit += blog.config.pageSize;
        this.render();
        $('posts-grid').children[previousLimit]?.querySelector('.post-open')?.focus({ preventScroll: true });
      });
      $('reset-filters').addEventListener('click', () => this.reset());
      $('all-years').addEventListener('click', () => {
        this.archiveExpanded = !this.archiveExpanded;
        this.renderArchive();
      });
      $('saved-shortcut').addEventListener('click', () => { this.reset(true); $('posts').scrollIntoView(); });
      $('reader-save').addEventListener('click', () => { if (this.currentPost) this.toggleSave(this.currentPost.id); });
      $('reader-share').addEventListener('click', () => this.sharePost());
      $('reader-close').addEventListener('click', () => this.closeDialog($('reader')));
      $('reader').addEventListener('close', () => {
        this.currentPost = null;
        document.body.classList.remove('dialog-open');
        document.title = 'بوست الجمعة — مساحة لفكرة';
        if (/^#post=/.test(window.location.hash)) {
          try { history.replaceState(null, '', window.location.pathname + window.location.search); }
          catch { window.location.hash = ''; }
        }
        if (this.readerTrigger?.isConnected) this.readerTrigger.focus({ preventScroll: true });
        else $('posts').focus({ preventScroll: true });
      });
      ['about-button', 'sidebar-about'].forEach((id) => $(id).addEventListener('click', () => this.showAbout()));
      $('about-close').addEventListener('click', () => this.closeDialog($('about-dialog')));
      $('about-explore').addEventListener('click', () => { $('about-dialog').close(); this.reset(); $('posts').scrollIntoView(); });
      $('about-dialog').addEventListener('close', () => {
        if (!$('reader').open) document.body.classList.remove('dialog-open');
      });
      ['reader', 'about-dialog'].forEach((id) => $(id).addEventListener('click', (event) => {
        if (event.target !== $(id)) return;
        const rect = $(id).getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.closeDialog($(id));
      }));
      ['reader', 'about-dialog'].forEach((id) => $(id).addEventListener('cancel', (event) => {
        event.preventDefault();
        this.closeDialog($(id));
      }));
      window.addEventListener('hashchange', () => this.syncHash());
      document.addEventListener('keydown', (event) => {
        if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey
          && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) {
          event.preventDefault();
          $('search').focus();
        }
      });
      window.addEventListener('storage', (event) => {
        if (event.key !== blog.config.storageKey && event.key !== null) return;
        const preferences = blog.storage.read();
        this.state.saved = new Set(preferences.saved.filter((id) => this.byId.has(id)));
        this.state.view = preferences.view;
        this.render();
      });
    }
  }

  try {
    blog.app = new BlogApp(window.BLOG_DATA);
  } catch (error) {
    console.error('Could not initialize the blog:', error);
    $('featured-section').hidden = true;
    $('empty-state').hidden = false;
    $('empty-title').textContent = 'تعذّر تحميل التدوينات';
    $('empty-description').textContent = 'تأكد من وجود ملف data.js بجانب الصفحة، ثم أعد تحميلها.';
    $('reset-filters').hidden = true;
    $('load-more-wrap').hidden = true;
  }
})();
