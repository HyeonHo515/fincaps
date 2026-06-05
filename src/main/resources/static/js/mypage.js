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

  const summaryId = note.id || note.summaryId || 0;

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

        <hr style="border:0; border-top:1px dashed var(--border); margin:24px 0;">
        
        <div>
          <h3 style="font-size:16px; font-weight:800; margin-bottom:10px; color:var(--text);">
            📝 이 요약본의 학습 메모
          </h3>
          
          <div id="mypage-memo-list" style="margin-bottom:15px; max-height:200px; overflow-y:auto; font-size:13px; color:var(--text2);">
            로딩 중...
          </div>

          <div style="display:flex; gap:10px;">
            <textarea id="mypageMemoInput" placeholder="이 요약 노트에 대한 추가 메모를 남겨보세요." 
              style="flex:1; height:54px; padding:10px; border-radius:6px; background:var(--bg1); color:var(--text1); border:1px solid var(--border); resize:none; font-size:13px;"></textarea>
            <button class="btn-secondary" id="mypageMemoSubmitBtn" style="padding:0 16px; font-size:13px; white-space:nowrap;">
              등록
            </button>
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

  modal.setAttribute('data-summary-id', summaryId);

  const savedAt = note.cratedAt || note.cratedAt;
  const dateStr = savedAt ? String(savedAt).split('T')[0] : '확인 불가';

  document.getElementById('summary-detail-meta').textContent =
    `요약 노트 #${note.id} · 저장일 ${dateStr}`;

  document.getElementById('summary-detail-content').textContent =
    note.summary || '저장된 요약 내용이 없습니다.';

  const submitBtn = document.getElementById('mypageMemoSubmitBtn');
  submitBtn.onclick = () => saveMypageStudyMemo(summaryId);

  modal.classList.add('open');

  loadMypageStudyMemos(summaryId);
}

