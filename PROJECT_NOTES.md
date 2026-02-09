# Info Curator 프로젝트 메모

## 프로젝트 개요
- AI 키워드 기반 정보 큐레이션 시스템 (Reddit + Hacker News + Lobste.rs + Dev.to + ArXiv)
- 수집 → 점수화 → GPT 요약/번역 → 웹 대시보드 + 텔레그램 알림
- 스택: Node.js, Express, EJS, Tailwind(CDN), node-cron
- 포트: 4000 (`.env`의 PORT 설정)
- 브랜치: `master` (main 아님)
- 리모트: `https://github.com/MatthewLee0811/info-curator.git`

## 주요 파일 구조
```
config/default.json      - 키워드, 서브레딧, HN 설정, 스코어링, 스케줄
src/index.js             - Express 서버 + cron 스케줄러 진입점
src/config.js            - 설정 로드 (env + default.json), getKeywords/setKeywords
src/web/routes.js        - Express 라우터 (/, /weekly, /history, /settings, /api/*)
src/web/views/*.ejs      - EJS 뷰 (header, footer, index, weekly, settings)
src/collectors/reddit.js - Reddit 공개 .json 엔드포인트 수집기 (API 키 불필요)
src/collectors/hackernews.js - HN Algolia API 수집기
src/collectors/lobsters.js   - Lobste.rs JSON API 수집기
src/collectors/devto.js      - Dev.to REST API 수집기
src/collectors/arxiv.js      - ArXiv API 수집기 (XML)
src/processor/scorer.js  - 점수화
src/processor/summarizer.js - GPT 요약
src/notifier/telegram.js - 텔레그램 알림
src/store/storage.js     - 데이터 저장/조회
src/pipeline.js          - 전체 파이프라인 오케스트레이션
public/js/main.js        - 프론트엔드 JS
```

## 수집 소스 현황
### Reddit (9개 서브레딧, 공개 .json 엔드포인트)
artificial, MachineLearning, technology, LocalLLaMA, ChatGPT, singularity, OpenAI, ClaudeAI, coding

### Hacker News (Algolia API)
태그: story, show_hn

### Lobste.rs (공개 JSON API)
최신 게시물 3페이지 순회 → 키워드 필터링

### Dev.to (REST API)
키워드별 태그 검색 + 추가 태그(machinelearning, ai, llm, openai, programming)

### ArXiv (공식 API, XML 응답)
카테고리: cs.AI, cs.CL, cs.LG, cs.CV / 키워드당 최대 20건

### 수집 제한
- Reddit: 서브레딧당 요청 limit 50, 요청 간 2초 대기, 비인증 분당 10~30회
- HN: hitsPerPage 50, 시간당 10,000회 (넉넉)
- Lobste.rs: rate limit 불명, 요청 간 대기 없이 순차 호출
- Dev.to: 요청 간 1초 대기, API 키 없이 분당 30회
- ArXiv: 요청 간 3초 대기 (공식 권장)

## 주의사항
- `git filter-repo` 실행 시 커밋 전 변경사항이 날아감 (워킹 트리 리셋됨)
- Windows에서 `taskkill`은 `//PID` `//F` 형식 (Git Bash 슬래시 이스케이프)
- 서버 재시작 시 이전 프로세스가 포트 점유할 수 있음 → netstat로 확인 필요
- `.env` 파일은 CLAUDE.md 규정상 절대 읽거나 수정 금지
- 모든 설명/주석/보고는 한국어, 버전과 수정일 필수 기재
