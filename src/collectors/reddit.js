// reddit.js - Reddit API 수집기 (snoowrap 사용)
// 버전: 1.0.0 | 수정일: 2026-02-08
const Snoowrap = require('snoowrap');
const logger = require('../utils/logger');
const config = require('../config');

let redditClient = null;

/**
 * Reddit 클라이언트 초기화
 */
function getClient() {
  if (!redditClient) {
    redditClient = new Snoowrap({
      userAgent: 'info-curator/1.0.0',
      clientId: config.env.redditClientId,
      clientSecret: config.env.redditClientSecret,
      username: config.env.redditUsername,
      password: config.env.redditPassword
    });
    redditClient.config({ requestDelay: 1000, continueAfterRatelimitError: true });
  }
  return redditClient;
}

/**
 * Reddit에서 키워드 기반 게시물 수집
 * @returns {Array} 수집된 게시물 배열
 */
async function collectReddit() {
  const { subreddits, timeFilter, limit } = config.reddit;
  const keywords = config.keywords;
  const allArticles = [];

  let client;
  try {
    client = getClient();
  } catch (error) {
    logger.error(`[Reddit] 클라이언트 초기화 실패: ${error.message}`);
    return [];
  }

  for (const subreddit of subreddits) {
    for (const keyword of keywords) {
      try {
        const results = await client.getSubreddit(subreddit).search({
          query: keyword,
          time: timeFilter,
          sort: 'relevance',
          limit: limit
        });

        for (const post of results) {
          allArticles.push({
            id: `reddit_${post.id}`,
            title: post.title || '',
            url: post.url || `https://reddit.com${post.permalink}`,
            permalink: `https://reddit.com${post.permalink}`,
            score: post.score || 0,
            numComments: post.num_comments || 0,
            subreddit: post.subreddit_name_prefixed || `r/${subreddit}`,
            createdAt: new Date(post.created_utc * 1000).toISOString(),
            selftext: (post.selftext || '').substring(0, 500),
            author: post.author ? post.author.name : '',
            source: 'reddit',
            matchedKeyword: keyword
          });
        }

        logger.info(`[Reddit] r/${subreddit} 키워드 "${keyword}": ${results.length}건 수집`);
      } catch (error) {
        logger.error(`[Reddit] r/${subreddit} 키워드 "${keyword}" 수집 실패: ${error.message}`);
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
