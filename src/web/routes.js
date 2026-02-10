// routes.js - Express 라우터 (카테고리 지원, 일간 병합 뷰)
// 버전: 2.1.0 | 수정일: 2026-02-09
const express = require('express');
const router = express.Router();
const { getLatestCuration, getDailyCuration, getAvailableDates, getCurationsByDate, getWeeklyArticles } = require('../store/storage');
const { runPipeline, getStatus } = require('../pipeline');
const config = require('../config');
const logger = require('../utils/logger');

// GET / - 메인 페이지 (일간 병합 + 카테고리 탭 + 날짜 네비게이션)
router.get('/', (req, res) => {
  const category = req.query.category || null;
  const requestedDate = req.query.date || null;
  const categories = config.getCategories();
  const availableDates = getAvailableDates();

  // 오늘 날짜 (KST)
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = kst.toISOString().split('T')[0];

  const currentDate = requestedDate || today;
  const curation = getDailyCuration(currentDate, category);

  // 이전/다음 날짜 계산
  const dateIdx = availableDates.indexOf(currentDate);
  const prevDate = dateIdx >= 0 && dateIdx < availableDates.length - 1 ? availableDates[dateIdx + 1] : null;
  const nextDate = dateIdx > 0 ? availableDates[dateIdx - 1] : null;

  res.render('index', {
    curation,
    categories,
    currentCategory: category,
    currentDate,
    today,
    prevDate,
    nextDate,
    title: 'Info Curator - 정보 큐레이션'
  });
});

// GET /weekly - 주간 요약 페이지
router.get('/weekly', (req, res) => {
  const weeklyArticles = getWeeklyArticles();
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
  const categories = config.getCategories();
  res.render('index', {
    curation: curations.length > 0 ? curations[curations.length - 1] : null,
    curations,
    categories,
    currentCategory: null,
    title: `Info Curator - ${date}`
  });
});

// POST /api/refresh - 즉시 파이프라인 실행 (카테고리 지원)
router.post('/api/refresh', async (req, res) => {
  try {
    const status = getStatus();
    if (status.isRunning) {
      return res.json({ success: false, message: '이미 실행 중입니다.' });
    }

    const category = req.query.category || req.body?.category || null;
    logger.info(`[web] 수동 파이프라인 실행 요청${category ? ` (카테고리: ${category})` : ' (전체)'}`);
    const options = category ? { category } : {};
    const result = await runPipeline(options);
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

// GET /settings - 카테고리별 키워드 설정 페이지
router.get('/settings', (req, res) => {
  const categories = config.getCategories();
  res.render('settings', {
    categories,
    title: 'Info Curator - 설정'
  });
});

// POST /api/keywords - 카테고리별 키워드 목록 업데이트
router.post('/api/keywords', (req, res) => {
  try {
    const { category, keywords } = req.body;
    if (!category || !Array.isArray(keywords)) {
      return res.status(400).json({ success: false, message: 'category와 keywords(배열)가 필요합니다.' });
    }
    const categories = config.getCategories();
    if (!categories[category]) {
      return res.status(400).json({ success: false, message: `존재하지 않는 카테고리: ${category}` });
    }
    // 빈 문자열 제거 및 중복 제거
    const cleaned = [...new Set(keywords.map(k => k.trim()).filter(k => k.length > 0))];
    config.setKeywords(category, cleaned);
    logger.info(`[web] [${category}] 키워드 업데이트: ${cleaned.join(', ')}`);
    res.json({ success: true, keywords: cleaned });
  } catch (error) {
    logger.error(`[web] 키워드 저장 오류: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
