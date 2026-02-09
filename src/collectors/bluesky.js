// bluesky.js - Bluesky (AT Protocol) 공개 API 수집기 (API 키 불필요)
// 버전: 1.2.0 | 수정일: 2026-02-09
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

const BSKY_API_URL = 'https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts';
const USER_AGENT = 'info-curator/1.0.0';
const REQUEST_DELAY = 1000; // 요청 간 1초 대기

/**
 * 요청 간 딜레이
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Bluesky에서 키워드 기반 게시물 수집
 * @param {Array} [overrideKeywords] - 외부 키워드 (카테고리별 실행 시)
 * @returns {Array} 수집된 게시물 배열
 */
async function collectBluesky(overrideKeywords) {
  const keywords = overrideKeywords || config.keywords;
  const { limit, sort } = config.bluesky;
  const allArticles = [];

  // 키워드 없으면 검색 불가 (검색 API 특성상 쿼리 필수)
  if (!keywords || keywords.length === 0) {
    logger.info('[Bluesky] 키워드 없음 → 스킵');
    return [];
  }

  for (const keyword of keywords) {
    try {
      const response = await axios.get(BSKY_API_URL, {
        params: {
          q: keyword,
          limit: limit,
          sort: sort
        },
        headers: { 'User-Agent': USER_AGENT },
        timeout: 10000
      });

      const posts = response.data?.posts || [];
      for (const post of posts) {
        const record = post.record || {};
        const uri = post.uri || '';
        // at://did:plc:xxx/app.bsky.feed.post/yyy → 웹 URL 변환
        const handle = post.author?.handle || '';
        const rkey = uri.split('/').pop();
        const webUrl = handle && rkey
          ? `https://bsky.app/profile/${handle}/post/${rkey}`
          : '';

        // 외부 링크가 있으면 URL로 사용
        const embed = post.embed;
        const externalUrl = embed?.external?.uri || '';

        allArticles.push({
          id: `bsky_${rkey || post.cid}`,
          title: (record.text || '').substring(0, 200),
          url: externalUrl || webUrl,
          permalink: webUrl,
          score: post.likeCount || 0,
          numComments: post.replyCount || 0,
          repostCount: post.repostCount || 0,
          selftext: (record.text || '').substring(0, 500),
          createdAt: record.createdAt || post.indexedAt,
          author: handle,
          source: 'bluesky',
          matchedKeyword: keyword
        });
      }

      logger.info(`[Bluesky] 키워드 "${keyword}": ${posts.length}건 수집`);
      await delay(REQUEST_DELAY);
    } catch (error) {
      logger.error(`[Bluesky] 키워드 "${keyword}" 수집 실패: ${error.message}`);
      await delay(REQUEST_DELAY);
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
  logger.info(`[Bluesky] 총 ${result.length}건 수집 완료 (중복 제거 후)`);
  return result;
}

module.exports = { collectBluesky };
