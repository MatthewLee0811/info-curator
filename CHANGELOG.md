# 작업 이력

## 2026-02-09: v2.1.0 코인 소스 확장 + 스코어링 개선 + 일간 병합 뷰
- **개요**: 코인/주식 전용 소스 추가, CoinGecko 트렌딩 + DeFi Llama TVL 수집기, 스코어링 인기글 모드, 하루치 데이터 병합 + 날짜 네비게이션
- **코인/주식 소스 변경**:
  - crypto: HN/Bluesky 제거 → CoinDesk, CoinTelegraph, The Block, Decrypt + CoinGecko + DeFi Llama (6개)
  - stocks: SeekingAlpha, MarketWatch, Yahoo Finance, CNBC (4개)
- `src/collectors/coingecko.js` v1.0.0 신규: CoinGecko Trending API 수집기, excludeCoins 필터
- `src/collectors/defillama.js` v1.0.0 신규: DeFi Llama TVL 변동 상위 프로토콜 수집기, excludeCoins 필터
- `src/collectors/rss.js` v1.1.0: 키워드 없으면 전체 반환 (인기글 모드)
- `src/collectors/hackernews.js` v1.2.0: 키워드 없으면 인기 스토리 수집
- `src/collectors/lobsters.js` v1.2.0: 키워드 없으면 전체 반환
- `src/collectors/devto.js` v1.2.0: 키워드 없으면 top 기사 수집
- `src/processor/scorer.js` v2.1.0:
  - 인기글 모드 (키워드 없음) 시 기본 keyword 10점 + 임계값 50% 하향
  - 카테고리별 임계값 지원 (categoryThreshold 매개변수)
  - 새 소스 신뢰도: coingecko(18), defillama(19), cointelegraph(16), theblock(18), decrypt(16), yahoofinance(15), cnbc(17)
- `src/pipeline.js` v2.1.0: CoinGecko/DeFi Llama 수집기 매핑, excludeCoins 전달, 카테고리별 임계값 전달
- `src/store/storage.js` v2.0.0: getDailyCuration(date, category) 하루치 병합 + 중복 제거, getAvailableDates()
- `src/web/routes.js` v2.1.0: ?date= 파라미터 지원, getDailyCuration 사용, 날짜 네비게이션 데이터 전달
- `src/web/views/index.ejs` v2.2.0: 날짜 네비게이션 UI (← 이전 | 날짜 | 다음 →), 수집 시각 표시, 빈 결과 메시지
- `src/web/views/header.ejs`: CoinGecko/DeFi Llama 소스 색상 추가
- `config/default.json`: crypto에 threshold(28), excludeCoins 추가, Yahoo Finance URL 수정
- `package.json`: 2.0.0 → 2.1.0

## 2026-02-09: v2.0.0 카테고리 시스템 확장 (tech / crypto / stocks)
- **개요**: AI/기술 외에 코인, 미국주식 카테고리 추가. 카테고리별 키워드와 수집 소스가 완전히 분리됨.
- `config/default.json`: flat 구조 → `categories` + `sources` 계층 구조로 변경
  - tech: HN, Lobsters, DevTo, ArXiv, Bluesky
  - crypto: CoinDesk(RSS), HN, Bluesky
  - stocks: SeekingAlpha(RSS), MarketWatch(RSS), HN
- `src/config.js` v2.0.0: 카테고리 구조 로드, getKeywords(category), setKeywords(category, keywords), getSourcesForCategory(), getSourceConfig() 추가. 하위 호환 getter 유지.
- `src/collectors/rss.js` v1.0.0 신규: rss-parser 기반 범용 RSS 수집기 (CoinDesk, SeekingAlpha, MarketWatch 3개 소스 처리)
- `src/collectors/hackernews.js` v1.1.0: overrideKeywords 매개변수 추가
- `src/collectors/bluesky.js` v1.1.0: overrideKeywords 매개변수 추가
- `src/collectors/lobsters.js` v1.1.0: overrideKeywords 매개변수 추가
- `src/collectors/devto.js` v1.1.0: overrideKeywords 매개변수 추가
- `src/collectors/arxiv.js` v1.1.0: overrideKeywords 매개변수 추가
- `src/pipeline.js` v2.0.0: 카테고리별 파이프라인 실행, SOURCE_COLLECTORS 매핑, options.category 지원
- `src/store/storage.js` v1.1.0: getLatestCuration(category) 카테고리 필터 지원
- `src/processor/scorer.js` v2.0.0: SOURCE_TRUST/ENGAGEMENT_BASELINE에 coindesk, seekingalpha, marketwatch 추가, scoreArticles(articles, keywords) 외부 키워드 매개변수 지원
- `src/web/routes.js` v2.0.0: /?category=tech 쿼리 파라미터, POST /api/keywords 카테고리별 지원, POST /api/refresh?category= 지원
- `src/web/views/index.ejs` v2.0.0: 카테고리 탭 UI (전체/AI기술/코인/미국주식), 소스 라벨 매핑, 카테고리 배지
- `src/web/views/header.ejs`: 소스별 색상 스타일 6종 추가 (lobsters, devto, arxiv, coindesk, seekingalpha, marketwatch), 탭 스타일
- `src/web/views/settings.ejs` v2.0.0: 카테고리별 키워드 설정 UI
- `src/notifier/telegram.js` v2.0.0: 카테고리별 수집 결과 표시
- `public/js/main.js` v2.0.0: addKeyword(category), saveKeywords(category) 카테고리별 지원
- `package.json`: rss-parser 의존성 추가, 버전 1.2.0 → 2.0.0

