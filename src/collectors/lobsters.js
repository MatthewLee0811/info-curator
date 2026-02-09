// lobsters.js - Lobste.rs JSON API 수집기 (API 키 불필요)
// 버전: 1.0.0 | 수정일: 2026-02-09
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

const LOBSTERS_BASE_URL = 'https://lobste.rs';
const USER_AGENT = 'info-curator/1.0.0';

/**
 * Lobste.rs에서 최신 게시물 수집 후 키워드 필터링
 * @returns {Array} 수집된 게시물 배열
 */
async function collectLobsters() {
  const keywords = config.keywords;
  const { pages } = config.lobsters;
  const allArticles = [];

  try {
    // 최신 게시물을 페이지별로 수집
    for (let page = 1; page <= pages; page++) {
      const response = await axios.get(`${LOBSTERS_BASE_URL}/newest/page/${page}.json`, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 10000
      });

      const stories = response.data || [];
      for (const story of stories) {
        // 키워드 매칭 필터
        const text = `${story.title || ''} ${story.description || ''} ${(story.tags || []).join(' ')}`.toLowerCase();
        const matched = keywords.find(kw => text.includes(kw.toLowerCase()));
        if (!matched) continue;

        allArticles.push({
          id: `lobsters_${story.short_id}`,
          title: story.title || '',
          url: story.url || `${LOBSTERS_BASE_URL}/s/${story.short_id}`,
          permalink: `${LOBSTERS_BASE_URL}/s/${story.short_id}`,
          score: story.score || 0,
          numComments: story.comment_count || 0,
          tags: story.tags || [],
          createdAt: story.created_at,
          author: story.submitter_user?.username || '',
          source: 'lobsters',
          matchedKeyword: matched
        });
      }

      logger.info(`[Lobsters] 페이지 ${page}: ${stories.length}건 중 ${allArticles.length}건 키워드 매칭`);
    }
  } catch (error) {
    logger.error(`[Lobsters] 수집 실패: ${error.message}`);
  }

  // URL 기준 중복 제거
  const unique = new Map();
  for (const article of allArticles) {
    if (!unique.has(article.url)) {
      unique.set(article.url, article);
    }
  }

  const result = Array.from(unique.values());
  logger.info(`[Lobsters] 총 ${result.length}건 수집 완료 (중복 제거 후)`);
  return result;
}

module.exports = { collectLobsters };
