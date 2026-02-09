# Info Curator 프로젝트 메모

## 프로젝트 개요
- AI 키워드 기반 정보 큐레이션 시스템 (HN + Lobste.rs + Dev.to + ArXiv + Bluesky)
- 수집 → 점수화 → GPT 요약/번역 → 웹 대시보드 + 텔레그램 알림
- 스택: Node.js, Express, EJS, Tailwind(CDN), node-cron
- 버전: 1.2.0 (package.json 기준, 웹 푸터 + 텔레그램 알림에 표시)
- 포트: 4000 (`.env`의 PORT 설정), SITE_URL 미설정 시 기본값 http://localhost:3000
- 브랜치: `master` (main), 개발: `claude/news-aggregation-sites-R8EXB`
- 리모트: `https://github.com/MatthewLee0811/info-curator.git`

## 주요 파일 구조
```
config/default.json      - 키워드, 서브레딧, HN 설정, 스코어링, 스케줄
src/index.js             - Express 서버 + cron 스케줄러 진입점
src/config.js            - 설정 로드 (env + default.json), getKeywords/setKeywords
src/web/routes.js        - Express 라우터 (/, /weekly, /history, /settings, /api/*)
src/web/views/*.ejs      - EJS 뷰 (header, footer, index, weekly, settings)
src/collectors/reddit.js     - Reddit 공개 .json 수집기 (⚠️ 주석 처리됨: 클라우드 IP 차단 + API 발급 중단)
src/collectors/hackernews.js - HN Algolia API 수집기
src/collectors/lobsters.js   - Lobste.rs JSON API 수집기
src/collectors/devto.js      - Dev.to REST API 수집기
src/collectors/arxiv.js      - ArXiv API 수집기 (XML, xml2js)
src/collectors/bluesky.js    - Bluesky AT Protocol 공개 API 수집기
src/processor/scorer.js  - 점수화 (신뢰도: arxiv 19, hn 18, lobsters 17, bluesky 15, reddit 14, devto 13)
src/processor/summarizer.js - GPT 요약
src/notifier/telegram.js - 텔레그램 알림
src/store/storage.js     - 데이터 저장/조회
src/pipeline.js          - 전체 파이프라인 오케스트레이션
public/js/main.js        - 프론트엔드 JS
```

## 수집 소스 현황 (활성 5개)
### ✅ Hacker News (Algolia API)
태그: story, show_hn / hitsPerPage 50, 시간당 10,000회

### ✅ Lobste.rs (공개 JSON API)
최신 게시물 3페이지 순회 → 키워드 필터링

### ✅ Dev.to (REST API)
키워드별 태그 검색 + 추가 태그(machinelearning, ai, llm, openai, programming) / 요청 간 1초 대기, 분당 30회

### ✅ ArXiv (공식 API, XML 응답)
카테고리: cs.AI, cs.CL, cs.LG, cs.CV / 키워드당 최대 20건 / 요청 간 3초 대기

### ✅ Bluesky (AT Protocol 공개 API)
키워드 기반 검색 / limit 30, sort top / 요청 간 1초 대기

### ⚠️ Reddit (주석 처리됨)
- 클라우드 IP(AWS 등)에서 공개 .json 엔드포인트 403 차단
- 2026년 기준 개인 Reddit API 발급 중단
- 로컬 PC에서만 사용 가능 (pipeline.js 주석 해제 필요)
- 9개 서브레딧: artificial, MachineLearning, technology, LocalLLaMA, ChatGPT, singularity, OpenAI, ClaudeAI, coding

## 스코어링 설정
- threshold: 55 (임계값)
- maxArticles: 5 (GPT 요약 대상 최대 건수)
- OpenAI API 비용: GPT-4o-mini 기준 월 $1~3 예상

## .env 필수 항목
- `OPENAI_API_KEY` - GPT 요약/번역 (필수)
- `TELEGRAM_BOT_TOKEN` - 텔레그램 알림 (필수)
- `TELEGRAM_CHAT_ID` - 알림 받을 채팅방 (필수)
- `PORT` - 웹 서버 포트 (선택, 기본값 3000)
- `SITE_URL` - 텔레그램 알림에 표시될 URL (선택, 기본값 http://localhost:3000)

## 서버 운영
- 시작: `nohup npm start &`
- 재시작: `pkill -f "node src/index.js"; nohup npm start &`
- npm start만 하면 기존 프로세스 안 죽음 → 반드시 pkill 먼저
- 배포 대상: AWS EC2 t2.micro 프리 티어 (충분)

## 주의사항
- `git filter-repo` 실행 시 커밋 전 변경사항이 날아감 (워킹 트리 리셋됨)
- Windows에서 `taskkill`은 `//PID` `//F` 형식 (Git Bash 슬래시 이스케이프)
- 서버 재시작 시 이전 프로세스가 포트 점유할 수 있음 → pkill로 확인 필요
- `.env` 파일은 CLAUDE.md 규정상 절대 읽거나 수정 금지
- 모든 설명/주석/보고는 한국어, 버전과 수정일 필수 기재
