// pipeline.js - 수집→점수화→요약→저장→알림 파이프라인 오케스트레이션 (카테고리 지원)
// 버전: 2.1.0 | 수정일: 2026-02-09
const logger = require('./utils/logger');
const { collectHackerNews } = require('./collectors/hackernews');
// const { collectReddit } = require('./collectors/reddit'); // Reddit: 클라우드 IP 차단 (개인 API 발급 중단), 로컬 전용
const { collectLobsters } = require('./collectors/lobsters');
const { collectDevTo } = require('./collectors/devto');
const { collectArxiv } = require('./collectors/arxiv');
const { collectBluesky } = require('./collectors/bluesky');
const { collectRSS } = require('./collectors/rss');
const { collectCoinGeckoTrending } = require('./collectors/coingecko');
const { collectDeFiLlama } = require('./collectors/defillama');
const { scoreArticles } = require('./processor/scorer');
const { summarizeArticles, generateWeeklySummary } = require('./processor/summarizer');
const { saveCuration, getWeeklyArticles } = require('./store/storage');
const { sendNotification } = require('./notifier/telegram');
const config = require('./config');

let isRunning = false;
let lastRunStatus = null;

// 소스 이름 → 수집 함수 매핑
const SOURCE_COLLECTORS = {
  hackernews: (keywords) => collectHackerNews(keywords),
  lobsters: (keywords) => collectLobsters(keywords),
  devto: (keywords) => collectDevTo(keywords),
  arxiv: (keywords) => collectArxiv(keywords),
  bluesky: (keywords) => collectBluesky(keywords),
  coingecko: (keywords, excludeCoins) => collectCoinGeckoTrending(excludeCoins),
  defillama: (keywords, excludeCoins) => {
    const cfg = config.getSourceConfig('defillama');
    return collectDeFiLlama(cfg.limit, excludeCoins);
  },
  coindesk: (keywords) => {
    const cfg = config.getSourceConfig('coindesk');
    return collectRSS('coindesk', cfg.url, keywords, cfg.limit);
  },
  seekingalpha: (keywords) => {
    const cfg = config.getSourceConfig('seekingalpha');
    return collectRSS('seekingalpha', cfg.url, keywords, cfg.limit);
  },
  marketwatch: (keywords) => {
    const cfg = config.getSourceConfig('marketwatch');
    return collectRSS('marketwatch', cfg.url, keywords, cfg.limit);
  },
  cointelegraph: (keywords) => {
    const cfg = config.getSourceConfig('cointelegraph');
    return collectRSS('cointelegraph', cfg.url, keywords, cfg.limit);
  },
  theblock: (keywords) => {
    const cfg = config.getSourceConfig('theblock');
    return collectRSS('theblock', cfg.url, keywords, cfg.limit);
  },
  decrypt: (keywords) => {
    const cfg = config.getSourceConfig('decrypt');
    return collectRSS('decrypt', cfg.url, keywords, cfg.limit);
  },
  yahoofinance: (keywords) => {
    const cfg = config.getSourceConfig('yahoofinance');
    return collectRSS('yahoofinance', cfg.url, keywords, cfg.limit);
  },
  cnbc: (keywords) => {
    const cfg = config.getSourceConfig('cnbc');
    return collectRSS('cnbc', cfg.url, keywords, cfg.limit);
  }
};

/**
 * 파이프라인 실행 상태 조회
 */
function getStatus() {
  return { isRunning, lastRun: lastRunStatus };
}

/**
 * 단일 카테고리 파이프라인 실행
 * @param {string} category - 카테고리 ID
 * @param {Object} options
 * @returns {Object} 카테고리별 실행 결과
 */
async function runCategoryPipeline(category, options = {}) {
  const categories = config.getCategories();
  const cat = categories[category];
  if (!cat) {
    logger.warn(`[pipeline] 존재하지 않는 카테고리: ${category}`);
    return { success: false, message: `카테고리 "${category}"를 찾을 수 없습니다.` };
  }

  const keywords = cat.keywords;
  const excludeCoins = cat.excludeCoins || [];
  const sourceNames = cat.sources;
  logger.info(`[pipeline] [${cat.label}] 수집 시작 (소스: ${sourceNames.join(', ')})`);

  // 카테고리에 해당하는 소스만 병렬 수집
  const collectors = sourceNames
    .filter(name => SOURCE_COLLECTORS[name])
    .map(name => ({
      name,
      promise: SOURCE_COLLECTORS[name](keywords, excludeCoins)
    }));

  const results = await Promise.allSettled(collectors.map(c => c.promise));

  const allArticles = [];
  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      // 각 기사에 category 필드 추가
      const articles = result.value.map(a => ({ ...a, category }));
      allArticles.push(...articles);
    } else {
      logger.error(`[pipeline] [${cat.label}] ${collectors[idx].name} 수집 실패: ${result.reason?.message}`);
    }
  });

  logger.info(`[pipeline] [${cat.label}] 총 ${allArticles.length}건 수집`);
  return { articles: allArticles, label: cat.label };
}