async function loadMypageStudyMemos(summaryId) {
  const listContainer = document.getElementById('mypage-memo-list');
  if (!listContainer) return;

  let currentId = 'guest';
  const savedUser = JSON.parse(localStorage.getItem("currentUser"));
  if (savedUser && savedUser.id) currentId = savedUser.id;
  else currentId = sessionStorage.getItem("userId") || localStorage.getItem("userId") || "guest";

  try {
    // pdf-study.js의 api 규격과 동일하게 호출 (/api/pdf/memo/{summaryId})
    const response = await fetch(`/api/pdf/memo/${summaryId}`, {
      headers: { 'X-User-Id': String(currentId) }
    });
    
    if (!response.ok) throw new Error('메모 로드 실패');
    
    const memos = await response.json();
    
    if (!memos || memos.length === 0) {
      listContainer.innerHTML = `<div style="color:var(--text3); padding:10px 0;">작성된 학습 메모가 없습니다.</div>`;
      return;
    }

    listContainer.innerHTML = memos.map(memo => {
      const date = memo.createdAt && memo.createdAt.includes('T')
        ? memo.createdAt.split('T')[0] 
        : (memo.createdAt ? String(memo.createdAt).substring(0, 10) : '방금 전');
      const memoId = memo.id;
      return `
        <div id="mypage-memo-item-${memoId}" style="background:var(--bg1); padding:10px; border-radius:6px; margin-bottom:8px; border:1px solid var(--border);">
          <div class="memo-text-zone" style="word-break:break-all; line-height:1.4; font-size:13.5px; color:var(--text1);">
            ${localEscapeHtml(memo.memoContent || '')}
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--text3); margin-top:6px;">
            <div class="memo-btn-zone">
              <button onclick="editMypageStudyMemo(${memoId}, ${summaryId})" style="background:none; border:none; color:var(--text3); cursor:pointer; padding:0 4px; text-decoration:underline;">수정</button>
              <button onclick="deleteMypageStudyMemo(${memoId}, ${summaryId})" style="background:none; border:none; color:#f87171; cursor:pointer; padding:0 4px; text-decoration:underline;">삭제</button>
            </div>
            <div>📅 ${date}</div>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error(error);
    listContainer.innerHTML = `<div style="color:red; font-size:12px;">메모를 불러오지 못했습니다.</div>`;
  }
}

// 💡 [추가] 마이페이지 모달 내에서 새로운 메모를 작성 및 저장하는 함수
async function saveMypageStudyMemo(summaryId) {
  const input = document.getElementById('mypageMemoInput');
  const content = input.value.trim();
  
  if (!content) {
    if (typeof showToast === 'function') showToast('메모 내용을 입력해주세요.', 'WARN');
    else alert('메모 내용을 입력해주세요.');
    return;
  }

  // 로그인 유저 식별자 확보
  let userId = sessionStorage.getItem("userId") || localStorage.getItem("userId");
  const savedUser = JSON.parse(localStorage.getItem("currentUser"));
  if (savedUser && savedUser.id) userId = savedUser.id;

  if (!userId || userId === 'guest') {
    if (typeof showToast === 'function') showToast('로그인 후 메모를 저장할 수 있습니다.', 'WARN');
    else alert('로그인 후 이용 가능합니다.');
    return;
  }

  const payload = {
    summaryId: String(summaryId),
    memoContent: content
  };

  try {
    const response = await fetch('/api/pdf/memo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-User-Id': String(userId)
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(await response.text());

    input.value = '';
    if (typeof showToast === 'function') showToast('학습 메모를 추가했습니다. ✅');
    
    // 등록 성공 후 메모 목록 새로고침
    loadMypageStudyMemos(summaryId);

  } catch (error) {
    console.error(error);
    if (typeof showToast === 'function') showToast('메모 저장 실패 ❌', 'WARN');
  }
}

async function editMypageStudyMemo(memoId, summaryId) {
  const itemDiv = document.getElementById(`mypage-memo-item-${memoId}`);
  if (!itemDiv) return;

  const textZone = itemDiv.querySelector('.memo-text-zone');
  const btnZone = itemDiv.querySelector('.memo-btn-zone');
  
  // 수정 전 원래 텍스트 추출 (HTML escape 복원 대신 raw text를 취하기 위해 임시 div 활용)
  const currentText = textZone.innerText;

  // 1. 해당 메모 아이템을 인라인 수정 textarea 폼으로 전환
  textZone.innerHTML = `
    <textarea class="edit-memo-input" style="width:100%; height:46px; padding:6px; border-radius:4px; background:var(--surface); color:var(--text); border:1px solid var(--accent); resize:none; font-size:13px; line-height:1.4;">${currentText}</textarea>
  `;

  // 2. 버튼 구성을 [저장], [취소]로 변경
  btnZone.innerHTML = `
    <button class="save-btn" style="background:none; border:none; color:var(--accent); font-weight:bold; cursor:pointer; padding:0 4px; text-decoration:underline;">저장</button>
    <button class="cancel-btn" style="background:none; border:none; color:var(--text3); cursor:pointer; padding:0 4px; text-decoration:underline;">취소</button>
  `;

  // 취소 이벤트 바인딩 (목록 재렌더링으로 롤백)
  btnZone.querySelector('.cancel-btn').onclick = () => loadMypageStudyMemos(summaryId);

  // 저장 이벤트 바인딩
  btnZone.querySelector('.save-btn').onclick = async () => {
    const newContent = textZone.querySelector('.edit-memo-input').value.trim();
    if (!newContent) {
      alert('메모 내용을 입력해주세요.');
      return;
    }

    let userId = sessionStorage.getItem("userId") || localStorage.getItem("userId");
    const savedUser = JSON.parse(localStorage.getItem("currentUser"));
    if (savedUser && savedUser.id) userId = savedUser.id;

    try {
      const response = await fetch('/api/pdf/memo/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-User-Id': String(userId)
        },
        body: JSON.stringify({
          id: memoId,                // StudyMemoRequest의 Long id 매핑
          memoContent: newContent
        })
      });

      if (!response.ok) throw new Error(await response.text());

      if (typeof showToast === 'function') showToast('메모가 수정되었습니다. ✨');
      loadMypageStudyMemos(summaryId); // 수정 성공 후 새로고침

    } catch (error) {
      console.error(error);
      if (typeof showToast === 'function') showToast('메모 수정 실패 ❌', 'WARN');
      else alert('메모 수정에 실패했습니다.');
    }
  };
}

// 💡 [추가] 마이페이지 모달 내 메모 삭제 함수
async function deleteMypageStudyMemo(memoId, summaryId) {
  if (!confirm('이 학습 메모를 정말 삭제하시겠습니까?')) return;

  let userId = sessionStorage.getItem("userId") || localStorage.getItem("userId");
  const savedUser = JSON.parse(localStorage.getItem("currentUser"));
  if (savedUser && savedUser.id) userId = savedUser.id;

  try {
    const response = await fetch('/api/pdf/memo/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-User-Id': String(userId)
      },
      body: JSON.stringify({
        id: memoId // StudyMemoRequest의 Long id 매핑
      })
    });

    if (!response.ok) throw new Error(await response.text());

    if (typeof showToast === 'function') showToast('메모가 삭제되었습니다. 🗑️');
    loadMypageStudyMemos(summaryId); // 삭제 성공 후 목록 새로고침

  } catch (error) {
    console.error(error);
    if (typeof showToast === 'function') showToast('메모 삭제 실패 ❌', 'WARN');
    else alert('메모 삭제에 실패했습니다.');
  }
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
                📄 요약 노트
              </div>
              <div class="post-content" style="font-size:14px; color:var(--text2); line-height:1.5; margin-bottom:10px;">
                ${shortSummary}
              </div>
              <div class="post-info" style="font-size:12px; color:var(--text3);">
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
  else if (tabId === 'feedback') {
    const feedbackList = document.getElementById('mypage-feedback-list');
    if (!feedbackList) return;

    feedbackList.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text3);">AI 피드백 기록을 불러오는 중입니다...</div>`;

    // 1. 로그인 유저 아이디 추출 (pdf-study.js 규격과 매칭)
    let userId = sessionStorage.getItem("userId") || localStorage.getItem("userId");
    if (!userId && typeof window.getCurrentUserId === 'function') {
      userId = window.getCurrentUserId();
    }

    // 비로그인 Guest 유저 예외 처리
    if (!userId || userId === "guest") {
      feedbackList.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--text3);">
          🔑 로그인이 필요한 서비스입니다.<br>
          <small style="font-size:12px; color:var(--text4); display:block; margin-top:6px;">
            로그인 후 AI 역질문 피드백 데이터를 연동할 수 있습니다.
          </small>
        </div>`;
      return;
    }

    try {
      // 2. 백엔드 새로 만든 GET API 호출
      const response = await fetch('/api/pdf/reverse-log', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-User-Id': String(userId)
        }
      });

      if (!response.ok) {
        throw new Error(`서버 상태 에러 (${response.status})`);
      }

      const myFeedbacks = await response.json();

      if (!myFeedbacks || myFeedbacks.length === 0) {
        feedbackList.innerHTML = `
          <div style="text-align:center; padding:40px; color:var(--text3);">
            저장된 AI 역질문 피드백 내역이 없습니다.<br>
            <small style="font-size:12px; color:var(--text4); display:block; margin-top:6px;">
              PDF 요약 페이지에서 AI의 역질문에 답변하고 피드백을 저장해 보세요!
            </small>
          </div>`;
        return;
      }

      // 3. 데이터 루프 돌며 동적 HTML 생성 (카드 레이아웃)
      feedbackList.innerHTML = myFeedbacks.map(log => {
        const dateStr = log.createdAt && log.createdAt.includes('T') 
          ? log.createdAt.split('T')[0] 
          : (log.createdAt || '최근 학습');

        return `
          <div class="post-item" style="cursor: default; margin-bottom: 16px; padding: 20px; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px;">
            <div class="post-main" style="width: 100%;">
              
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px dashed var(--border); padding-bottom: 8px;">
                <span style="font-weight: 700; font-size: 14px; color: var(--accent);">
                  🤖 AI 구술 피드백
                </span>
                <span style="font-size: 12px; color: var(--text3);">📅 ${dateStr}</span>
              </div>
              
              <div style="margin-bottom: 12px;">
                <div style="font-size: 11px; color: var(--text3); font-weight: 600; margin-bottom: 4px;">AI 역질문</div>
                <div style="color: var(--text1); font-size: 13.5px; line-height: 1.5;">
                  ${localEscapeHtml(log.reverseQuestion)}
                </div>
              </div>
              
              <div style="margin-bottom: 16px; background: rgba(0, 0, 0, 0.2); padding: 12px; border-radius: 8px; border-left: 3px solid var(--text4);">
                <div style="font-size: 11px; color: var(--text3); margin-bottom: 4px; font-weight: 600;">나의 답변</div>
                <div style="color: var(--text2); font-size: 13px; line-height: 1.5; white-space: pre-wrap;">
                  ${localEscapeHtml(log.userAnswer || '작성된 내용이 없습니다.')}
                </div>
              </div>
              
              <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.15); padding: 14px; border-radius: 8px;">
                <div style="font-size: 12px; color: var(--accent); font-weight: bold; margin-bottom: 6px;">
                  📊 AI 평가 리포트
                </div>
                <div style="color: var(--text1); font-size: 13px; line-height: 1.6; white-space: pre-wrap;">
                  ${localEscapeHtml(log.aiFeedback)}
                </div>
              </div>

            </div>
          </div>
        `;
      }).join('');

    } catch (error) {
      console.error("마이페이지 AI 피드백 탭 바인딩 에러:", error);
      feedbackList.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--text3);">
          ⚠️ 피드백 기록을 불러오지 못했습니다.<br>
          <small style="color:#ef4444; font-size:12px; display:block; margin-top:4px;">
            원인: 백엔드 목록조회 API 엔드포인트를 점검해 주세요. (${error.message})
          </small>
        </div>`;
    }
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
              class="post-item"
              onclick="
                showPage('board');
                viewPostDetail(${p.id});
              "
            >

              <div class="post-main">

                <div class="post-title">
                  ${p.title}
                </div>

                <div class="post-info">
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

            </div>
          `).join('')
        : `
          <div style="
            text-align:center;
            padding:40px;
            color:var(--text3);
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

function localEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}