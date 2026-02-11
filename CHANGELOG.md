# Changelog

## 2026-02-11: Fix "All" tab pipeline error + Translate docs to English
- `src/web/routes.js`: Fixed `req.body.category` → `req.body?.category` (optional chaining) to prevent TypeError when POST body is empty
- `CLAUDE.md`, `PROJECT_NOTES.md`, `CHANGELOG.md`: Translated all content from Korean to English

## 2026-02-09: v2.1.0 Crypto source expansion + Scoring improvements + Daily merge view
- **Overview**: Added coin/stock-specific sources, CoinGecko trending + DeFi Llama TVL collectors, popular articles mode for scoring, daily data merge + date navigation
- **Crypto/Stocks source changes**:
  - crypto: Removed HN/Bluesky → Added CoinDesk, CoinTelegraph, The Block, Decrypt + CoinGecko + DeFi Llama (6 sources)
  - stocks: SeekingAlpha, MarketWatch, Yahoo Finance, CNBC (4 sources)
- `src/collectors/coingecko.js` v1.0.0 new: CoinGecko Trending API collector, excludeCoins filter
- `src/collectors/defillama.js` v1.0.0 new: DeFi Llama TVL top protocol collector, excludeCoins filter
- `src/collectors/rss.js` v1.1.0: Returns all articles when no keywords (popular articles mode)
- `src/collectors/hackernews.js` v1.2.0: Collects popular stories when no keywords
- `src/collectors/lobsters.js` v1.2.0: Returns all articles when no keywords
- `src/collectors/devto.js` v1.2.0: Collects top articles when no keywords
- `src/processor/scorer.js` v2.1.0:
  - Popular articles mode (no keywords): default keyword score 10 + threshold reduced by 50%
  - Per-category threshold support (categoryThreshold parameter)
  - New source trust scores: coingecko(18), defillama(19), cointelegraph(16), theblock(18), decrypt(16), yahoofinance(15), cnbc(17)
- `src/pipeline.js` v2.1.0: CoinGecko/DeFi Llama collector mapping, excludeCoins forwarding, per-category threshold forwarding
- `src/store/storage.js` v2.0.0: getDailyCuration(date, category) daily merge + dedup, getAvailableDates()
- `src/web/routes.js` v2.1.0: ?date= parameter support, getDailyCuration usage, date navigation data
- `src/web/views/index.ejs` v2.2.0: Date navigation UI (← Prev | Date | Next →), collection time display, empty result message
- `src/web/views/header.ejs`: Added CoinGecko/DeFi Llama source colors
- `config/default.json`: Added threshold(28) and excludeCoins to crypto, fixed Yahoo Finance URL
- `package.json`: 2.0.0 → 2.1.0

## 2026-02-09: v2.0.0 Category system expansion (tech / crypto / stocks)
- **Overview**: Added coin and US stocks categories beyond AI/tech. Per-category keywords and sources fully separated.
- `config/default.json`: Flat structure → `categories` + `sources` hierarchy
  - tech: HN, Lobsters, DevTo, ArXiv, Bluesky
  - crypto: CoinDesk(RSS), HN, Bluesky
  - stocks: SeekingAlpha(RSS), MarketWatch(RSS), HN
- `src/config.js` v2.0.0: Category structure loading, getKeywords(category), setKeywords(category, keywords), getSourcesForCategory(), getSourceConfig() added. Backward-compatible getters maintained.
- `src/collectors/rss.js` v1.0.0 new: rss-parser based generic RSS collector (handles CoinDesk, SeekingAlpha, MarketWatch)
- `src/collectors/hackernews.js` v1.1.0: overrideKeywords parameter added
- `src/collectors/bluesky.js` v1.1.0: overrideKeywords parameter added
- `src/collectors/lobsters.js` v1.1.0: overrideKeywords parameter added
- `src/collectors/devto.js` v1.1.0: overrideKeywords parameter added
- `src/collectors/arxiv.js` v1.1.0: overrideKeywords parameter added
- `src/pipeline.js` v2.0.0: Per-category pipeline execution, SOURCE_COLLECTORS mapping, options.category support
- `src/store/storage.js` v1.1.0: getLatestCuration(category) category filter support
- `src/processor/scorer.js` v2.0.0: Added coindesk, seekingalpha, marketwatch to SOURCE_TRUST/ENGAGEMENT_BASELINE, scoreArticles(articles, keywords) external keywords parameter support
- `src/web/routes.js` v2.0.0: ?category=tech query parameter, POST /api/keywords per-category support, POST /api/refresh?category= support
- `src/web/views/index.ejs` v2.0.0: Category tab UI (All/AI-Tech/Coin/US Stocks), source label mapping, category badges
- `src/web/views/header.ejs`: Added 6 source color styles (lobsters, devto, arxiv, coindesk, seekingalpha, marketwatch), tab styles
- `src/web/views/settings.ejs` v2.0.0: Per-category keyword settings UI
- `src/notifier/telegram.js` v2.0.0: Per-category collection results display
- `public/js/main.js` v2.0.0: addKeyword(category), saveKeywords(category) per-category support
- `package.json`: Added rss-parser dependency, version 1.2.0 → 2.0.0