/**
 * 메인 파이프라인 실행 (전체 카테고리 또는 특정 카테고리)
 * @param {Object} options
 * @param {string} options.category - 특정 카테고리만 실행 (생략 시 전체)
 * @param {boolean} options.includeWeekly - 주간 요약 포함 여부
 * @returns {Object} 실행 결과
 */
async function runPipeline(options = {}) {
  if (isRunning) {
    logger.warn('[pipeline] 이미 실행 중입니다. 스킵합니다.');
    return { success: false, message: '파이프라인이 이미 실행 중입니다.' };
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    logger.info('[pipeline] ===== 파이프라인 시작 =====');

    // 실행할 카테고리 결정
    const categories = config.getCategories();
    const targetCategories = options.category
      ? [options.category]
      : Object.keys(categories);

    // 1단계: 카테고리별 데이터 수집
    logger.info('[pipeline] 1단계: 데이터 수집');
    const allArticles = [];
    const categoryResults = {};

    for (const cat of targetCategories) {
      const result = await runCategoryPipeline(cat, options);
      if (result.articles) {
        allArticles.push(...result.articles);
        categoryResults[cat] = {
          label: result.label,
          collected: result.articles.length
        };
      }
    }

    logger.info(`[pipeline] 총 ${allArticles.length}건 수집`);

    if (allArticles.length === 0) {
      const result = { success: true, message: '수집된 기사가 없습니다.', articles: 0 };
      lastRunStatus = { ...result, completedAt: new Date().toISOString() };
      return result;
    }

    // 2단계: 카테고리별 점수화
    logger.info('[pipeline] 2단계: 점수화');
    const scoredByCategory = {};
    for (const cat of targetCategories) {
      const catArticles = allArticles.filter(a => a.category === cat);
      if (catArticles.length > 0) {
        const keywords = config.getKeywords(cat);
        const catThreshold = categories[cat].threshold;
        scoredByCategory[cat] = scoreArticles(catArticles, keywords, catThreshold);
      }
    }
    const allScored = Object.values(scoredByCategory).flat();
    logger.info(`[pipeline] ${allScored.length}건 통과`);

    // 3단계: AI 요약
    logger.info('[pipeline] 3단계: AI 요약/번역');
    const summarizedArticles = await summarizeArticles(allScored);

    // 4단계: 주간 요약 (옵션)
    let weeklySummary = null;
    if (options.includeWeekly) {
      logger.info('[pipeline] 주간 요약 생성 중...');
      const weeklyArticles = getWeeklyArticles();
      weeklySummary = await generateWeeklySummary(weeklyArticles);
    }

    // 5단계: 저장
    logger.info('[pipeline] 4단계: 저장');
    const filePath = saveCuration(summarizedArticles, weeklySummary);

    // 6단계: 텔레그램 알림 (카테고리 정보 포함)
    logger.info('[pipeline] 5단계: 텔레그램 알림');
    await sendNotification(allArticles.length, summarizedArticles.length, options.includeWeekly, null, categoryResults);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`[pipeline] ===== 파이프라인 완료 (${elapsed}초) =====`);

    const result = {
      success: true,
      message: '큐레이션 완료',
      collected: allArticles.length,
      selected: summarizedArticles.length,
      filePath,
      hasWeeklySummary: !!weeklySummary,
      elapsed: `${elapsed}초`,
      categories: categoryResults
    };

    lastRunStatus = { ...result, completedAt: new Date().toISOString() };
    return result;

  } catch (error) {
    logger.error(`[pipeline] 파이프라인 실패: ${error.message}`);

    try {
      await sendNotification(0, 0, false, error.message);
    } catch (notifyError) {
      logger.error(`[pipeline] 에러 알림 전송 실패: ${notifyError.message}`);
    }

    lastRunStatus = {
      success: false,
      message: error.message,
      completedAt: new Date().toISOString()
    };

    return { success: false, message: error.message };
  } finally {
    isRunning = false;
  }
}

module.exports = { runPipeline, getStatus };
