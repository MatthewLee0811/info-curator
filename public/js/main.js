// main.js - 프론트엔드 JS
// 버전: 1.0.0 | 수정일: 2026-02-08

/**
 * 요약 텍스트 펼침/접기 토글
 */
function toggleSummary(idx) {
  var el = document.getElementById('summary-' + idx);
  if (!el) return;
  el.classList.toggle('expanded');
  var btn = el.nextElementSibling;
  if (btn) {
    btn.textContent = el.classList.contains('expanded') ? '접기' : '더보기';
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

  // 버튼 비활성화 + 스피너
  btn.disabled = true;
  btn.classList.add('opacity-50');
  icon.classList.add('spinner');

  // 상태 메시지 표시
  statusMsg.classList.remove('hidden');
  statusContent.className = 'p-3 rounded-lg text-sm bg-blue-50 text-blue-700';
  statusContent.textContent = '큐레이션을 수집하고 있습니다... 잠시 기다려주세요.';

  try {
    var response = await fetch('/api/refresh', { method: 'POST' });
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
