// arxiv.js - ArXiv API 수집기 (API 키 불필요, XML 응답)
// 버전: 1.0.0 | 수정일: 2026-02-09
const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../utils/logger');
const config = require('../config');

const ARXIV_API_URL = 'http://export.arxiv.org/api/query';
const REQUEST_DELAY = 3000; // ArXiv API 권장: 요청 간 3초 대기

/**
 * 요청 간 딜레이
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ArXiv XML 응답 파싱
 */
async function parseArxivResponse(xmlData) {
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xmlData);

  const feed = result.feed;
  if (!feed || !feed.entry) return [];

  // entry가 하나일 때 배열로 변환
  const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];

  return entries.map(entry => {
    // 저자 처리 (단수/복수)
    let authors = '';
    if (entry.author) {
      const authorList = Array.isArray(entry.author) ? entry.author : [entry.author];
      authors = authorList.map(a => a.name || '').join(', ');
    }

    // 카테고리 처리
    let categories = [];
    if (entry.category) {
      const catList = Array.isArray(entry.category) ? entry.category : [entry.category];
      categories = catList.map(c => c.$ && c.$.term).filter(Boolean);
    }

    // ArXiv ID 추출
    const arxivId = (entry.id || '').replace('http://arxiv.org/abs/', '');

    return {
      arxivId,
      title: (entry.title || '').replace(/\s+/g, ' ').trim(),
      summary: (entry.summary || '').replace(/\s+/g, ' ').trim(),
      url: entry.id || '',
      pdfUrl: entry.id ? entry.id.replace('/abs/', '/pdf/') : '',
      authors,
      categories,
      published: entry.published || '',
      updated: entry.updated || ''
    };
  });
}

/**
 * ArXiv에서 키워드 기반 논문 수집
 * @returns {Array} 수집된 논문 배열
 */
async function collectArxiv() {
  const keywords = config.keywords;
  const { categories, maxResults } = config.arxiv;
  const allArticles = [];

  for (const keyword of keywords) {
    try {
      // 카테고리 필터 + 키워드 검색 쿼리 구성
      const catQuery = categories.map(c => `cat:${c}`).join('+OR+');
      const searchQuery = `(ti:"${keyword}"+OR+abs:"${keyword}")+AND+(${catQuery})`;

      const response = await axios.get(ARXIV_API_URL, {
        params: {
          search_query: searchQuery,
          start: 0,
          max_results: maxResults,
          sortBy: 'submittedDate',
          sortOrder: 'descending'
        },
        timeout: 15000
      });

      const papers = await parseArxivResponse(response.data);

      for (const paper of papers) {
        allArticles.push({
          id: `arxiv_${paper.arxivId}`,
          title: paper.title,
          url: paper.url,
          pdfUrl: paper.pdfUrl,
          selftext: paper.summary.substring(0, 500),
          score: 0, // ArXiv에는 점수 개념 없음
          numComments: 0,
          categories: paper.categories,
          createdAt: paper.published,
          author: paper.authors,
          source: 'arxiv',
          matchedKeyword: keyword
        });
      }

      logger.info(`[ArXiv] 키워드 "${keyword}": ${papers.length}건 수집`);
      await delay(REQUEST_DELAY);
    } catch (error) {
      logger.error(`[ArXiv] 키워드 "${keyword}" 수집 실패: ${error.message}`);
      await delay(REQUEST_DELAY);
    }
  }

  // URL 기준 중복 제거
  const unique = new Map();
  for (const article of allArticles) {
    if (!unique.has(article.url)) {
      unique.set(article.url, article);
    }
  }

  const result = Array.from(unique.values());
  logger.info(`[ArXiv] 총 ${result.length}건 수집 완료 (중복 제거 후)`);
  return result;
}

module.exports = { collectArxiv };
