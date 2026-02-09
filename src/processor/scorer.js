// scorer.js - 교차검증 + 점수화 모듈 (카테고리 지원, 인기글 모드)
// 버전: 2.1.0 | 수정일: 2026-02-09
const logger = require('../utils/logger');
const config = require('../config');

// 출처별 기본 신뢰도 (20점 만점)
const SOURCE_TRUST = {
  hackernews: 18,
  reddit: 14,
  lobsters: 17,  // 초대제 커뮤니티, 기술 콘텐츠 품질 높음
  devto: 13,     // 개발자 커뮤니티, 품질 편차 있음
  arxiv: 19,     // 학술 논문 프리프린트, 신뢰도 최상위
  bluesky: 15,   // SNS, 사용자 의견/토론 중심
  coindesk: 17,      // 코인 전문 미디어
  cointelegraph: 16, // 코인 뉴스 대형 매체
  theblock: 18,      // 코인 심층 분석 매체
  decrypt: 16,       // 코인 뉴스 매체
  seekingalpha: 16,  // 주식 분석 전문 미디어
  marketwatch: 16,   // 금융 뉴스 미디어
  yahoofinance: 15,  // 종합 금융 뉴스
  cnbc: 17,          // 대형 금융 뉴스 방송
  coingecko: 18,     // CoinGecko 트렌딩 (시장 데이터 기반, 신뢰도 높음)
  defillama: 19      // DeFi Llama 온체인 데이터 (객관적 TVL 데이터)
};

// 서브레딧별 신뢰도 보정
const SUBREDDIT_TRUST = {
  'r/MachineLearning': 19,
  'r/artificial': 16,
  'r/technology': 14,
  'r/LocalLLaMA': 17,
  'r/ChatGPT': 13
};

// 소스별 인기 기준선 (이 수치면 "인기글" 수준)
const ENGAGEMENT_BASELINE = {
  hackernews: { points: 200, comments: 100 },
  reddit: { points: 500, comments: 100 },
  lobsters: { points: 20, comments: 15 },
  devto: { points: 80, comments: 20 },
  arxiv: { points: 0, comments: 0 },
  bluesky: { points: 50, comments: 20 },
  coindesk: { points: 0, comments: 0 },      // RSS: engagement 없음, 기본 10점
  cointelegraph: { points: 0, comments: 0 }, // RSS: engagement 없음, 기본 10점
  theblock: { points: 0, comments: 0 },      // RSS: engagement 없음, 기본 10점
  decrypt: { points: 0, comments: 0 },       // RSS: engagement 없음, 기본 10점
  seekingalpha: { points: 0, comments: 0 },  // RSS: engagement 없음, 기본 10점
  marketwatch: { points: 0, comments: 0 },   // RSS: engagement 없음, 기본 10점
  yahoofinance: { points: 0, comments: 0 },  // RSS: engagement 없음, 기본 10점
  cnbc: { points: 0, comments: 0 },          // RSS: engagement 없음, 기본 10점
  coingecko: { points: 100, comments: 0 },  // 트렌딩 순위 기반
  defillama: { points: 100, comments: 0 }   // TVL 변동폭 기반
};

/**
 * Engagement 점수 산출 (30점 만점)
 * 소스별 기준선 대비 상대적 인기도로 정규화
 */
function calcEngagementScore(article) {
  const points = article.points || article.score || 0;
  const comments = article.numComments || 0;

  // ArXiv/RSS 소스는 engagement 개념이 없으므로 기본 10점 부여
  const noEngagementSources = ['arxiv', 'coindesk', 'cointelegraph', 'theblock', 'decrypt', 'seekingalpha', 'marketwatch', 'yahoofinance', 'cnbc'];
  if (noEngagementSources.includes(article.source)) return 10;

  const baseline = ENGAGEMENT_BASELINE[article.source] || { points: 100, comments: 50 };

  // 기준선 대비 비율로 점수 산출 (기준선 = 20점)
  const pointRatio = baseline.points > 0 ? points / baseline.points : 0;
  const commentRatio = baseline.comments > 0 ? comments / baseline.comments : 0;

  const pointScore = Math.min(pointRatio * 20, 20);
  const commentScore = Math.min(commentRatio * 10, 10);

  return Math.min(pointScore + commentScore, 30);
}

/**
 * 키워드 관련도 점수 (20점 만점)
 * 제목+본문에서 키워드 매칭 빈도
 * @param {Object} article - 기사 객체
 * @param {Array} [keywords] - 외부 키워드 (카테고리별 실행 시)
 */
