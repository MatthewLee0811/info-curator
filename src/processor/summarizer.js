// summarizer.js - GPT-4o-mini 기반 요약/번역 모듈
// 버전: 1.2.0 | 수정일: 2026-02-09
const OpenAI = require('openai');
const logger = require('../utils/logger');
const config = require('../config');

let openaiClient = null;

function getClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: config.env.openaiApiKey });
  }
  return openaiClient;
}

/**
 * 기사 배열을 배치로 요약 (토큰 절약)
 * @param {Array} articles - 점수화된 기사 배열
 * @returns {Array} 한국어 요약이 추가된 기사 배열
 */
async function summarizeArticles(articles) {
  if (!articles || articles.length === 0) return [];

  const client = getClient();
  const batchSize = 3;
  const results = [];

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    try {
      const summaries = await summarizeBatch(client, batch);
      for (let j = 0; j < batch.length; j++) {
        results.push({
          ...batch[j],
          summary: summaries[j] || '요약을 생성할 수 없습니다.'
        });
      }
      logger.info(`[summarizer] 배치 ${Math.floor(i / batchSize) + 1} 요약 완료 (${batch.length}건)`);
    } catch (error) {
      logger.error(`[summarizer] 배치 요약 실패: ${error.message}`);
      // 실패 시 기본 메시지로 대체
      for (const article of batch) {
        results.push({ ...article, summary: '요약 생성 실패' });
      }
    }
  }

  return results;
}

/**
 * 배치 단위 요약 요청
 */
async function summarizeBatch(client, batch, retryCount = 0) {
  const articlesText = batch.map((a, idx) => {
    const text = a.selftext ? `\n내용: ${a.selftext.substring(0, 800)}` : '';
    return `[${idx + 1}] 제목: ${a.title}${text}\n출처: ${a.source} | 점수: ${a.scores.total}`;
  }).join('\n\n');

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 기술 뉴스 큐레이터입니다. 각 기사를 한국어로 마크다운 형식으로 요약해주세요.

반드시 아래 형식을 따르세요:
**📌 핵심 요약**
한 줄로 이 기사가 무엇에 대한 것인지 설명

**⚡ 주요 포인트**
• 포인트 1
• 포인트 2
• 포인트 3

**💬 반응 및 의의**
커뮤니티 반응, 업계 영향, 또는 이 기사가 중요한 이유를 1-2줄로 설명

기사 유형별 주요 포인트 작성 기준:
- 비교 기사: 각각의 장단점을 구체적으로 대비하여 작성
- 신기술 기사: 어떤 기술인지, 기존 대비 차이점, 활용 분야
- 이슈/트렌드 기사: 등장 배경, 핵심 논점, 영향
- 숫자나 벤치마크가 있으면 반드시 포함`
        },
        {
          role: 'user',
          content: `다음 ${batch.length}개 기사를 각각 위 마크다운 형식으로 요약해주세요. 반드시 JSON 배열로만 응답해주세요. 형식: ["마크다운요약1", "마크다운요약2", ...]\n\n${articlesText}`
        }
      ],
      temperature: 0.3,
      max_tokens: 3000
    });

    const content = response.choices[0].message.content.trim();
    // JSON 배열 파싱
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('JSON 형식 응답을 파싱할 수 없습니다');
  } catch (error) {
    if (retryCount < 2) {
      logger.warn(`[summarizer] 재시도 ${retryCount + 1}/2: ${error.message}`);
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return summarizeBatch(client, batch, retryCount + 1);
    }
    throw error;
  }
}

/**
 * 주간 요약 생성 (토요일 실행)
 * @param {Array} weeklyArticles - 최근 7일간 기사 배열
 * @returns {string} 한국어 주간 요약
 */
async function generateWeeklySummary(weeklyArticles) {
  if (!weeklyArticles || weeklyArticles.length === 0) {
    return '이번 주에 수집된 기사가 없습니다.';
  }

  const client = getClient();
  const topArticles = weeklyArticles
    .sort((a, b) => b.scores.total - a.scores.total)
    .slice(0, 20);

  const articlesText = topArticles.map((a, idx) => {
    return `[${idx + 1}] ${a.title} (점수: ${a.scores.total}, 출처: ${a.source})`;
  }).join('\n');

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 AI/기술 트렌드 분석가입니다. 이번 주 주요 기사들을 분석하여 한국어로 주간 요약을 작성해주세요.'
        },
        {
          role: 'user',
          content: `이번 주 주요 기사 목록입니다. 3-5개의 핵심 트렌드를 파악하고, 각 트렌드에 대해 2-3문장으로 설명해주세요.\n\n${articlesText}`
        }
      ],
      temperature: 0.5,
      max_tokens: 2000
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    logger.error(`[summarizer] 주간 요약 생성 실패: ${error.message}`);
    return '주간 요약 생성 중 오류가 발생했습니다.';
  }
}

module.exports = { summarizeArticles, generateWeeklySummary };
