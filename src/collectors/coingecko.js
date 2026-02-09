// coingecko.js - CoinGecko 트렌딩 코인 수집기
// 버전: 1.0.0 | 수정일: 2026-02-09
const logger = require('../utils/logger');

const TRENDING_URL = 'https://api.coingecko.com/api/v3/search/trending';

/**
 * CoinGecko 트렌딩 코인 수집
 * 무료 API, 키 불필요. 현재 트렌딩 중인 코인 목록 반환.
 * @param {Array} [excludeCoins] - 제외할 코인 ID 목록 (예: ['bitcoin', 'ethereum'])
 * @returns {Array} 트렌딩 코인 배열 (기사 형식)
 */
async function collectCoinGeckoTrending(excludeCoins = []) {
  try {
    const response = await fetch(TRENDING_URL, {
      headers: { 'User-Agent': 'info-curator/2.0.0' },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Status code ${response.status}`);
    }

    const data = await response.json();
    const excludeSet = new Set(excludeCoins.map(c => c.toLowerCase()));
    const coins = (data.coins || []).filter(c => !excludeSet.has(c.item.id));
    const articles = [];

    for (const { item } of coins) {
      const priceChange = item.data?.price_change_percentage_24h?.usd;
      const changeStr = priceChange != null
        ? `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%`
        : '';

      articles.push({
        id: `coingecko_${item.id}`,
        title: `${item.name} (${item.symbol.toUpperCase()}) ${changeStr}`,
        url: `https://www.coingecko.com/en/coins/${item.id}`,
        points: item.score != null ? (15 - item.score) * 10 : 0,
        numComments: 0,
        createdAt: new Date().toISOString(),
        author: 'CoinGecko Trending',
        source: 'coingecko',
        matchedKeyword: 'trending',
        selftext: [
          `시가총액 순위: #${item.market_cap_rank || 'N/A'}`,
          item.data?.market_cap ? `시가총액: ${item.data.market_cap}` : '',
          item.data?.total_volume ? `거래량: ${item.data.total_volume}` : '',
          changeStr ? `24h 변동: ${changeStr}` : ''
        ].filter(Boolean).join(' | ')
      });
    }

    logger.info(`[CoinGecko] 트렌딩 ${articles.length}건 수집`);
    return articles;
  } catch (error) {
    logger.error(`[CoinGecko] 수집 실패: ${error.message}`);
    return [];
  }
}

module.exports = { collectCoinGeckoTrending };
