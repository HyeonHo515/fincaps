const pages = ['home', 'board', 'ai', 'code', 'chat', 'mypage'];

function showPage(name) {

  window.currentPage = name;

  pages.forEach(p => {

    const pageEl = document.getElementById('page-' + p);

    if (pageEl) {
      pageEl.classList.toggle('active', p === name);
    }
  });

  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.remove('active');
  });

  const navEl = document.getElementById('nav-' + name);

  if (navEl) {
    navEl.classList.add('active');
  }

  if (name === 'ai' && typeof injectQuizUI === 'function') {
    setTimeout(injectQuizUI, 50);
  }

  if (name === 'mypage') {
    if (typeof switchMyPageTab === 'function') {
      switchMyPageTab('pdf', document.querySelector('#mypage-tabs .btab'));
    }
  }

  // community-page.js 파일의 showPage 함수 내부 수정

  if (name === 'ai') {
      // 1. 현재 필터 상태를 전체('all')로 명확히 지정해 줍니다.
      window.currentNoteFilter = 'all';

      // 2. [가장 중요] AI 학습 페이지가 활성화된 후 DOM 요소들이 완전히 준비되도록 
      // setTimeout을 주어 확실하게 renderNotes를 실행시킵니다.
      setTimeout(() => {
          if (typeof renderNotes === 'function') {
              renderNotes('all'); // 이제 화면에 notesGrid가 존재하므로 정상적으로 데이터가 뜹니다!
          }
      }, 50); // 50ms 정도 딜레이를 주어 notesGrid가 렌더링될 시간을 벌어줍니다.

      if (typeof window.loadStudyMemos === 'function') {
          window.loadStudyMemos(); 
      } else if (typeof renderStudyMemos === 'function') {
          renderStudyMemos();
      }
  }

  if (name === 'board') {
    hideDetail();
    renderBoard();
  }

  if (name === 'chat') {
    exitChatRoom();
    renderChatRoomList();
  }

  window.scrollTo(0, 0);
}

function showToast(message, icon = 'OK') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  document.getElementById('toastMsg').textContent = message;
  document.getElementById('toastIcon').textContent = icon;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

let memoryStorage = {};

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return memoryStorage[key] || null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    memoryStorage[key] = value;
  }
}

function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    delete memoryStorage[key];
  }
}

function getCurrentUserId() {
  const communityUser = safeGetItem('currentUser');
  if (communityUser) {
    try {
      const parsed = JSON.parse(communityUser);
      if (parsed?.id) return String(parsed.id);
      if (parsed?.email) return parsed.email;
    } catch (error) {
      // Fall back to the legacy local user id below.
    }
  }
  return safeGetItem('codemind_user_id') || 'guest';
}
