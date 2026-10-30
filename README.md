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
