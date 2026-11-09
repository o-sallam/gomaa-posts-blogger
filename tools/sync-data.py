"""Regenerate the browser data file while preserving the original export."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = (root / 'data.json').read_text(encoding='utf-8')
# The supplied export includes a JavaScript comment before its JSON object.
data = json.loads(source[source.index('{'):])
if not isinstance(data.get('posts'), list):
    raise ValueError('The export must contain a posts array.')
(root / 'data.js').write_text(
    '// Browser-ready copy of data.json. Regenerate with: python3 tools/sync-data.py\n'
    + 'window.BLOG_DATA = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n',
    encoding='utf-8',
)
print(f"Updated data.js with {len(data['posts'])} posts.")
