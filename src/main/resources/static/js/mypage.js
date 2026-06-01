function switchMyPageTab(tabId, element) {
  const tabs = document.querySelectorAll('#mypage-tabs .btab');
  tabs.forEach(tab => tab.classList.remove('active'));

  if (element) {
    element.classList.add('active');
  } else {
    const targetTab = Array.from(tabs).find(tab => tab.getAttribute('onclick')?.includes(`'${tabId}'`));
    if (targetTab) targetTab.classList.add('active');
  }

  const sections = document.querySelectorAll('.mypage-section');
  sections.forEach(sec => sec.style.display = 'none');
  
  const targetSection = document.getElementById(`mypage-content-${tabId}`);
  if (targetSection) {
    targetSection.style.display = 'block';
  }

  renderMyPageMockData(tabId);
}

async function loadSavedSummaryToStudyPage(noteId) {
  try {
    const response = await fetch(`/api/pdf/summary/${noteId}`);

    if (!response.ok) {
      throw new Error('요약 노트를 불러오지 못했습니다.');
    }

    const note = await response.json();
    openSummaryDetailModal(note);

  } catch (error) {
    console.error(error);
    showToast(error.message || '요약 노트 조회 실패', '❌');
  }
}

function openSummaryDetailModal(note) {
  let modal = document.getElementById('summaryDetailModal');

  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'summaryDetailModal';

    modal.innerHTML = `
      <div class="modal" style="max-width:760px; max-height:82vh; overflow:auto;">
        <div style="margin-bottom:22px;">
          <h2 style="font-family:var(--font-mono); color:var(--text); margin-bottom:8px;">
            PDF 요약 노트
          </h2>
          <p id="summary-detail-meta" style="font-size:13px; color:var(--text2); margin:0;"></p>
        </div>

        <div>
          <h3 style="font-size:16px; font-weight:800; margin-bottom:10px; color:var(--text);">
            요약 내용
          </h3>
          <div id="summary-detail-content"
            style="white-space:pre-wrap; line-height:1.8; font-size:14px; color:var(--text2); background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:16px;">
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:24px;">
          <button class="btn-outline" onclick="closeSummaryDetailModal()">
            닫기
          </button>
        </div>
      </div>
    `;

    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeSummaryDetailModal();
      }
    });

    document.body.appendChild(modal);
  }

  const savedAt = note.createdAt || note.cratedAt;
  const dateStr = savedAt ? String(savedAt).split('T')[0] : '확인 불가';

  document.getElementById('summary-detail-meta').textContent =
    `요약 노트 #${note.id} · 저장일 ${dateStr}`;

  document.getElementById('summary-detail-content').textContent =
    note.summary || '저장된 요약 내용이 없습니다.';

  modal.classList.add('open');
}

function closeSummaryDetailModal() {
  const modal = document.getElementById('summaryDetailModal');
  if (modal) {
    modal.classList.remove('open');
  }
}

