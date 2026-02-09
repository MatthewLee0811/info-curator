// config.js - 설정 로드 모듈 (카테고리 시스템 지원)
// 버전: 2.0.0 | 수정일: 2026-02-09
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const configFilePath = path.join(__dirname, '..', 'config', 'default.json');
const defaultConfig = require(configFilePath);

// 필수 환경변수 검증
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID'
];

function validateEnv() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`[config] 누락된 환경변수: ${missing.join(', ')}`);
    console.warn('[config] .env 파일을 확인해주세요.');
  }
  return missing.length === 0;
}

const config = {
  // 환경변수 (process.env에서 참조)
  env: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    siteUrl: process.env.SITE_URL || 'http://localhost:3000',
    port: parseInt(process.env.PORT, 10) || 3000
  },
  // 카테고리 설정
  categories: defaultConfig.categories,
  // 소스 설정
  sources: defaultConfig.sources,
  // 하위 호환: config.keywords는 tech 카테고리 키워드 반환
  get keywords() {
    return this.categories.tech.keywords;
  },
  // 하위 호환: 기존 소스별 설정 접근자
  get hackernews() { return this.sources.hackernews; },
  get lobsters() { return this.sources.lobsters; },
  get devto() { return this.sources.devto; },
  get arxiv() { return this.sources.arxiv; },
  get bluesky() { return this.sources.bluesky; },
  // 스코어링, 스케줄
  scoring: defaultConfig.scoring,
  schedule: defaultConfig.schedule,
  // 경로 설정
  paths: {
    data: path.join(__dirname, '..', 'data'),
    logs: path.join(__dirname, '..', 'logs')
  },
  // 환경변수 검증 함수
  validateEnv,

  /**
   * 카테고리 목록 조회
   * @returns {Object} { tech: { label, keywords, sources }, ... }
   */
  getCategories() {
    return config.categories;
  },

  /**
   * 카테고리별 키워드 조회
   * @param {string} category - 카테고리 ID (기본: 'tech')
   * @returns {Array} 키워드 배열
   */
  getKeywords(category = 'tech') {
    const cat = config.categories[category];
    return cat ? cat.keywords : [];
  },

  /**
   * 카테고리별 키워드 설정
   * @param {string} category - 카테고리 ID
   * @param {Array} keywords - 새 키워드 배열
   */
  setKeywords(category, keywords) {
    if (!config.categories[category]) return;
    config.categories[category].keywords = keywords;
    const raw = fs.readFileSync(configFilePath, 'utf-8');
    const json = JSON.parse(raw);
    json.categories[category].keywords = keywords;
    fs.writeFileSync(configFilePath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
  },

  /**
   * 카테고리별 소스 목록 조회
   * @param {string} category - 카테고리 ID
   * @returns {Array} 소스 이름 배열
   */
  getSourcesForCategory(category) {
    const cat = config.categories[category];
    return cat ? cat.sources : [];
  },

  /**
   * 소스 설정 조회
   * @param {string} sourceName - 소스 이름
   * @returns {Object} 소스 설정
   */
  getSourceConfig(sourceName) {
    return config.sources[sourceName] || {};
  }
};

module.exports = config;
