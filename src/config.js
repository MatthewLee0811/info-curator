// config.js - 설정 로드 모듈
// 버전: 1.1.0 | 수정일: 2026-02-09
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const configFilePath = path.join(__dirname, '..', 'config', 'default.json');
const defaultConfig = require(configFilePath);

// 필수 환경변수 검증 (Reddit는 공개 .json 엔드포인트 사용으로 키 불필요)
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID'
];

function validateEnv() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`[config] 누락된 환경변수: ${missing.join(', ')}`);
    console.warn('[config] .env 파일을 확인해주세요. (.env.example 참고)');
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
  // default.json에서 로드한 설정
  keywords: defaultConfig.keywords,
  reddit: defaultConfig.reddit,
  hackernews: defaultConfig.hackernews,
  scoring: defaultConfig.scoring,
  schedule: defaultConfig.schedule,
  // 경로 설정
  paths: {
    data: path.join(__dirname, '..', 'data'),
    logs: path.join(__dirname, '..', 'logs')
  },
  // 환경변수 검증 함수
  validateEnv,
  // 키워드 동적 관리 함수
  getKeywords() {
    return config.keywords;
  },
  setKeywords(keywords) {
    config.keywords = keywords;
    const raw = fs.readFileSync(configFilePath, 'utf-8');
    const json = JSON.parse(raw);
    json.keywords = keywords;
    fs.writeFileSync(configFilePath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
  }
};

module.exports = config;
