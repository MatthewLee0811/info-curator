// devto.js - Dev.to REST API 수집기 (API 키 불필요)
// 버전: 1.2.0 | 수정일: 2026-02-09
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

const DEVTO_API_URL = 'https://dev.to/api/articles';
const USER_AGENT = 'info-curator/1.0.0';
const REQUEST_DELAY = 1000; // 요청 간 1초 대기

/**
 * 요청 간 딜레이
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Dev.to에서 기사 수집
 * - 키워드 있으면: 키워드별 검색 + 태그 기반 수집
 * - 키워드 없으면: 최근 1일 인기글 수집
 * @param {Array} [overrideKeywords] - 외부 키워드 (카테고리별 실행 시)
 * @returns {Array} 수집된 기사 배열
 */
async function collectDevTo(overrideKeywords) {
  const keywords = overrideKeywords || config.keywords;
  const { perPage, tags } = config.devto;
  const allArticles = [];

  // 키워드 없으면 인기글 모드
  if (!keywords || keywords.length === 0) {
    try {
      const response = await axios.get(DEVTO_API_URL, {
        params: {
          per_page: perPage,
          top: 1
        },
        headers: { 'User-Agent': USER_AGENT },
        timeout: 10000
      });

      const articles = response.data || [];
      for (const article of articles) {
        allArticles.push({
          id: `devto_${article.id}`,
          title: article.title || '',
          url: article.url || '',
          score: article.public_reactions_count || 0,
          numComments: article.comments_count || 0,
          tags: article.tag_list || [],
          createdAt: article.published_at || article.created_at,
          selftext: (article.description || '').substring(0, 500),
          author: article.user?.username || '',
          source: 'devto',
          matchedKeyword: null
        });
      }

      logger.info(`[DevTo] 인기글 모드: ${articles.length}건 수집`);
    } catch (error) {
      logger.error(`[DevTo] 인기글 수집 실패: ${error.message}`);
    }
  } else {
    // 키워드별 검색
    for (const keyword of keywords) {
      try {
        const response = await axios.get(DEVTO_API_URL, {
          params: {
            tag: keyword.toLowerCase().replace(/\s+/g, ''),
            per_page: perPage,
            top: 1
          },
          headers: { 'User-Agent': USER_AGENT },
          timeout: 10000
        });

        const articles = response.data || [];
        for (const article of articles) {
          allArticles.push({
            id: `devto_${article.id}`,
            title: article.title || '',
            url: article.url || '',
            score: article.public_reactions_count || 0,
            numComments: article.comments_count || 0,
            tags: article.tag_list || [],
            createdAt: article.published_at || article.created_at,
            selftext: (article.description || '').substring(0, 500),
            author: article.user?.username || '',
            source: 'devto',
            matchedKeyword: keyword
          });
        }

        logger.info(`[DevTo] 키워드 "${keyword}": ${articles.length}건 수집`);
        await delay(REQUEST_DELAY);
      } catch (error) {
        logger.error(`[DevTo] 키워드 "${keyword}" 수집 실패: ${error.message}`);
        await delay(REQUEST_DELAY);
      }
    }

    // 추가 태그 기반 수집
    for (const tag of tags) {
      try {
        const response = await axios.get(DEVTO_API_URL, {
          params: {
            tag: tag,
            per_page: perPage,
            top: 1
          },
          headers: { 'User-Agent': USER_AGENT },
          timeout: 10000
        });

        const articles = response.data || [];
        for (const article of articles) {
          const text = `${article.title || ''} ${article.description || ''} ${(article.tag_list || []).join(' ')}`.toLowerCase();
          const matched = keywords.find(kw => text.includes(kw.toLowerCase()));

          allArticles.push({
            id: `devto_${article.id}`,
            title: article.title || '',
            url: article.url || '',
            score: article.public_reactions_count || 0,
            numComments: article.comments_count || 0,
            tags: article.tag_list || [],
            createdAt: article.published_at || article.created_at,
            selftext: (article.description || '').substring(0, 500),
            author: article.user?.username || '',
            source: 'devto',
            matchedKeyword: matched || tag
          });
        }

        logger.info(`[DevTo] 태그 "${tag}": ${articles.length}건 수집`);
        await delay(REQUEST_DELAY);
      } catch (error) {
        logger.error(`[DevTo] 태그 "${tag}" 수집 실패: ${error.message}`);
        await delay(REQUEST_DELAY);
      }
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
  logger.info(`[DevTo] 총 ${result.length}건 수집 완료 (중복 제거 후)`);
  return result;
}

module.exports = { collectDevTo };
