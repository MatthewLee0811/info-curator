// routes.js - Express 라우터
// 버전: 1.0.0 | 수정일: 2026-02-08
const express = require('express');
const router = express.Router();
const { getLatestCuration, getCurationsByDate, getWeeklyArticles } = require('../store/storage');
const { runPipeline, getStatus } = require('../pipeline');
const logger = require('../utils/logger');

// GET / - 메인 페이지 (최신 큐레이션)
router.get('/', (req, res) => {
  const curation = getLatestCuration();
  res.render('index', {
    curation,
    title: 'Info Curator - AI 정보 큐레이션'
  });
});

// GET /weekly - 주간 요약 페이지
router.get('/weekly', (req, res) => {
  const weeklyArticles = getWeeklyArticles();
  // 최근 큐레이션 중 주간 요약이 있는 것을 찾기
  const curation = getLatestCuration();
  const weeklySummary = curation ? curation.weeklySummary : null;

  res.render('weekly', {
    articles: weeklyArticles,
    weeklySummary,
    title: 'Info Curator - 주간 요약'
  });
});

// GET /history/:date - 특정 날짜 큐레이션
router.get('/history/:date', (req, res) => {
  const { date } = req.params;
  const curations = getCurationsByDate(date);
  res.render('index', {
    curation: curations.length > 0 ? curations[curations.length - 1] : null,
    curations,
    title: `Info Curator - ${date}`
  });
});

// POST /api/refresh - 즉시 파이프라인 실행
router.post('/api/refresh', async (req, res) => {
  try {
    const status = getStatus();
    if (status.isRunning) {
      return res.json({ success: false, message: '이미 실행 중입니다.' });
    }

    logger.info('[web] 수동 파이프라인 실행 요청');
    const result = await runPipeline();
    res.json(result);
  } catch (error) {
    logger.error(`[web] 파이프라인 실행 오류: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/status - 파이프라인 상태
router.get('/api/status', (req, res) => {
  res.json(getStatus());
});

module.exports = router;
