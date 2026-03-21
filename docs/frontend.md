# Zea -- Frontend

## Stack

- **Framework:** Astro (static output, zero JS)
- **Build output:** `frontend/dist/` -- pure HTML + CSS + optimized WebP images

## Design System: Brote Light

### Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#FAFAF6` | Page background (warm cream) |
| `--bg-card` | `#FFFFFF` | Cards, stats, step containers |
| `--primary` | `#A8D800` | Primary green (buttons, accents) |
| `--primary-dark` | `#5A8800` | Wordmark italic, deep green |
| `--accent-gold` | `#F5C400` | Gold accent (reserved) |
| `--accent-orange` | `#F08020` | Orange accent (reserved) |
| `--text` | `#1A2208` | Primary text, dark green-black |
| `--text-muted` | `#7A9A40` | Secondary text, labels |
| `--border` | `rgba(100,160,20,0.15)` | Subtle green borders |

### Typography

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Wordmark/headings | Cormorant Garamond | 500, 600 | Logo "Z*ea*", h1, h2, step h3 |
| Body | DM Sans | 400, 500, 600 | Paragraphs, nav, buttons |
| Labels/data | DM Mono | 400, 500 | Step numbers, stats, section labels |

### Logo

SVG inline. Z letterform with a green dot accent on the top-right vertex.
Wordmark is "Z*ea*" where "ea" is italic Cormorant Garamond in `--primary-dark`.

### Images

Source images go in `frontend/src/assets/`. Astro optimizes them at build time:
- Converts to WebP
- Resizes to specified width
- Generates srcset for responsive
- Adds lazy loading

Current images (Unsplash, free license):
- `steven-weeks-*` -- wheat field (hero)
- `dan-meyers-*` -- crop field (step 1)
- `markus-spiske-*` -- plant close-up (step 2)
- `polina-kuzovkova-*` -- greenhouse (step 3)
- `land-o-lakes-*` -- aerial farm (available, not used)

## Project Structure

```
frontend/
  src/
    assets/          -- Source images (Unsplash JPGs + design reference HTML)
    layouts/
      Layout.astro   -- Base layout (head, fonts, global CSS import)
    pages/
      index.astro    -- Landing page (nav, hero, stats, steps, CTA, footer)
    styles/
      global.css     -- CSS custom properties and base reset
  public/            -- Static files served as-is (favicon)
  dist/              -- Build output (deploy this)
  astro.config.mjs
  package.json
```

## Commands

```bash
cd frontend
npm install          # install dependencies
npm run dev          # dev server with hot reload
npm run build        # generate static site in dist/
npm run preview      # preview built site locally
```

## Deployment

Deploy `frontend/dist/` to any static host:
- Vercel / Netlify / Cloudflare Pages (auto-detect Astro)
- GitHub Pages (copy dist/ contents)
- nginx (`root /path/to/dist;`)
