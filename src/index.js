// index.js - 앱 진입점 (Express 서버 + 스케줄러)
// 버전: 1.0.0 | 수정일: 2026-02-08
const express = require('express');
const path = require('path');
const cron = require('node-cron');
const config = require('./config');
const routes = require('./web/routes');
const { runPipeline } = require('./pipeline');
const logger = require('./utils/logger');

const app = express();

// EJS 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'web', 'views'));

// 정적 파일
app.use(express.static(path.join(__dirname, '..', 'public')));

// JSON 파싱
app.use(express.json());

// 라우터
app.use('/', routes);

// --test 모드: 즉시 1회 파이프라인 실행 후 종료
const isTestMode = process.argv.includes('--test');

if (isTestMode) {
  logger.info('[index] 테스트 모드: 파이프라인 즉시 실행');
  runPipeline().then(result => {
    logger.info(`[index] 테스트 결과: ${JSON.stringify(result)}`);
    process.exit(0);
  }).catch(err => {
    logger.error(`[index] 테스트 실패: ${err.message}`);
    process.exit(1);
  });
} else {
  // Express 서버 시작
  const port = config.env.port;
  app.listen(port, () => {
    logger.info(`[index] 서버 시작: http://localhost:${port}`);
  });

  // 스케줄러 설정
  const { morning, evening, timezone } = config.schedule;

  // 오전 8시 (KST)
  cron.schedule(morning, async () => {
    logger.info('[cron] 오전 스케줄 실행');
    await runPipeline();
  }, { timezone });

  // 오후 5시 (KST)
  cron.schedule(evening, async () => {
    logger.info('[cron] 오후 스케줄 실행');
    // 토요일(6)이면 주간 요약 포함
    const now = new Date();
    const kstDay = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCDay();
    const includeWeekly = kstDay === 6;
    await runPipeline({ includeWeekly });
  }, { timezone });

  logger.info(`[index] 스케줄 등록 완료 - 오전: ${morning}, 오후: ${evening} (${timezone})`);
}