## 2026-02-09: 스코어링 소스 다양성 개선
- `src/processor/scorer.js` v1.3.0: Engagement 정규화 + 소스 다양성 보장
  - 소스별 인기 기준선(ENGAGEMENT_BASELINE) 도입, 상대적 인기도로 점수 산출
  - ArXiv는 engagement 개념이 없으므로 기본 10점 부여
  - 최종 선정 시 같은 소스 최대 3건 제한으로 다양성 확보

## 2026-02-09: GPT 요약 마크다운 구조화
- `src/processor/summarizer.js` v1.2.0: 요약 출력을 구조화된 마크다운 형식으로 변경
  - 📌 핵심 요약 / ⚡ 주요 포인트 / 💬 반응 및 의의 3단 구조
  - 기사 유형별(비교/신기술/이슈) 구체적 요약 기준 추가
  - selftext 입력: 300자 → 800자, max_tokens: 1500 → 3000, 배치: 5 → 3
- `src/web/views/header.ejs`: marked.js CDN 추가, 요약 영역 스타일 보강
- `src/web/views/index.ejs`: 요약을 marked.js로 마크다운 → HTML 렌더링

## 2026-02-09: 텔레그램 알림 버전 표시 + 웹 UI 동적 버전 표시
- `src/notifier/telegram.js` v1.1.0: 알림 메시지 하단에 앱 버전(🏷 vX.X.X) 표시 추가
- `src/index.js` v1.1.0: res.locals.appVersion 미들웨어 추가 (모든 뷰에 버전 전달)
- `src/web/views/footer.ejs`: 하드코딩 v1.0.0 → package.json 버전 동적 표시
- `package.json`: 버전 1.0.0 → 1.2.0 업데이트

## 2026-02-09: Bluesky 수집기 추가 + Reddit 주석 처리
- `src/collectors/bluesky.js` v1.0.0 신규: Bluesky AT Protocol 공개 API 수집기 (API 키 불필요, 키워드 기반 검색)
- `src/pipeline.js` v1.2.0: Reddit 수집 주석 처리 (클라우드 IP 차단 + 개인 API 발급 중단), Bluesky 추가
- `config/default.json`: bluesky 설정 추가 (limit:30, sort:top)
- `src/config.js` v1.3.0: bluesky 설정 로드 추가
- `src/processor/scorer.js` v1.2.0: SOURCE_TRUST에 bluesky(15) 추가

## 2026-02-09: 스코어링 기준 상향
- `config/default.json`: threshold 40→55, maxArticles 15→5 (API 비용 절감)

## 2026-02-09: 수집 소스 3종 추가 (Lobste.rs, Dev.to, ArXiv)
- `src/collectors/lobsters.js` v1.0.0 신규: Lobste.rs JSON API 수집기 (API 키 불필요, 최신글 페이지 순회 + 키워드 필터링)
- `src/collectors/devto.js` v1.0.0 신규: Dev.to REST API 수집기 (API 키 불필요, 키워드/태그 기반 검색)
- `src/collectors/arxiv.js` v1.0.0 신규: ArXiv API 수집기 (API 키 불필요, XML 응답 파싱, 카테고리+키워드 검색)
- `config/default.json`: lobsters(pages:3), devto(perPage:30, tags 5개), arxiv(categories 4개, maxResults:20) 설정 추가
- `src/config.js` v1.2.0: lobsters, devto, arxiv 설정 로드 추가
- `src/processor/scorer.js` v1.1.0: SOURCE_TRUST에 lobsters(17), devto(13), arxiv(19) 신뢰도 점수 추가
- `src/pipeline.js` v1.1.0: 5개 소스 병렬 수집으로 확장, 에러 처리 루프 개선
- `package.json`: xml2js 의존성 추가 (ArXiv XML 응답 파싱용)

## 2026-02-09: 키워드 설정 페이지 구현 (커밋: 87cfcea)
- `src/config.js` v1.1.0: fs 모듈 추가, getKeywords()/setKeywords() 함수 추가
- `src/web/routes.js` v1.1.0: GET /settings, POST /api/keywords 라우트 추가
- `src/web/views/settings.ejs` 신규: 키워드 태그 UI (추가/삭제/저장)
- `src/web/views/header.ejs`: 네비게이션에 "설정" 링크 추가
- `public/js/main.js` v1.1.0: addKeyword, removeKeyword, saveKeywords 함수 추가

## 2026-02-09: 텔레그램 토큰 노출 대응
- 초기 커밋의 `.env.example`에 실제 토큰이 하드코딩되어 있었음
- `git filter-repo --replace-text`로 히스토리에서 토큰 제거 (***REMOVED***로 치환)
- force push로 GitHub 히스토리도 정리 완료

## 2026-02-09: 수집 소스 확장 (커밋: badc0e4)
- Reddit 서브레딧 4개 추가: singularity, OpenAI, ClaudeAI, coding (총 9개)
- Hacker News: tags를 "story" → "(story,show_hn)"으로 변경
