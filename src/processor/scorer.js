// scorer.js - 교차검증 + 점수화 모듈
// 버전: 1.0.0 | 수정일: 2026-02-08
const logger = require('../utils/logger');
const config = require('../config');

// 출처별 기본 신뢰도 (20점 만점)
const SOURCE_TRUST = {
  hackernews: 18,
  reddit: 14
};

// 서브레딧별 신뢰도 보정
const SUBREDDIT_TRUST = {
  'r/MachineLearning': 19,
  'r/artificial': 16,
  'r/technology': 14,
  'r/LocalLLaMA': 17,
  'r/ChatGPT': 13
};

/**
 * Engagement 점수 산출 (30점 만점)
 * 업보트/포인트 + 댓글 수를 정규화
 */
function calcEngagementScore(article) {
  const points = article.points || article.score || 0;
  const comments = article.numComments || 0;

  // 로그 스케일로 정규화 (폭발적인 인기 게시물 영향 완화)
  const pointScore = Math.min(Math.log10(Math.max(points, 1) + 1) * 6, 20);
  const commentScore = Math.min(Math.log10(Math.max(comments, 1) + 1) * 5, 10);

  return Math.min(pointScore + commentScore, 30);
}

/**
 * 키워드 관련도 점수 (20점 만점)
 * 제목+본문에서 키워드 매칭 빈도
 */
function calcKeywordScore(article) {
  const keywords = config.keywords;
  const text = `${article.title} ${article.selftext || ''}`.toLowerCase();

  let matchCount = 0;
  for (const keyword of keywords) {
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
 * @returns {Array} 점수가 부여되고 필터링된 기사 배열 (점수 내림차순)
 */
function scoreArticles(articles) {
  if (!articles || articles.length === 0) {
    logger.warn('[scorer] 점수화할 기사가 없습니다');
    return [];
  }

  const { threshold, maxArticles } = config.scoring;
  const crossScores = calcCrossValidationScores(articles);

  const scored = articles.map(article => {
    const engagement = calcEngagementScore(article);
    const keyword = calcKeywordScore(article);
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

  // 임계값 필터링 + 점수 내림차순 정렬 + 상위 N개
  const filtered = scored
    .filter(a => a.scores.total >= threshold)
    .sort((a, b) => b.scores.total - a.scores.total)
    .slice(0, maxArticles);

  logger.info(`[scorer] ${articles.length}건 중 ${filtered.length}건 통과 (임계값: ${threshold})`);
  return filtered;
}

module.exports = { scoreArticles };
