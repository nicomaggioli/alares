"""Validate static routes, fragments, image dimensions and structured data."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.ids, self.images = [], [], []
        self.capture = False
        self.raw = ''

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'img':
            self.images.append(attrs)
        for key in ['src', 'href']:
            if key in attrs:
                self.refs.append(attrs[key])
        if 'srcset' in attrs:
            self.refs.extend(item.strip().split()[0] for item in attrs['srcset'].split(','))
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.capture, self.raw = True, ''

    def handle_data(self, data):
        if self.capture:
            self.raw += data

    def handle_endtag(self, tag):
        if tag == 'script' and self.capture:
            json.loads(self.raw)
            self.capture = False

pages = {}
for path in ROOT.rglob('*.html'):
    page = Page()
    page.feed(path.read_text())
    pages[path] = page

errors = []
image_count = 0
for path, page in pages.items():
    label = path.relative_to(ROOT)
    for identifier, count in Counter(page.ids).items():
        if count > 1:
            errors.append(f'{label}: duplicate ID {identifier}')
    for image in page.images:
        image_count += 1
        if not all(key in image for key in ['alt', 'width', 'height']):
            errors.append(f'{label}: missing image attributes {image.get("src")}')
        if image.get('src', '').startswith('http'):
            errors.append(f'{label}: third-party page image {image["src"]}')
    for ref in page.refs:
        url = urlsplit(ref)
        if url.scheme or url.netloc:
            continue
        if url.path.startswith('/'):
            target = ROOT / unquote(url.path).lstrip('/')
        else:
            target = path.parent / unquote(url.path) if url.path else path
        if target.is_dir():
            target /= 'index.html'
        target = target.resolve()
        if not target.exists():
            errors.append(f'{label}: missing {ref}')
        elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
            errors.append(f'{label}: missing anchor {ref}')

print(json.dumps({'pages': len(pages), 'image_elements': image_count, 'errors': errors}, indent=2))
raise SystemExit(bool(errors))
