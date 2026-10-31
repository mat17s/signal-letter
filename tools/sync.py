"""Copy the latest editions from an export of the claude.ai news site into this repo.

usage: python3 -I tools/sync.py EXPORT_DIR

EXPORT_DIR holds what the publish task downloaded:
  db/daily/*.json, db/markets/latest.json, db/stories/*.json, db/calls/*.json   (ArtifactData out_dir)
  files/daily/*.pdf, files/weeks/*                                             (Artifact read out_dir)
or, in place of db/, the news site's own export files (written by the Daily task):
  files/export/daily/*.json, files/export/markets.json, files/export/stories.json, files/export/calls.json
Only these news collections are read; portfolio, budget or other finance data is never touched.
"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = Path(sys.argv[1]).resolve()
db, files = src / 'db', src / 'files'
changed = []

def write_json(path, data):
    text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    if not path.exists() or path.read_text(encoding='utf8') != text:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf8')
        changed.append(str(path.relative_to(ROOT)))

def copy(f, dest):
    if not dest.exists() or dest.read_bytes() != f.read_bytes():
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(f, dest)
        changed.append(str(dest.relative_to(ROOT)))

def load(f):
    return json.loads(f.read_text(encoding='utf8'))

exp = files / 'export'
for f in sorted((db / 'daily').glob('*.json')) + sorted((exp / 'daily').glob('*.json')):
    write_json(ROOT / 'data/daily' / f.name, load(f))
dates = sorted(p.stem for p in (ROOT / 'data/daily').glob('20*.json'))
write_json(ROOT / 'data/daily/index.json', {'dates': dates})

for m in (db / 'markets/latest.json', exp / 'markets.json'):
    if m.exists():
        write_json(ROOT / 'data/markets.json', load(m))
for name in ('stories', 'calls'):
    docs = sorted((db / name).glob('*.json'))
    if docs:
        write_json(ROOT / f'data/{name}.json', [load(f) for f in docs])
    elif (exp / f'{name}.json').exists():
        write_json(ROOT / f'data/{name}.json', load(exp / f'{name}.json'))

for sub in ('daily', 'weeks'):
    for f in sorted((files / sub).glob('*')):
        if f.suffix in ('.pdf', '.html', '.json'):
            copy(f, ROOT / sub / f.name)

print('\n'.join(changed) if changed else 'nothing new')