## 2026-02-09: Scoring source diversity improvement
- `src/processor/scorer.js` v1.3.0: Engagement normalization + source diversity guarantee
  - Introduced per-source engagement baselines (ENGAGEMENT_BASELINE), scoring based on relative popularity
  - ArXiv has no engagement concept, assigned default 10 points
  - Max 3 articles per source in final selection for diversity

## 2026-02-09: GPT summary markdown structuring
- `src/processor/summarizer.js` v1.2.0: Changed summary output to structured markdown format
  - 3-section structure: Key Summary / Main Points / Reactions & Significance
  - Added specific summary criteria per article type (comparison/new tech/issue)
  - selftext input: 300 → 800 chars, max_tokens: 1500 → 3000, batch: 5 → 3
- `src/web/views/header.ejs`: Added marked.js CDN, enhanced summary area styles
- `src/web/views/index.ejs`: Render summary as markdown → HTML via marked.js

## 2026-02-09: Telegram notification version display + Web UI dynamic version display
- `src/notifier/telegram.js` v1.1.0: Added app version display at bottom of notification messages
- `src/index.js` v1.1.0: Added res.locals.appVersion middleware (passes version to all views)
- `src/web/views/footer.ejs`: Changed from hardcoded v1.0.0 to dynamic package.json version
- `package.json`: Version 1.0.0 → 1.2.0

## 2026-02-09: Bluesky collector added + Reddit commented out
- `src/collectors/bluesky.js` v1.0.0 new: Bluesky AT Protocol public API collector (no API key needed, keyword-based search)
- `src/pipeline.js` v1.2.0: Reddit collection commented out (cloud IP blocked + personal API issuance discontinued), Bluesky added
- `config/default.json`: Added bluesky config (limit:30, sort:top)
- `src/config.js` v1.3.0: Added bluesky config loading
- `src/processor/scorer.js` v1.2.0: Added bluesky(15) to SOURCE_TRUST

## 2026-02-09: Scoring threshold increase
- `config/default.json`: threshold 40→55, maxArticles 15→5 (API cost reduction)

## 2026-02-09: Added 3 collection sources (Lobste.rs, Dev.to, ArXiv)
- `src/collectors/lobsters.js` v1.0.0 new: Lobste.rs JSON API collector (no API key, paginated newest posts + keyword filtering)
- `src/collectors/devto.js` v1.0.0 new: Dev.to REST API collector (no API key, keyword/tag-based search)
- `src/collectors/arxiv.js` v1.0.0 new: ArXiv API collector (no API key, XML response parsing, category+keyword search)
- `config/default.json`: Added lobsters(pages:3), devto(perPage:30, 5 tags), arxiv(4 categories, maxResults:20) config
- `src/config.js` v1.2.0: Added lobsters, devto, arxiv config loading
- `src/processor/scorer.js` v1.1.0: Added lobsters(17), devto(13), arxiv(19) trust scores to SOURCE_TRUST
- `src/pipeline.js` v1.1.0: Expanded to 5-source parallel collection, improved error handling loop
- `package.json`: Added xml2js dependency (for ArXiv XML response parsing)

## 2026-02-09: Keyword settings page implementation (commit: 87cfcea)
- `src/config.js` v1.1.0: Added fs module, getKeywords()/setKeywords() functions
- `src/web/routes.js` v1.1.0: Added GET /settings, POST /api/keywords routes
- `src/web/views/settings.ejs` new: Keyword tag UI (add/remove/save)
- `src/web/views/header.ejs`: Added "Settings" link to navigation
- `public/js/main.js` v1.1.0: Added addKeyword, removeKeyword, saveKeywords functions

## 2026-02-09: Telegram token exposure response
- Actual token was hardcoded in `.env.example` in initial commit
- Removed token from history using `git filter-repo --replace-text` (replaced with ***REMOVED***)
- Cleaned GitHub history with force push

## 2026-02-09: Collection source expansion (commit: badc0e4)
- Added 4 Reddit subreddits: singularity, OpenAI, ClaudeAI, coding (9 total)
- Hacker News: Changed tags from "story" to "(story,show_hn)"
