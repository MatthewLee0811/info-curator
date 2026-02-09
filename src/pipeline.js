// pipeline.js - 수집→점수화→요약→저장→알림 파이프라인 오케스트레이션
// 버전: 1.2.0 | 수정일: 2026-02-09
const logger = require('./utils/logger');
const { collectHackerNews } = require('./collectors/hackernews');
// const { collectReddit } = require('./collectors/reddit'); // Reddit: 클라우드 IP 차단 (개인 API 발급 중단), 로컬 전용
const { collectLobsters } = require('./collectors/lobsters');
const { collectDevTo } = require('./collectors/devto');
const { collectArxiv } = require('./collectors/arxiv');
const { collectBluesky } = require('./collectors/bluesky');
const { scoreArticles } = require('./processor/scorer');
const { summarizeArticles, generateWeeklySummary } = require('./processor/summarizer');
const { saveCuration, getWeeklyArticles } = require('./store/storage');
const { sendNotification } = require('./notifier/telegram');

let isRunning = false;
let lastRunStatus = null;

/**
 * 파이프라인 실행 상태 조회
 */
function getStatus() {
  return { isRunning, lastRun: lastRunStatus };
}

/**
 * 메인 파이프라인 실행
 * @param {Object} options
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

    // 1단계: 데이터 수집 (5개 소스 병렬 실행)
    logger.info('[pipeline] 1단계: 데이터 수집');
    const sourceNames = ['HN', /* 'Reddit', */ 'Lobsters', 'DevTo', 'ArXiv', 'Bluesky'];
    const results = await Promise.allSettled([
      collectHackerNews(),
      // collectReddit(), // Reddit: 클라우드 IP 차단 (개인 API 발급 중단), 로컬 전용
      collectLobsters(),
      collectDevTo(),
      collectArxiv(),
      collectBluesky()
    ]);

    const allArticles = [];
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value);
      } else {
        logger.error(`[pipeline] ${sourceNames[idx]} 수집 실패: ${result.reason.message}`);
      }
    });

    logger.info(`[pipeline] 총 ${allArticles.length}건 수집`);

    if (allArticles.length === 0) {
      const result = { success: true, message: '수집된 기사가 없습니다.', articles: 0 };
      lastRunStatus = { ...result, completedAt: new Date().toISOString() };
      return result;
    }

    // 2단계: 점수화
    logger.info('[pipeline] 2단계: 점수화');
    const scoredArticles = scoreArticles(allArticles);
    logger.info(`[pipeline] ${scoredArticles.length}건 통과`);

    // 3단계: AI 요약
    logger.info('[pipeline] 3단계: AI 요약/번역');
    const summarizedArticles = await summarizeArticles(scoredArticles);

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

    // 6단계: 텔레그램 알림
    logger.info('[pipeline] 5단계: 텔레그램 알림');
    await sendNotification(allArticles.length, summarizedArticles.length, options.includeWeekly);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`[pipeline] ===== 파이프라인 완료 (${elapsed}초) =====`);

    const result = {
      success: true,
      message: '큐레이션 완료',
      collected: allArticles.length,
      selected: summarizedArticles.length,
      filePath,
      hasWeeklySummary: !!weeklySummary,
      elapsed: `${elapsed}초`
    };

    lastRunStatus = { ...result, completedAt: new Date().toISOString() };
    return result;

  } catch (error) {
    logger.error(`[pipeline] 파이프라인 실패: ${error.message}`);

    // 에러 시 텔레그램으로 알림 시도
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
