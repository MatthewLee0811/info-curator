// main.js - 프론트엔드 JS (카테고리 지원)
// 버전: 2.0.0 | 수정일: 2026-02-09

/**
 * 요약 텍스트 펼침/접기 토글
 */
function toggleSummary(idx) {
  var el = document.getElementById('summary-' + idx);
  if (!el) return;
  el.classList.toggle('collapsed');
  var btn = el.nextElementSibling;
  if (btn) {
    btn.textContent = el.classList.contains('collapsed') ? '더보기' : '접기';
  }
}

/**
 * 키워드 입력 필드 Enter 키 지원 (카테고리별)
 */
document.addEventListener('DOMContentLoaded', function() {
  // 모든 키워드 입력 필드에 Enter 이벤트 바인딩
  var inputs = document.querySelectorAll('[id^="keywordInput-"]');
  inputs.forEach(function(input) {
    var catId = input.id.replace('keywordInput-', '');
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addKeyword(catId);
      }
    });
  });
});

/**
 * 키워드 추가 (카테고리별)
 */
function addKeyword(category) {
  var input = document.getElementById('keywordInput-' + category);
  if (!input) return;
  var keyword = input.value.trim();
  if (!keyword) return;

  // 중복 검사
  var tags = document.getElementById('keywordTags-' + category);
  var existing = tags.querySelectorAll('.keyword-tag');
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getAttribute('data-keyword') === keyword) {
      input.value = '';
      return;
    }
  }

  // 태그 생성
  var span = document.createElement('span');
  span.className = 'keyword-tag inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm';
  span.setAttribute('data-keyword', keyword);
  span.innerHTML = keyword + ' <button onclick="removeKeyword(this)" class="ml-1 text-blue-500 hover:text-red-500 font-bold">&times;</button>';
  tags.appendChild(span);
  input.value = '';
  input.focus();
}

/**
 * 키워드 삭제
 */
function removeKeyword(btn) {
  btn.parentElement.remove();
}

/**
 * 키워드 저장 (카테고리별)
 */
async function saveKeywords(category) {
  var statusEl = document.getElementById('saveStatus-' + category);
  var tags = document.querySelectorAll('#keywordTags-' + category + ' .keyword-tag');

  var keywords = [];
  tags.forEach(function(tag) {
    keywords.push(tag.getAttribute('data-keyword'));
  });

  statusEl.textContent = '저장 중...';
  statusEl.className = 'text-sm text-gray-500';

  try {
    var response = await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: category, keywords: keywords })
    });
    var result = await response.json();

    if (result.success) {
      statusEl.textContent = '저장되었습니다.';
      statusEl.className = 'text-sm text-green-600';
    } else {
      statusEl.textContent = '오류: ' + result.message;
      statusEl.className = 'text-sm text-red-600';
    }
  } catch (error) {
    statusEl.textContent = '저장 실패: ' + error.message;
    statusEl.className = 'text-sm text-red-600';
  }
}

/**
 * "지금 가져오기" 버튼 클릭 핸들러
 */
async function refreshPipeline() {
  var btn = document.getElementById('refreshBtn');
  var icon = document.getElementById('refreshIcon');
  var statusMsg = document.getElementById('statusMsg');
  var statusContent = document.getElementById('statusContent');

  // 현재 카테고리 탭 감지
  var params = new URLSearchParams(window.location.search);
  var category = params.get('category') || '';
  var apiUrl = category ? '/api/refresh?category=' + category : '/api/refresh';

  // 버튼 비활성화 + 스피너
  btn.disabled = true;
  btn.classList.add('opacity-50');
  icon.classList.add('spinner');

  // 상태 메시지 표시
  statusMsg.classList.remove('hidden');
  statusContent.className = 'p-3 rounded-lg text-sm bg-blue-50 text-blue-700';
  statusContent.textContent = '큐레이션을 수집하고 있습니다... 잠시 기다려주세요.';

  try {
    var response = await fetch(apiUrl, { method: 'POST' });
    var result = await response.json();

    if (result.success) {
      statusContent.className = 'p-3 rounded-lg text-sm bg-green-50 text-green-700';
      statusContent.textContent = result.message + ' (' + result.collected + '건 수집 → ' + result.selected + '건 엄선, ' + result.elapsed + ')';
      // 2초 후 페이지 새로고침
      setTimeout(function() { window.location.reload(); }, 2000);
    } else {
      statusContent.className = 'p-3 rounded-lg text-sm bg-red-50 text-red-700';
      statusContent.textContent = '오류: ' + result.message;
    }
  } catch (error) {
    statusContent.className = 'p-3 rounded-lg text-sm bg-red-50 text-red-700';
    statusContent.textContent = '요청 실패: ' + error.message;
  } finally {
    btn.disabled = false;
    btn.classList.remove('opacity-50');
    icon.classList.remove('spinner');
  }
}