async function renderMyPageMockData(tabId) {

  if (typeof currentUser === 'undefined') {
    window.currentUser = { id: 1, name: "테스트 유저" };
  }
  if (typeof posts === 'undefined') {
    window.posts = [];
  }

  if (tabId === 'pdf') {
    const pdfList = document.getElementById('mypage-pdf-list');
    if (!pdfList) return;

    pdfList.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text3);">요약 기록을 불러오는 중입니다...</div>`;

    // 1. 유저 아이디 가져오기 (비로그인시 테스트 아이디 제공)
    const savedUser = JSON.parse(localStorage.getItem("currentUser"));
    let userId = savedUser ? savedUser.id : (sessionStorage.getItem("userId") || localStorage.getItem("userId") || "guest");
    
    try {
      // 2. DB 연동 API 호출
      const response = await fetch('/api/pdf/summaries', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        }
      });

      if (!response.ok) {
        throw new Error("서버로부터 데이터를 가져오지 못했습니다.");
      }

      const mySummaries = await response.json(); 

      if (!mySummaries || mySummaries.length === 0) {
        pdfList.innerHTML = `
          <div style="text-align:center; padding:40px; color:var(--text3);">
            저장된 AI 요약 기록이 없습니다.
          </div>`;
        return;
      }

      // 3. 동적 HTML 렌더링
      pdfList.innerHTML = mySummaries.map(note => {
        // 요약 내용 안전 가드 및 글자수 제한 처리
        const rawSummary = note.summary || '요약 내용 없음';
        const shortSummary = rawSummary.length > 80 
          ? rawSummary.substring(0, 80) + '...' 
          : rawSummary;

        // 날짜 형식 예외 처리 (YYYY-MM-DD)
        const dateStr = note.cratedAt && note.cratedAt.includes('T')
          ? note.cratedAt.split('T')[0] 
          : (note.cratedAt || '확인 불가');

        return `
          <div class="post-item" onclick="loadSavedSummaryToStudyPage(${note.id})" style="cursor:pointer; margin-bottom:12px;">
            <div class="post-main">
              <div class="post-title" style="font-weight:600; font-size:16px; color:var(--text1); margin-bottom:8px;">
                📄 요약 노트 #${note.id}
              </div>
              <div class="post-content" style="font-size:14px; color:var(--text2); line-height:1.5; margin-bottom:10px;">
                ${shortSummary}
              </div>
              <div class="post-info" style="font-size:12px; color:var(--text3);">
                <span>❓ 퀴즈: ${note.quizQuestion ? '✅ 생성됨' : '❌ 없음'}</span>
                <span style="margin-left: 15px;">📅 저장일: ${dateStr}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

    } catch (error) {
      console.error("마이페이지 연동 에러:", error);
      pdfList.innerHTML = `
        <div style="text-align:center; padding:40px; color:red;">
          데이터를 로드하는 중 오류가 발생했습니다.<br>
          <small style="color:var(--text3); font-size:12px;">${error.message}</small>
        </div>`;
    }
    return;
  }
  
  else if (tabId === 'quiz') {
    const quizList = document.getElementById('mypage-quiz-list');
    if (!quizList) return;

    // 1) note-quiz.js에 정의된 함수나 전역 변수를 통해 최신 오답노트 배열 가져오기
    let activeNotes = [];
    if (typeof window.getAppNotes === 'function') {
      activeNotes = window.getAppNotes();
    } else if (typeof window.notes !== 'undefined') {
      activeNotes = window.notes;
    }

    // 2) 데이터가 없을 때 안내문 출력
    if (!activeNotes || !Array.isArray(activeNotes) || activeNotes.length === 0) {
      quizList.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--text3);">
          저장된 오답노트 기록이 없습니다.<br>
          <small style="font-size:12px; color:var(--text4); display:block; margin-top:6px;">
            AI 학습에서 퀴즈를 풀고 오답을 기록해 보세요!
          </small>
        </div>`;
      return;
    }

    // 3) saveWrongQuizNote 구조에 맞추어 오답노트 리스트 렌더링
    quizList.innerHTML = activeNotes.map(note => {
      // 데이터 누락을 방지하기 위한 예외 처리 변수들
      const noteTitle = note.title || `AI 예상문제 오답 (${note.subject || '전체'})`;
      const questionText = note.q || '문제가 없습니다.';
      const myWrongAnswer = note.wrong || '선택 또는 입력 안 함';
      const correctAnswerAndDesc = note.correct || '정답 정보가 없습니다.';
      const registerDate = note.date || '최근';
      const borderLeftColor = note.color || '#ef4444'; // 과목별 고유 색상 또는 기본 붉은색

      return `
        <div class="post-item" style="margin-bottom:15px; border-left: 4px solid ${borderLeftColor}; padding: 15px; background: var(--bg2); border-radius: 4px;">
          <div class="post-main">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <span class="post-title" style="font-weight:600; font-size:14px; color:var(--text1);">
                ❌ ${escapeHtml(noteTitle)}
              </span>
              <span style="font-size:12px; color:var(--text3); font-weight: 500;">
                📚 ${escapeHtml(note.subject || '일반')}
              </span>
            </div>
            
            <div class="post-content" style="font-size:14px; color:var(--text1); font-weight:500; margin-bottom:12px; line-height:1.4;">
              ${escapeHtml(questionText)}
            </div>
            
            <div style="background: var(--bg1); padding: 12px; border-radius: 6px; font-size:13px; line-height:1.6;">
              <div style="color: #f87171; font-weight: 500;">
                <strong>❌ 나의 오답:</strong> ${escapeHtml(myWrongAnswer)}
              </div>
              <div style="color: #4ade80; margin-top:6px; font-weight: 500; white-space: pre-wrap;"><strong>✅ 실제 정답 및 해설:</strong>\n${escapeHtml(correctAnswerAndDesc)}</div>
            </div>

            <div style="margin-top: 14px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; color: var(--text3);">
                📅 기록일: ${escapeHtml(registerDate)}
              </span>
              
              ${typeof window.deleteNote === 'function' ? `
                <button 
                  onclick="if(confirm('이 오답노트를 삭제하시겠습니까?')){ window.deleteNote(${note.id}).then(() => switchMyPageTab('quiz', document.querySelector('#mypage-tabs .btab.active')) ) }"
                  style="background:transparent; border:none; color:var(--text3); font-size:12px; cursor:pointer; text-decoration:underline;"
                  onmouseover="this.style.color='#ef4444'"
                  onmouseout="this.style.color='var(--text3)'"
                >
                  지우기
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  else if (tabId === 'posts') {

    const postList =
      document.getElementById(
        'mypage-post-list'
      );

    const myPosts = posts.filter(
      p => {

        return Number(p.authorId)
          === Number(currentUser.id);
      }
    );

    postList.innerHTML =
      myPosts.length > 0
        ? myPosts.map(p => `
            <div
              onclick="
                showPage('board');
                viewPostDetail(${p.id});
              "
              style="
                background:#1e293b;
                border:1px solid #334155;
                border-radius:12px;
                padding:18px;
                margin-bottom:14px;
                cursor:pointer;
                transition:0.2s;
              "
            >

              <div style="
                font-size:18px;
                font-weight:700;
                color:white;
                margin-bottom:10px;
              ">
                ${p.title}
              </div>

              <div style="
                display:flex;
                gap:14px;
                font-size:13px;
                color:#94a3b8;
              ">
                <span>
                  📅 ${p.date || '-'}
                </span>

                <span>
                  👁️ ${p.views ?? 0}
                </span>

                <span>
                  👍 ${p.likes ?? 0}
                </span>
              </div>

            </div>
          `).join('')
        : `
          <div style="
            text-align:center;
            padding:40px;
            color:#94a3b8;
          ">
            작성한 게시글이 없습니다.
          </div>
        `;
  }
  else if (tabId === 'comments') {

    const commentList =
      document.getElementById(
        'mypage-comment-list'
      );

    const myComments = [];

    posts.forEach(post => {

      (post.comments || []).forEach(c => {

        if (
          Number(c.authorId) ===
          Number(currentUser.id)
        ) {

          myComments.push({
            postId: post.id,
            postTitle: post.title,
            comment: c.text,
            date: c.date
          });
        }
      });
    });

    commentList.innerHTML =
      myComments.length
        ? myComments.map(c => `
            <div
              class="post-item"
              onclick="
                showPage('board');
                viewPostDetail(${c.postId});
              "
            >

              <div class="post-main">

                <div style="
                  font-size:13px;
                  color:var(--text2);
                  margin-bottom:6px;
                ">
                  게시글:
                  ${c.postTitle}
                </div>

                <div class="post-title"
                  style="
                    font-weight:500;
                    font-size:15px;
                  ">
                  ${c.comment}
                </div>

                <div class="post-info">
                  <span>
                    📅 ${c.date}
                  </span>
                </div>

              </div>

            </div>
          `).join('')
        : `
          <div style="
            text-align:center;
            padding:40px;
            color:var(--text3);
          ">
            작성한 댓글이 없습니다.
          </div>
        `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderMyPageMockData('pdf');
});

document.addEventListener('click', e => {
  const mypageBtn = e.target.closest('[onclick*="mypage"]');
  if (mypageBtn) {
    const firstTab = document.querySelector('#mypage-tabs .btab:nth-child(1)');
    switchMyPageTab('pdf', firstTab); 
  }
});