// reddit.js - Reddit 공개 JSON 엔드포인트 수집기 (API 키 불필요)
// 버전: 1.1.0 | 수정일: 2026-02-08
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

const USER_AGENT = 'info-curator/1.0.0';
const REQUEST_DELAY = 2000; // 요청 간 2초 대기 (rate limit 방지)

/**
 * Reddit 공개 .json 엔드포인트로 서브레딧 검색
 * 예: https://www.reddit.com/r/artificial/search.json?q=AI&restrict_sr=on&t=day&limit=50
 */
async function searchSubreddit(subreddit, keyword, timeFilter, limit) {
  const url = `https://www.reddit.com/r/${subreddit}/search.json`;
  const response = await axios.get(url, {
    params: {
      q: keyword,
      restrict_sr: 'on',
      t: timeFilter,
      sort: 'relevance',
      limit: limit
    },
    headers: { 'User-Agent': USER_AGENT },
    timeout: 10000
  });

  const posts = response.data?.data?.children || [];
  return posts.map(child => {
    const post = child.data;
    return {
      id: `reddit_${post.id}`,
      title: post.title || '',
      url: post.url || `https://reddit.com${post.permalink}`,
      permalink: `https://reddit.com${post.permalink}`,
      score: post.score || 0,
      numComments: post.num_comments || 0,
      subreddit: post.subreddit_name_prefixed || `r/${subreddit}`,
      createdAt: new Date(post.created_utc * 1000).toISOString(),
      selftext: (post.selftext || '').substring(0, 500),
      author: post.author || '',
      source: 'reddit',
      matchedKeyword: keyword
    };
  });
}

/**
 * 요청 간 딜레이
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Reddit에서 키워드 기반 게시물 수집
 * @returns {Array} 수집된 게시물 배열
 */
async function collectReddit() {
  const { subreddits, timeFilter, limit } = config.reddit;
  const keywords = config.keywords;
  const allArticles = [];

  for (const subreddit of subreddits) {
    for (const keyword of keywords) {
      try {
        const posts = await searchSubreddit(subreddit, keyword, timeFilter, limit);
        allArticles.push(...posts);
        logger.info(`[Reddit] r/${subreddit} 키워드 "${keyword}": ${posts.length}건 수집`);

        // rate limit 방지 대기
        await delay(REQUEST_DELAY);
      } catch (error) {
        logger.error(`[Reddit] r/${subreddit} 키워드 "${keyword}" 수집 실패: ${error.message}`);
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
  logger.info(`[Reddit] 총 ${result.length}건 수집 완료 (중복 제거 후)`);
  return result;
}

module.exports = { collectReddit };
