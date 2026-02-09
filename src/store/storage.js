// storage.js - JSON 파일 기반 저장소 (카테고리 지원, 일간 병합)
// 버전: 2.0.0 | 수정일: 2026-02-09
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config');

const dataDir = config.paths.data;

// data 폴더가 없으면 생성
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * 현재 KST 날짜/시간 문자열 반환
 */
function getKSTDatetime() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const date = kst.toISOString().split('T')[0];
  const hour = String(kst.getUTCHours()).padStart(2, '0');
  return { date, hour, datetime: `${date}_${hour}` };
}

/**
 * 큐레이션 결과 저장
 * @param {Array} articles - 요약된 기사 배열 (category 필드 포함)
 * @param {string|null} weeklySummary - 주간 요약 (토요일에만)
 * @returns {string} 저장된 파일 경로
 */
function saveCuration(articles, weeklySummary = null) {
  const { date, hour, datetime } = getKSTDatetime();
  const data = {
    createdAt: new Date().toISOString(),
    date,
    hour,
    totalCollected: articles.length,
    articles,
    weeklySummary
  };

  const filePath = path.join(dataDir, `${datetime}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  logger.info(`[storage] 저장 완료: ${filePath} (${articles.length}건)`);
  return filePath;
}

/**
 * 최신 큐레이션 데이터 조회
 * @param {string} [category] - 카테고리 필터 (생략 시 전체)
 * @returns {Object|null} 가장 최근 큐레이션 데이터
 */
function getLatestCuration(category) {
  const files = getDataFiles();
  if (files.length === 0) return null;

  const latestFile = files[files.length - 1];
  const data = readDataFile(latestFile);
  if (!data) return null;

  // 카테고리 필터 적용
  if (category) {
    data.articles = (data.articles || []).filter(a => (a.category || 'tech') === category);
    data.totalCollected = data.articles.length;
  }

  return data;
}

/**
 * 특정 날짜의 큐레이션 데이터 조회
 * @param {string} date - YYYY-MM-DD 형식
 * @returns {Array} 해당 날짜의 큐레이션 데이터 배열
 */
function getCurationsByDate(date) {
  const files = getDataFiles().filter(f => path.basename(f).startsWith(date));
  return files.map(f => readDataFile(f)).filter(Boolean);
}

/**
 * 최근 7일간 모든 기사 조회 (주간 요약용)
 * @returns {Array} 기사 배열
 */
function getWeeklyArticles() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const allArticles = [];

  const files = getDataFiles();
  for (const file of files) {
    const data = readDataFile(file);
    if (!data) continue;

    const fileDate = new Date(data.createdAt);
    if (fileDate >= sevenDaysAgo) {
      allArticles.push(...(data.articles || []));
    }
  }

  return allArticles;
}

/**
 * data 폴더의 JSON 파일 목록 (정렬됨)
 */
function getDataFiles() {
  if (!fs.existsSync(dataDir)) return [];
  return fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => path.join(dataDir, f));
}

/**
 * JSON 파일 읽기
 */
function readDataFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    logger.error(`[storage] 파일 읽기 실패: ${filePath} - ${error.message}`);
    return null;
  }
}

/**
 * 하루치 큐레이션 병합 조회
 * 같은 날 여러 실행 결과를 병합하고 ID 기준 중복 제거
 * @param {string} date - YYYY-MM-DD 형식
 * @param {string} [category] - 카테고리 필터
 * @returns {Object|null} 병합된 큐레이션 데이터
 */
function getDailyCuration(date, category) {
  const files = getDataFiles().filter(f => path.basename(f).startsWith(date));
  if (files.length === 0) return null;

  const allArticles = [];
  let weeklySummary = null;

  for (const file of files) {
    const data = readDataFile(file);
    if (!data) continue;
    const runTime = data.createdAt;
    for (const article of (data.articles || [])) {
      article.collectedAt = runTime;
      allArticles.push(article);
    }
    if (data.weeklySummary) weeklySummary = data.weeklySummary;
  }

  // ID 기준 중복 제거 (먼저 수집된 것 유지)
  const seen = new Set();
  let unique = allArticles.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  // 카테고리 필터
  if (category) {
    unique = unique.filter(a => (a.category || 'tech') === category);
  }

  // 점수 내림차순 정렬
  unique.sort((a, b) => b.scores.total - a.scores.total);

  return {
    date,
    totalCollected: unique.length,
    articles: unique,
    weeklySummary
  };
}

/**
 * 데이터가 존재하는 날짜 목록 조회 (최근순)
 * @returns {Array<string>} YYYY-MM-DD 날짜 배열
 */
function getAvailableDates() {
  const files = getDataFiles();
  const dates = new Set();
  for (const file of files) {
    const name = path.basename(file);
    const date = name.split('_')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      dates.add(date);
    }
  }
  return [...dates].sort().reverse();
}

module.exports = {
  saveCuration,
  getLatestCuration,
  getDailyCuration,
  getAvailableDates,
  getCurationsByDate,
  getWeeklyArticles
};
