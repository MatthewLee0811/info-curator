# Info Curator 프로젝트 메모

## 프로젝트 개요
- AI 키워드 기반 정보 큐레이션 시스템 (다중 카테고리: tech/crypto/stocks)
- 수집 → 점수화 → GPT 요약/번역 → 웹 대시보드 + 텔레그램 알림
- 스택: Node.js, Express, EJS, Tailwind(CDN), node-cron
- 버전: 2.1.0
- 포트: 4000 (`.env`의 PORT 설정)
- 브랜치: `master`
- 리모트: `https://github.com/MatthewLee0811/info-curator.git`

## 주요 파일 구조
```
config/default.json         - 카테고리, 소스, 스코어링, 스케줄 설정
src/index.js                - Express 서버 + cron 스케줄러 진입점
src/config.js               - 설정 로드 (카테고리 지원), getKeywords(cat)/setKeywords(cat, kws)
src/web/routes.js           - Express 라우터 (/?category=&date=, /settings, /api/*)
src/web/views/*.ejs         - EJS 뷰 (header, footer, index, weekly, settings)
src/collectors/hackernews.js - HN Algolia API 수집기
src/collectors/lobsters.js  - Lobste.rs JSON API 수집기
src/collectors/devto.js     - Dev.to REST API 수집기
src/collectors/arxiv.js     - ArXiv API 수집기 (XML)
src/collectors/bluesky.js   - Bluesky AT Protocol 수집기
src/collectors/rss.js       - 범용 RSS 수집기 (rss-parser)
src/collectors/coingecko.js - CoinGecko 트렌딩 수집기
src/collectors/defillama.js - DeFi Llama TVL 변동 수집기
src/processor/scorer.js     - 점수화 (카테고리별 키워드/임계값 지원)
src/processor/summarizer.js - GPT 요약
src/notifier/telegram.js    - 텔레그램 알림 (카테고리별 결과 표시)
src/store/storage.js        - 데이터 저장/조회 (일간 병합, 카테고리 필터)
src/pipeline.js             - 카테고리별 파이프라인 오케스트레이션
public/js/main.js           - 프론트엔드 JS (카테고리별 키워드 관리)
```

## 카테고리 시스템 (v2.1.0)

### tech (AI / 기술)
- 소스: HN, Lobsters, DevTo, ArXiv, Bluesky
- 키워드: 설정 페이지에서 관리
- 임계값: 55 (전역 기본값)

### crypto (코인)
- 소스: CoinGecko(트렌딩), DeFi Llama(TVL), CoinDesk(RSS), CoinTelegraph(RSS), The Block(RSS), Decrypt(RSS)
- 키워드: 설정 페이지에서 관리 (니치 키워드 가능)
- 임계값: 28 (카테고리 전용, 데이터 소스 특성상 낮음)
- excludeCoins: BTC, ETH 등 메이저 코인 제외 (CoinGecko/DeFi Llama에 적용)

### stocks (미국주식)
- 소스: SeekingAlpha(RSS), MarketWatch(RSS), Yahoo Finance(RSS), CNBC(RSS)
- 키워드: 비우면 인기글 모드 (모든 기사 수집, 임계값 자동 하향)
- 임계값: 55 (전역 기본값)

## 스코어링 설정
- 전역 threshold: 55, maxArticles: 5
- 인기글 모드 (키워드 없음): 기본 keyword 10점 + 임계값 50% 하향
- 카테고리별 threshold 오버라이드 가능 (config에 `threshold` 필드)
- 소스별 신뢰도: arxiv(19), defillama(19), hn(18), theblock(18), coingecko(18), lobsters(17), coindesk(17), cnbc(17), cointelegraph(16), seekingalpha(16), marketwatch(16), decrypt(16), bluesky(15), yahoofinance(15), reddit(14), devto(13)
- 소스 다양성: 같은 소스 최대 3건

## 웹 UI 기능
- 카테고리 탭 (전체 / AI기술 / 코인 / 미국주식)
- 날짜 네비게이션 (← 이전 | 날짜 | 다음 →)
- 하루치 데이터 병합 (8시+17시 결과를 합쳐서 표시, ID 중복 제거)
- 각 기사에 수집 시각 표시
- "지금 가져오기" 버튼: 현재 탭의 카테고리만 실행

## .env 필수 항목
- `OPENAI_API_KEY` - GPT 요약/번역 (필수)
- `TELEGRAM_BOT_TOKEN` - 텔레그램 알림 (필수)
- `TELEGRAM_CHAT_ID` - 알림 받을 채팅방 (필수)
- `PORT` - 웹 서버 포트 (선택, 기본값 4000)
- `SITE_URL` - 텔레그램 알림에 표시될 URL (선택, 기본값 http://localhost:4000)

## 서버 운영
- 시작: `npm start` 또는 `nohup npm start &`
- 스케줄: 매일 오전 8시, 오후 5시 (Asia/Seoul)
- 재시작: `pkill -f "node src/index.js"; nohup npm start &`
- 배포 대상: AWS EC2 t2.micro 프리 티어 (충분)

## 주의사항
- `.env` 파일은 CLAUDE.md 규정상 절대 읽거나 수정 금지
- 모든 설명/주석/보고는 한국어, 버전과 수정일 필수 기재
- config.js의 하위 호환 getter (config.keywords, config.hackernews 등)는 기존 코드 호환을 위해 유지
- Reddit 수집기는 주석 처리됨 (클라우드 IP 차단 + API 발급 중단)
