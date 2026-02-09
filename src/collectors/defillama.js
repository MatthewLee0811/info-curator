// defillama.js - DeFi Llama TVL 변동 수집기
// 버전: 1.0.0 | 수정일: 2026-02-09
const logger = require('../utils/logger');

const PROTOCOLS_URL = 'https://api.llama.fi/protocols';

/**
 * DeFi Llama 프로토콜 TVL 변동 상위 수집
 * 무료 API, 키 불필요. TVL $10M 이상 프로토콜 중 24h 변동률 상위 반환.
 * @param {number} limit - 수집 건수 (기본 15)
 * @param {Array} [excludeCoins] - 제외할 코인/프로토콜 이름 목록
 * @returns {Array} TVL 변동 상위 프로토콜 배열 (기사 형식)
 */
async function collectDeFiLlama(limit = 15, excludeCoins = []) {
  try {
    const response = await fetch(PROTOCOLS_URL, {
      headers: { 'User-Agent': 'info-curator/2.0.0' },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Status code ${response.status}`);
    }

    const protocols = await response.json();

    // TVL $10M 이상, 메이저 코인 제외, 24h 변동률 절대값 기준 정렬
    const excludeSet = new Set(excludeCoins.map(c => c.toLowerCase()));
    const significant = protocols
      .filter(p => p.tvl > 10_000_000 && p.change_1d != null)
      .filter(p => !excludeSet.has(p.name.toLowerCase()) && !excludeSet.has(p.slug))
      .sort((a, b) => Math.abs(b.change_1d) - Math.abs(a.change_1d))
      .slice(0, limit);

    const articles = significant.map(p => {
      const change = p.change_1d;
      const changeStr = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
      const tvlStr = formatTVL(p.tvl);

      return {
        id: `defillama_${p.slug}`,
        title: `${p.name} TVL ${changeStr} (24h) — $${tvlStr}`,
        url: `https://defillama.com/protocol/${p.slug}`,
        points: Math.round(Math.abs(change) * 10),
        numComments: 0,
        createdAt: new Date().toISOString(),
        author: 'DeFi Llama',
        source: 'defillama',
        matchedKeyword: change > 0 ? 'TVL 상승' : 'TVL 하락',
        selftext: [
          `체인: ${p.chain || (p.chains ? p.chains.join(', ') : 'N/A')}`,
          `카테고리: ${p.category || 'N/A'}`,
          `TVL: $${tvlStr}`,
          p.change_7d != null ? `7일 변동: ${p.change_7d > 0 ? '+' : ''}${p.change_7d.toFixed(1)}%` : ''
        ].filter(Boolean).join(' | ')
      };
    });

    logger.info(`[DeFiLlama] TVL 변동 상위 ${articles.length}건 수집`);
    return articles;
  } catch (error) {
    logger.error(`[DeFiLlama] 수집 실패: ${error.message}`);
    return [];
  }
}

/**
 * TVL 숫자를 읽기 쉬운 형태로 변환
 */
function formatTVL(tvl) {
  if (tvl >= 1e9) return `${(tvl / 1e9).toFixed(2)}B`;
  if (tvl >= 1e6) return `${(tvl / 1e6).toFixed(1)}M`;
  return `${(tvl / 1e3).toFixed(0)}K`;
}

module.exports = { collectDeFiLlama };
