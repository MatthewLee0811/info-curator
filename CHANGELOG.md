# 작업 이력

## 2026-02-09: Bluesky 수집기 추가 + Reddit 주석 처리
- `src/collectors/bluesky.js` v1.0.0 신규: Bluesky AT Protocol 공개 API 수집기 (API 키 불필요, 키워드 기반 검색)
- `src/pipeline.js` v1.2.0: Reddit 수집 주석 처리 (클라우드 IP 차단 + 개인 API 발급 중단), Bluesky 추가
- `config/default.json`: bluesky 설정 추가 (limit:30, sort:top)
- `src/config.js` v1.3.0: bluesky 설정 로드 추가
- `src/processor/scorer.js` v1.2.0: SOURCE_TRUST에 bluesky(15) 추가

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
