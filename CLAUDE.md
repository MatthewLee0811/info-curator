## 0. Project Architecture
- **System**: AI keyword-based information curation (Collect → Score → GPT Summary → Web Dashboard + Telegram Notification)
- **Stack**: Node.js, Express, EJS, Tailwind(CDN), node-cron
- **Categories**: tech(AI/Tech), crypto(Coin), stocks(US Stocks) — separate keywords+sources per category
- **Sources (8)**: HN, Lobste.rs, Dev.to, ArXiv, Bluesky, CoinDesk(RSS), SeekingAlpha(RSS), MarketWatch(RSS) / Disabled: Reddit
- **Entry points**: `src/pipeline.js` (orchestration), `src/index.js` (server+cron), `config/default.json` (config)
- See `PROJECT_NOTES.md` for detailed file structure and per-source settings

## 1. Scope & Permission Rules
- Least privilege: Only read and modify files directly required to implement the requested feature. Do not explore the project arbitrarily.
- Preserve existing code: When adding or modifying features, never touch existing logic or other features. If there is potential impact, report it beforehand.
- No autonomous work: Do not perform unrequested tasks under the guise of "improvement".
- Confirmation: If instructions are ambiguous or unexpected side effects are a concern, stop and ask the user for clarification.

## 2. Code Quality & Security
- Prefer official APIs or SDKs for each platform when collecting data.
- Security first: Never hard-code API keys, passwords, or auth tokens in source code.
- API keys and secrets must be loaded from .env via process.env. Never read or modify the .env file.
- Keep code simple and readable (KISS).
- Breaking changes are strictly prohibited.

## 3. Reporting & Feedback
- Change report: After modifying code, briefly summarize the file, location, and reason. Include diffs only for large-scale changes.
- Language: Write all explanations, reports, and comments in Korean. Always include version and modification date.

## 4. Version & Branch Management
- Bump `package.json` version on feature changes (patch: bug fix, minor: new feature, major: breaking change).
- Default branch: `master`. Develop features on separate branches, then merge.
- Build: `npm run build` / Test: `npm test`

## 5. Project Notes
- Read `PROJECT_NOTES.md` before starting work to understand the project structure.
- Only review the latest 3–5 entries in `CHANGELOG.md` (no need to read the entire file).
- After completing feature additions or modifications, add an entry to `CHANGELOG.md`.
