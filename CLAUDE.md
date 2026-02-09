## 0. 프로젝트 아키텍처
- **시스템**: AI 키워드 기반 정보 큐레이션 (수집 → 점수화 → GPT 요약 → 웹 대시보드 + 텔레그램 알림)
- **스택**: Node.js, Express, EJS, Tailwind(CDN), node-cron
- **버전**: package.json의 `version` 필드 기준 (웹 푸터 + 텔레그램 알림에 표시)
- **수집 소스 (5개 활성)**: HN(Algolia API), Lobste.rs(JSON API), Dev.to(REST API), ArXiv(XML API), Bluesky(AT Protocol)
- **비활성**: Reddit (클라우드 IP 차단 + API 발급 중단, pipeline.js에서 주석 처리)
- **핵심 파일 구조**:
  - `config/default.json` - 키워드, 소스별 설정, 스코어링, 스케줄
  - `src/pipeline.js` - 파이프라인 오케스트레이션
  - `src/collectors/*.js` - 소스별 수집기
  - `src/processor/scorer.js` - 점수화 (신뢰도: arxiv 19, hn 18, lobsters 17, bluesky 15, devto 13)
  - `src/processor/summarizer.js` - GPT 요약
  - `src/notifier/telegram.js` - 텔레그램 알림
  - `src/web/routes.js` + `src/web/views/*.ejs` - 웹 대시보드
- **배포**: AWS EC2 t2.micro (프리 티어)
- **.env 필수**: `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` / 선택: `PORT`(기본 3000), `SITE_URL`

## 1. 작업 범위 및 권한 규정
- 최소 권한 접근: 요청한 기능 구현에 직접적으로 필요한 파일만 읽고 수정한다. 프로젝트 전체를 임의로 탐색하지 마라.
- 기존 코드 보존: 새로운 기능을 추가하거나 수정할 때, 기존의 로직이나 다른 기능을 절대 건드리지 마라. 영향도가 있다면 반드시 사전에 보고하라.
- 자율 작업 금지: 사용자가 명시적으로 지시하지 않은 작업을 '개선'이라는 명목으로 임의 수행하지 마라.
- 확인 절차: 지시사항이 모호하거나, 예상치 못한 사이드 이펙트가 우려될 경우 작업을 중단하고 사용자에게 질문하여 확인받아라.

## 2. 코드 품질 및 보안
- 데이터는 각 플랫폼의 공식 API나 SDK를 우선적으로 사용해줘.
- 보안 우선: 소스 코드에 API Key, 비밀번호, 인증 토큰 등을 직접 노출(Hard-coding)하지 마라.
- API Key와 Secret은 절대 코드에 직접 쓰지 마라. 반드시 .env 파일에서 process.env를 통해 불러와야 하며, .env 파일은 절대 수정하거나 읽지 마라.
- 성능 및 간결성: 성능 최적화를 고려하되, 코드는 누구나 이해할 수 있도록 최대한 간결하고 가독성 있게 작성하라. (Keep It Simple, Stupid)

## 3. 보고 및 피드백 (Response Format)
- 수정 이력 보고: 코드 수정 후에는 반드시 다음 내용을 요약해서 보고하라.
  1. 수정한 파일 및 라인 위치
  2. 수정한 구체적인 이유 및 근거
  3. 수정 전/후 코드 비교 (Diff)
- 언어 설정: 모든 설명, 보고, 주석은 한국어로 작성하고 버전과 수정 날짜를 항상 적어라.

## 4. 환경 및 명령어
- 빌드: `npm run build`
- 테스트: `npm test`
- 서버 시작: `nohup npm start &`
- 서버 재시작: `pkill -f "node src/index.js"; nohup npm start &`
- 이 프로젝트는 보안과 안정성을 최우선으로 하므로, 파괴적인 변경(Breaking Changes)을 엄격히 금지한다.

## 5. 프로젝트 노트
- 작업 시작 전 `PROJECT_NOTES.md`를 읽고 프로젝트 구조를 파악하라.
- `CHANGELOG.md`는 최근 3~5개 항목만 확인하라 (전체를 읽을 필요 없음).
- 기능 추가/수정 작업 완료 후 `CHANGELOG.md`에 작업 이력을 추가하라.
