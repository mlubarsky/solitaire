# Solitaire

Klondike Solitaire in the browser, modeled on Google Solitaire (Easy mode, draw one). Built with
React, TypeScript and Vite.

## Requirements

- Node.js 22.13+ or 24+ (`.nvmrc` pins 24)
- npm 10+

## Setup

```bash
git clone https://github.com/mlubarsky/solitaire.git
cd solitaire
npm ci
```

## Run locally

```bash
npm run dev
```

Open http://localhost:5173.

## Tests

```bash
npm test                          # unit and component tests
npx playwright install chromium   # once, before the first browser test run
npm run test:e2e                  # browser tests
npm run check                     # type check, lint, format check, coverage and browser tests
```

## Build

```bash
npm run build     # outputs a static site to dist/
npm run preview   # serves the build locally
```
