# 작업 이력

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
