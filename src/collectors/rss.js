// rss.js - 범용 RSS 피드 수집기 (CoinDesk, Seeking Alpha, MarketWatch 등)
// 버전: 1.1.0 | 수정일: 2026-02-09
const Parser = require('rss-parser');
const logger = require('../utils/logger');

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'info-curator/1.0.0' }
});

/**
 * RSS 피드에서 키워드 기반 기사 수집
 * @param {string} sourceName - 소스 이름 (coindesk, seekingalpha, marketwatch)
 * @param {string} feedUrl - RSS 피드 URL
 * @param {Array} keywords - 키워드 배열
 * @param {number} limit - 최대 수집 건수
 * @returns {Array} 수집된 기사 배열
 */
async function collectRSS(sourceName, feedUrl, keywords, limit = 30) {
  try {
    const feed = await parser.parseURL(feedUrl);
    const items = feed.items || [];
    const allArticles = [];

    for (const item of items.slice(0, limit)) {
      const title = (item.title || '').trim();
      const content = (item.contentSnippet || item.content || '').trim();
      const text = `${title} ${content}`.toLowerCase();

      // 키워드 매칭
      const matched = keywords.find(kw => text.includes(kw.toLowerCase()));

      allArticles.push({
        id: `${sourceName}_${hashCode(item.link || item.guid || title)}`,
        title,
        url: item.link || '',
        points: 0,
        numComments: 0,
        createdAt: item.isoDate || item.pubDate || new Date().toISOString(),
        author: item.creator || item.author || '',
        source: sourceName,
        matchedKeyword: matched || null,
        selftext: content.substring(0, 500)
      });
    }

    // 키워드 없으면 전체 반환, 있으면 매칭된 것만 필터링
    if (!keywords || keywords.length === 0) {
      logger.info(`[RSS:${sourceName}] 인기글 모드: ${allArticles.length}건 수집`);
      return allArticles;
    }

    const filtered = allArticles.filter(a => a.matchedKeyword);
    logger.info(`[RSS:${sourceName}] ${items.length}건 중 ${filtered.length}건 키워드 매칭`);
    return filtered;
  } catch (error) {
    logger.error(`[RSS:${sourceName}] 수집 실패: ${error.message}`);
    return [];
  }
}

/**
 * 문자열 해시코드 생성 (ID용)
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

module.exports = { collectRSS };
