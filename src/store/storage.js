// storage.js - JSON 파일 기반 저장소
// 버전: 1.0.0 | 수정일: 2026-02-08
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
 * @param {Array} articles - 요약된 기사 배열
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
 * @returns {Object|null} 가장 최근 큐레이션 데이터
 */
function getLatestCuration() {
  const files = getDataFiles();
  if (files.length === 0) return null;

  const latestFile = files[files.length - 1];
  return readDataFile(latestFile);
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

module.exports = {
  saveCuration,
  getLatestCuration,
  getCurationsByDate,
  getWeeklyArticles
};
