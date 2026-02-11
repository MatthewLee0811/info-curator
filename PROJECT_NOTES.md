# Info Curator Project Notes

## Project Overview
- AI keyword-based information curation system (multi-category: tech/crypto/stocks)
- Collect → Score → GPT Summary/Translation → Web Dashboard + Telegram Notification
- Stack: Node.js, Express, EJS, Tailwind(CDN), node-cron
- Version: 2.1.0
- Port: 4000 (set via `PORT` in `.env`)
- Branch: `master`
- Remote: `https://github.com/MatthewLee0811/info-curator.git`

## File Structure
```
config/default.json         - Categories, sources, scoring, schedule config
src/index.js                - Express server + cron scheduler entry point
src/config.js               - Config loader (category support), getKeywords(cat)/setKeywords(cat, kws)
src/web/routes.js           - Express router (/?category=&date=, /settings, /api/*)
src/web/views/*.ejs         - EJS views (header, footer, index, weekly, settings)
src/collectors/hackernews.js - HN Algolia API collector
src/collectors/lobsters.js  - Lobste.rs JSON API collector
src/collectors/devto.js     - Dev.to REST API collector
src/collectors/arxiv.js     - ArXiv API collector (XML)
src/collectors/bluesky.js   - Bluesky AT Protocol collector
src/collectors/rss.js       - Generic RSS collector (rss-parser)
src/collectors/coingecko.js - CoinGecko trending collector
src/collectors/defillama.js - DeFi Llama TVL change collector
src/processor/scorer.js     - Scoring (per-category keywords/thresholds)
src/processor/summarizer.js - GPT summary
src/notifier/telegram.js    - Telegram notification (per-category results)
src/store/storage.js        - Data storage/retrieval (daily merge, category filter)
src/pipeline.js             - Per-category pipeline orchestration
public/js/main.js           - Frontend JS (per-category keyword management)
```

## Category System (v2.1.0)

### tech (AI / Tech)
- Sources: HN, Lobsters, DevTo, ArXiv, Bluesky
- Keywords: Managed via settings page
- Threshold: 55 (global default)

### crypto (Coin)
- Sources: CoinGecko(trending), DeFi Llama(TVL), CoinDesk(RSS), CoinTelegraph(RSS), The Block(RSS), Decrypt(RSS)
- Keywords: Managed via settings page (niche keywords supported)
- Threshold: 28 (category-specific, lower due to data source characteristics)
- excludeCoins: Excludes major coins like BTC, ETH (applied to CoinGecko/DeFi Llama)

### stocks (US Stocks)
- Sources: SeekingAlpha(RSS), MarketWatch(RSS), Yahoo Finance(RSS), CNBC(RSS)
- Keywords: Empty = popular articles mode (collects all articles, threshold auto-reduced)
- Threshold: 55 (global default)

## Scoring Settings
- Global threshold: 55, maxArticles: 5
- Popular articles mode (no keywords): default keyword score 10 + threshold reduced by 50%
- Per-category threshold override via `threshold` field in config
- Source trust scores: arxiv(19), defillama(19), hn(18), theblock(18), coingecko(18), lobsters(17), coindesk(17), cnbc(17), cointelegraph(16), seekingalpha(16), marketwatch(16), decrypt(16), bluesky(15), yahoofinance(15), reddit(14), devto(13)
- Source diversity: max 3 articles per source

## Web UI Features
- Category tabs (All / AI-Tech / Coin / US Stocks)
- Date navigation (← Prev | Date | Next →)
- Daily data merge (combines 8AM + 5PM results, deduplicates by ID)
- Collection time displayed per article
- "Fetch Now" button: runs pipeline for current tab's category only

## .env Required Items
- `OPENAI_API_KEY` - GPT summary/translation (required)
- `TELEGRAM_BOT_TOKEN` - Telegram notification (required)
- `TELEGRAM_CHAT_ID` - Chat room for notifications (required)
- `PORT` - Web server port (optional, default 4000)
- `SITE_URL` - URL shown in Telegram notifications (optional, default http://localhost:4000)

## Server Operations
- Start: `npm start` or `nohup npm start &`
- Schedule: Daily at 8AM and 5PM (Asia/Seoul)
- Restart: `pkill -f "node src/index.js"; nohup npm start &`
- Deployment target: AWS EC2 t2.micro free tier (sufficient)

## Notes
- `.env` file must never be read or modified per CLAUDE.md rules
- All explanations/comments/reports in Korean, version and modification date required
- Backward-compatible getters in config.js (config.keywords, config.hackernews, etc.) kept for legacy code
- Reddit collector is commented out (cloud IP blocked + personal API issuance discontinued)
