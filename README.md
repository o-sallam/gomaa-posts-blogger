# بوست الجمعة · Gomaa Posts

A responsive Arabic blog built with plain HTML, CSS, and JavaScript. Its dark,
Material-inspired design includes RTL layouts, a local default illustration,
Arabic-aware search, year archives, sorting, grid/list views, browser bookmarks,
and a keyboard-accessible full-post reader with direct links.

## Open

Open `index.html` directly in a modern browser. No installation or build is needed.
For localhost previews and shareable post URLs, run:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. A direct post link looks like
`http://localhost:8000/#post=1`. Sharing a `file://` link only works on your own
computer; deploy the files to a static host to share with other readers.

## Files

```text
index.html             Semantic page structure and accessible dialogs
css/styles.css         Design tokens, components, and responsive layouts
data.json              Original supplied export
data.js                Browser-ready post data: window.BLOG_DATA
js/config.js           Shared configuration
js/storage.js          Saved posts and view preference
js/posts.js            Post preparation, Arabic search, filters, and dates
js/ui.js               Escaped card and archive renderers
js/app.js              Interaction and reader controller
assets/no-image.svg    Default artwork used for every post for now
assets/favicon.svg     Site icon
tools/sync-data.py     Rebuild data.js from the original export
```

## Update posts

Edit `data.js` directly, preserving its `window.BLOG_DATA = { metadata, posts }`
structure, or update the original `data.json` and run:

```sh
python3 tools/sync-data.py
```

Each post needs a unique integer `id`, a `title`, an ISO `date`, and plain-text
`content`. The original 83 posts and their IDs are preserved. Generic titles
such as “السلام عليكم” use an excerpt from the post as the display heading;
the reader always includes the complete original text. Display headings are
shortened to keep cards readable. Search ignores Arabic diacritics and common
letter variants; all search terms must occur in the post.

Change colors and typography in the CSS `:root` tokens. Replace
`assets/no-image.svg` or change `defaultImage` in `js/config.js` to update the
placeholder for every post. Google Fonts are optional; local fallback fonts keep
the page usable offline. There are no external JavaScript dependencies.

Bookmarks are saved to the current browser, with a session-only fallback when
local storage is unavailable. They do not sync between devices. Copying post
links uses the Clipboard API when available and falls back to browser copy.
