// hackernews.js - Hacker News Algolia API 수집기
// 버전: 1.0.0 | 수정일: 2026-02-08
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

const HN_API_URL = 'https://hn.algolia.com/api/v1/search';

/**
 * Hacker News에서 키워드 기반 기사 수집
 * @returns {Array} 수집된 기사 배열
 */
async function collectHackerNews() {
  const keywords = config.keywords;
  const { tags, hitsPerPage } = config.hackernews;

  // 최근 24시간 타임스탬프
  const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
  const allArticles = [];

  for (const keyword of keywords) {
    try {
      const response = await axios.get(HN_API_URL, {
        params: {
          query: keyword,
          tags: tags,
          hitsPerPage: hitsPerPage,
          numericFilters: `created_at_i>${oneDayAgo}`
        },
        timeout: 10000
      });

      const hits = response.data.hits || [];
      for (const hit of hits) {
        allArticles.push({
          id: `hn_${hit.objectID}`,
          title: hit.title || '',
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          points: hit.points || 0,
          numComments: hit.num_comments || 0,
          createdAt: hit.created_at,
          author: hit.author || '',
          source: 'hackernews',
          matchedKeyword: keyword
        });
      }

      logger.info(`[HN] 키워드 "${keyword}": ${hits.length}건 수집`);
    } catch (error) {
      logger.error(`[HN] 키워드 "${keyword}" 수집 실패: ${error.message}`);
    }
  }

  // URL 기준 중복 제거
  const unique = new Map();
  for (const article of allArticles) {
    if (!unique.has(article.url)) {
      unique.set(article.url, article);
    }
  }

  const result = Array.from(unique.values());
  logger.info(`[HN] 총 ${result.length}건 수집 완료 (중복 제거 후)`);
  return result;
}

module.exports = { collectHackerNews };