function calcKeywordScore(article, keywords) {
  const kws = keywords || config.keywords;

  // 인기글 모드: 키워드가 없으면 모든 기사가 관련 있으므로 기본 10점
  if (!kws || kws.length === 0) return 10;

  const text = `${article.title} ${article.selftext || ''}`.toLowerCase();

  let matchCount = 0;
  for (const keyword of kws) {
    const regex = new RegExp(keyword.toLowerCase(), 'gi');
    const matches = text.match(regex);
    if (matches) {
      matchCount += matches.length;
    }
  }

  // 키워드 1회 매칭 = 5점, 최대 20점
  return Math.min(matchCount * 5, 20);
}

/**
 * 출처 신뢰도 점수 (20점 만점)
 */
function calcTrustScore(article) {
  if (article.source === 'reddit' && article.subreddit) {
    return SUBREDDIT_TRUST[article.subreddit] || SOURCE_TRUST.reddit;
  }
  return SOURCE_TRUST[article.source] || 10;
}

/**
 * 교차검증 점수 (30점 만점)
 * 같은 주제가 여러 소스에 등장하면 가산
 */
function calcCrossValidationScores(articles) {
  const scores = new Map();

  // 제목 단어를 기반으로 유사도 검사
  for (let i = 0; i < articles.length; i++) {
    const wordsA = extractSignificantWords(articles[i].title);
    let crossScore = 0;

    for (let j = 0; j < articles.length; j++) {
      if (i === j) continue;
      // 같은 소스가 아닌 경우에만 교차검증 가산
      if (articles[i].source === articles[j].source) continue;

      const wordsB = extractSignificantWords(articles[j].title);
      const overlap = wordsA.filter(w => wordsB.includes(w)).length;
      const similarity = overlap / Math.max(wordsA.length, 1);

      if (similarity >= 0.3) {
        crossScore += 15; // 다른 소스에서 유사 기사 발견
      }
    }

    scores.set(articles[i].id, Math.min(crossScore, 30));
  }

  return scores;
}

/**
 * 제목에서 의미 있는 단어 추출 (불용어 제거)
 */
function extractSignificantWords(title) {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'shall',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet',
    'both', 'either', 'neither', 'each', 'every', 'all', 'any',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only',
    'same', 'than', 'too', 'very', 'just', 'because', 'how',
    'what', 'which', 'who', 'when', 'where', 'why', 'this', 'that',
    'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
    'it', 'its', 'they', 'them', 'their', 'he', 'him', 'his',
    'she', 'her', 'about', 'up', 'out', 'if', 'then', 'new'
  ]);

  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * 전체 점수화 파이프라인 실행
 * @param {Array} articles - 수집된 기사 배열
 * @param {Array} [keywords] - 외부 키워드 (카테고리별 실행 시)
 * @param {number} [categoryThreshold] - 카테고리별 임계값 (설정 시 전역값 대신 사용)
 * @returns {Array} 점수가 부여되고 필터링된 기사 배열 (점수 내림차순)
 */
function scoreArticles(articles, keywords, categoryThreshold) {
  if (!articles || articles.length === 0) {
    logger.warn('[scorer] 점수화할 기사가 없습니다');
    return [];
  }

  const { threshold: globalThreshold, maxArticles } = config.scoring;
  const baseThreshold = categoryThreshold || globalThreshold;

  // 인기글 모드 (키워드 없음): 키워드 점수 차원이 무의미하므로 임계값 하향
  const effectiveThreshold = (!keywords || keywords.length === 0)
    ? Math.round(baseThreshold * 0.5)
    : baseThreshold;

  const crossScores = calcCrossValidationScores(articles);

  const scored = articles.map(article => {
    const engagement = calcEngagementScore(article);
    const keyword = calcKeywordScore(article, keywords);
    const trust = calcTrustScore(article);
    const cross = crossScores.get(article.id) || 0;
    const totalScore = Math.round(engagement + keyword + trust + cross);

    return {
      ...article,
      scores: {
        engagement: Math.round(engagement),
        keyword: Math.round(keyword),
        trust: Math.round(trust),
        crossValidation: Math.round(cross),
        total: totalScore
      }
    };
  });

  // 임계값 필터링 + 점수 내림차순 정렬
  const passed = scored
    .filter(a => a.scores.total >= effectiveThreshold)
    .sort((a, b) => b.scores.total - a.scores.total);

  // 소스 다양성 보장: 같은 소스 최대 3건
  const maxPerSource = 3;
  const sourceCounts = {};
  const filtered = [];
  for (const article of passed) {
    const src = article.source;
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    if (sourceCounts[src] <= maxPerSource) {
      filtered.push(article);
    }
    if (filtered.length >= maxArticles) break;
  }

  logger.info(`[scorer] ${articles.length}건 중 ${filtered.length}건 통과 (임계값: ${effectiveThreshold})`);
  return filtered;
}

module.exports = { scoreArticles };
