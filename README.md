# The Signal-Letter

The Daily and The Weekly Signal, written by Claude from Mattia's newsletters, feeds and podcasts.
Live at https://mat17s.github.io/signal-letter/

News only. No portfolio, account or budget data ever goes into this repository.

## How a new edition is published

Everything is plain files; pushing to `main` updates the site within a minute or two.

**The Daily (every evening)**
1. `data/daily/YYYY-MM-DD.json` — the day's edition (same fields as the Daily on claude.ai: `date`, `label`, `top`, `reads`, `number`, `podcast`, `thread`, `sources`, `pdf`).
2. Add the date to `data/daily/index.json` (`{"dates": [...]}`).
3. `daily/YYYY-MM-DD.pdf` — the PDF of the edition.
4. `data/markets.json` — latest market snapshot (`asOf`, `label`, `items`).
5. `data/stories.json` and `data/calls.json` — only if story threads or calls changed (arrays).

**The Weekly Signal (Sunday)**
1. `weeks/YYYY-Www.html` — the issue body.
2. `weeks/YYYY-Www.pdf` — the PDF.
3. Add the week's entry to `weeks/index.json`.
4. The map at the top of The week in five minutes: write `weeks/YYYY-Www.map.json` (one item per point, same order:
   `n`, short `head`, `to` = the story's id, plus `place`, `lat`, `lon` when the point happens in one place), then run
   `node tools/weekly-map.js tools/world-map.json weeks/YYYY-Www.map.json weeks/YYYY-Www.html` before making the PDF.
   It numbers the points to match the pins and links each point and pin to its story.

## Automatic publishing

1. The Daily scheduled task (18:35 Zurich, every day) ends by publishing export files to the claude.ai news site:
   `export/daily/<date>.json` (last three days), `export/markets.json`, `export/stories.json`, `export/calls.json`.
2. A scheduled check in the Claude project thread (19:20 Zurich) downloads those files plus any new `daily/*.pdf`
   and `weeks/*` files, runs `python3 -I tools/sync.py EXPORT_DIR`, and pushes whatever changed.

Only news is exported: never portfolio, budget or other finance data.
