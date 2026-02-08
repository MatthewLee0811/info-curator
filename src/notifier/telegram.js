// telegram.js - 텔레그램 알림 모듈
// 버전: 1.0.0 | 수정일: 2026-02-08
const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/logger');
const config = require('../config');

let bot = null;

function getBot() {
  if (!bot && config.env.telegramBotToken) {
    bot = new TelegramBot(config.env.telegramBotToken, { polling: false });
  }
  return bot;
}

/**
 * 텔레그램 알림 전송
 * @param {number} collected - 수집된 기사 수
 * @param {number} selected - 엄선된 기사 수
 * @param {boolean} includeWeekly - 주간 요약 포함 여부
 * @param {string|null} errorMsg - 에러 메시지 (에러 알림용)
 */
async function sendNotification(collected, selected, includeWeekly = false, errorMsg = null) {
  const telegramBot = getBot();
  if (!telegramBot || !config.env.telegramChatId) {
    logger.warn('[telegram] 봇 토큰 또는 채팅 ID가 설정되지 않았습니다. 알림을 건너뜁니다.');
    return;
  }

  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const siteUrl = config.env.siteUrl;
  let message;

  if (errorMsg) {
    message = `⚠️ 큐레이션 오류 발생 (${now})\n\n오류: ${errorMsg}\n\n🔗 대시보드: ${siteUrl}`;
  } else {
    message = `📋 새 AI 큐레이션 도착! (${now})\n📊 ${collected}건 수집 → ${selected}건 엄선\n🔗 자세히 보기: ${siteUrl}`;
    if (includeWeekly) {
      message += `\n\n📅 이번 주 요약도 함께 확인하세요!\n🔗 주간 요약: ${siteUrl}/weekly`;
    }
  }

  try {
    await telegramBot.sendMessage(config.env.telegramChatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
    logger.info('[telegram] 알림 전송 완료');
  } catch (error) {
    logger.error(`[telegram] 알림 전송 실패: ${error.message}`);
  }
}

module.exports = { sendNotification };
