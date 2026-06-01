window.injectAllModals = function() {
  if (document.getElementById('debugModal')) return;

  const debugStyle = document.createElement('style');
  debugStyle.innerHTML = `
    .cyber-modal { transition:all 0.3s; background:#07110c; border:1px solid #1ecf73; box-shadow:0 0 24px rgba(30,207,115,0.24); font-family:'Pretendard', sans-serif; color:#dfffea; border-radius:10px; }
    .cyber-header { border-bottom:1px dashed rgba(30,207,115,0.55); padding-bottom:10px; color:#7dffb0; font-weight:800; font-size:1.08rem; }
    .cyber-warning { background:rgba(255,88,88,0.12); border-left:4px solid #ff5a66; padding:15px; color:#ffd0d4; margin-bottom:15px; font-size:1rem; font-weight:700; line-height:1.6; }
    .cyber-sentence { display:block; width:100%; text-align:left; cursor:pointer; padding:13px; margin-bottom:10px; background:rgba(30,207,115,0.08); border:1px solid rgba(30,207,115,0.24); border-left:4px solid #1ecf73; color:#e7fff0; font-size:1rem; line-height:1.6; transition:0.2s; font-family:'Pretendard', sans-serif; }
    .cyber-sentence:hover { background:rgba(30,207,115,0.18); color:#fff; transform:translateX(5px); }
    .cyber-node-label { color:#7dffb0; font-weight:800; margin-right:8px; user-select:none; }
    .cyber-textarea { width:100%; min-height:130px; resize:vertical; padding:13px; border:1px solid #1ecf73; border-radius:8px; background:rgba(30,207,115,0.08); color:#effff5; font-family:'Pretendard', sans-serif; line-height:1.6; outline:none; }
    .cyber-textarea::placeholder { color:rgba(223,255,234,0.58); }
    .cyber-btn { background:transparent; color:#ff8f98; border:1px solid #ff6b75; cursor:pointer; transition:0.3s; margin-top:15px; width:100%; padding:12px; font-weight:800; border-radius:8px; }
    .cyber-btn:hover { background:#ff5a66; color:#fff; box-shadow:0 0 15px rgba(255,90,102,0.45); }
    .cyber-btn.relapsed { border-color:#d946ef; color:#f0abfc; }
    .cyber-btn-solved { background:transparent; color:#7dffb0; border:1px solid #1ecf73; cursor:pointer; transition:0.3s; margin-top:15px; width:100%; padding:12px; font-weight:800; border-radius:8px; }
    .cyber-btn-solved:hover { background:#1ecf73; color:#04140a; box-shadow:0 0 15px rgba(30,207,115,0.45); }
    .cyber-btn-cooldown { background:transparent; color:#94a3b8; border:1px dashed #94a3b8; cursor:not-allowed; margin-top:15px; width:100%; padding:12px; font-weight:800; border-radius:8px; }
    .disconnect-btn-success { border:1px solid #1ecf73; color:#7dffb0; background:transparent; padding:12px; width:100%; font-weight:800; cursor:pointer; margin-top:20px; font-size:1rem; border-radius:8px; }
    .disconnect-btn-fail { border:1px solid #ffaa00; color:#ffd27a; background:transparent; padding:12px; width:100%; font-weight:800; cursor:pointer; margin-top:20px; font-size:1rem; border-radius:8px; }
    .hacker-mode-success { border:2px solid #1ecf73 !important; box-shadow:0 0 30px rgba(30,207,115,0.30) !important; color:#dfffea !important; }
    .hacker-mode-fail { border:2px solid #ffaa00 !important; box-shadow:0 0 30px rgba(255,170,0,0.28) !important; color:#fff2cf !important; }
    .terminal-cursor { display:inline-block; width:10px; height:1.2rem; background-color:currentColor; animation:blink 1s step-end infinite; margin-left:5px; }
    @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
  `;
  document.head.appendChild(debugStyle);

  const debugModal = document.createElement('div');
  debugModal.id = 'debugModal';
  debugModal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(5,10,18,0.68);z-index:10000;justify-content:center;align-items:center;backdrop-filter:blur(6px);';
  debugModal.innerHTML = `
    <div id="debugModalContent" class="modal-content cyber-modal" style="max-width:760px;width:95%;min-height:450px;display:flex;flex-direction:column;background:#07110c;padding:20px;">
      <div id="debugInitialUI">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
          <h3 class="cyber-header" style="margin:0;">오답 디버깅 스캔</h3>
          <span style="cursor:pointer;font-size:1.2rem;color:#7dffb0;" onclick="window.closeDebugModal()">닫기</span>
        </div>
        <div id="debugWarningArea" class="cyber-warning"></div>
        <div id="debugTextArea" style="margin-top:10px;"></div>
      </div>
      <div id="debugTerminalUI" style="display:none;flex:1;text-align:left;font-size:1rem;line-height:1.8;overflow-y:auto;padding:10px;font-family:'Pretendard',sans-serif;color:#dfffea;"></div>
    </div>
  `;
  document.body.appendChild(debugModal);
};

window.startDebuggingQuiz = async function(note) {
  window.currentBugData = note;
  const isBlank = isBlankNote(note);
  const isEssay = isEssayNote(note);

  const modalContent = document.getElementById('debugModalContent');
  modalContent.className = 'modal-content cyber-modal';
  document.getElementById('debugInitialUI').style.display = 'block';
  document.getElementById('debugTerminalUI').style.display = 'none';

  document.getElementById('debugWarningArea').innerHTML = `
    오답 개념을 다시 점검합니다.<br>
    <span style="color:#fff;">대상 문제: ${escapeDebugHtml(note.q || note.title)}</span><br>
    ${isBlank
      ? '빈칸 오답입니다. 빈칸에 들어갈 핵심 키워드를 다시 입력해보세요.'
      : isEssay
        ? '서술형 오답입니다. 정답을 그대로 외우기보다 핵심 개념을 자신의 말로 다시 설명해보세요.'
        : '아래 문장 중 문제의 핵심 개념과 가장 잘 맞는 옳은 설명을 선택하세요.'}
  `;

  if (isBlank) {
    renderBlankDebug(note);
  } else if (isEssay) {
    renderEssayDebug(note);
  } else {
    window.currentBugDataInfo = await buildDebugData(note);
    renderDebugChoices(note);
  }

  document.getElementById('debugModal').style.display = 'flex';
};

function isBlankNote(note) {
  const type = String(note.questionType || '').toLowerCase();
  const title = String(note.title || '');
  return type === 'blank' || title.includes('빈칸');
}

function isEssayNote(note) {
  const type = String(note.questionType || '').toLowerCase();
  const title = String(note.title || '');
  return type === 'essay' || title.includes('서술형') || title.toLowerCase().includes('essay');
}

function renderBlankDebug(note) {
  const area = document.getElementById('debugTextArea');
  area.innerHTML = `
    <div class="cyber-sentence" style="cursor:default;transform:none;">
      <span class="cyber-node-label">빈칸 문제</span>${escapeDebugHtml(note.q || '')}
    </div>
    <input id="debugBlankAnswer" class="cyber-textarea" style="min-height:auto;height:50px;" placeholder="빈칸에 들어갈 핵심 키워드를 입력하세요.">
    <button class="cyber-btn-solved" id="debugBlankSubmit">정답 확인</button>
  `;
  document.getElementById('debugBlankSubmit').addEventListener('click', () => checkBlankDebugAnswer(note));
}

function renderEssayDebug(note) {
  const area = document.getElementById('debugTextArea');
  area.innerHTML = `
    <textarea id="debugEssayAnswer" class="cyber-textarea" placeholder="정답 해설을 보지 않고 핵심 개념을 다시 서술하세요."></textarea>
    <button class="cyber-btn-solved" id="debugEssaySubmit">복구 실행</button>
  `;
  document.getElementById('debugEssaySubmit').addEventListener('click', () => checkEssayDebugAnswer(note));
}

function renderDebugChoices(note) {
  const area = document.getElementById('debugTextArea');
  area.innerHTML = '';
  window.currentBugDataInfo.s.forEach((sentence, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cyber-sentence';
    button.innerHTML = `<span class="cyber-node-label">문장 ${index + 1}</span>${escapeDebugHtml(sentence)}`;
    button.addEventListener('click', () => window.checkDebugAnswer(index, note.correct || '정답 데이터 없음'));
    area.appendChild(button);
  });
}

async function buildDebugData(note) {
  const fallback = buildLocalDebugData(note);

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({
        message: [
          '다음 오답노트 문제를 바탕으로 오답 디버깅용 문장 3개를 만들어줘.',
          '3개 중 정확히 1개는 문제의 핵심 개념과 맞는 옳은 문장이어야 하고, 나머지 2개는 그럴듯하지만 틀린 문장이어야 해.',
          '반드시 JSON만 반환해. 형식: {"sentences":["문장1","문장2","문장3"],"correctIndex":0,"hint":"힌트"}'
        ].join('\n'),
        context: `문제: ${note.q}\n사용자 오답: ${note.wrong}\n정답 및 해설: ${note.correct}`
      })
    });
    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    return parseDebugJson(data.answer) || fallback;
  } catch (error) {
    console.warn('AI debug sentence generation failed. Falling back to local data.', error);
    return fallback;
  }
}

function parseDebugJson(answer) {
  if (!answer) return null;
  const jsonText = String(answer).replace(/```json|```/g, '').trim();
  const start = jsonText.indexOf('{');
  const end = jsonText.lastIndexOf('}');
  if (start < 0 || end < 0) return null;

  try {
    const parsed = JSON.parse(jsonText.slice(start, end + 1));
    if (!Array.isArray(parsed.sentences) || parsed.sentences.length !== 3) return null;
    const correctIndex = Number(parsed.correctIndex);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 2) return null;
    return {
      s: parsed.sentences,
      ans: correctIndex,
      hint: parsed.hint || '문제의 정답 해설과 가장 직접적으로 연결되는 옳은 문장을 찾아보세요.'
    };
  } catch (error) {
    return null;
  }
}

function buildLocalDebugData(note) {
  const question = cleanLine(note.q || note.title || '이 문제');
  const wrong = cleanLine(note.wrong || '사용자의 오답');
  const correct = cleanLine(note.correct || '정답 해설');
  const correctCore = correct.split('해설:')[0].trim() || correct;
  return {
    s: [
      `이 문제의 핵심 정답은 "${correctCore}"와 연결됩니다.`,
      `사용자가 고른 "${wrong}"는 이 문제에서 올바른 정답으로 볼 수 있습니다.`,
      `"${question}"는 정답과 무관하게 아무 선택지나 골라도 같은 결과가 됩니다.`
    ],
    ans: 0,
    hint: '정답 해설의 핵심 문장을 그대로 설명하는 선택지를 고르세요.'
  };
}

function checkBlankDebugAnswer(note) {
  const input = document.getElementById('debugBlankAnswer');
  const value = input.value.trim();
  if (!value) {
    showToast('빈칸 답안을 먼저 입력해주세요.', 'WARN');
    return;
  }

  const answer = getDebugAnswerCandidates(note)[0] || cleanCorrectAnswer(note.correct || '');
  const success = isDebugAnswerAccepted(value, note);
  finishDebugReview(success, answer, success
    ? '빈칸 핵심 키워드를 정확히 복구했습니다.'
    : `정답 키워드는 "${answer}"입니다. PDF 요약에서 해당 문장이 어떤 의미였는지 다시 확인해보세요.`);
}

function checkEssayDebugAnswer(note) {
  const input = document.getElementById('debugEssayAnswer');
  const value = input.value.trim();
  if (!value) {
    showToast('서술 답안을 먼저 입력해주세요.', 'WARN');
    return;
  }

  const keywords = extractDebugKeywords(note.answerKeywordsJson || note.correct || '');
  const matched = keywords.filter(keyword => value.includes(keyword));
  const required = Math.min(2, Math.max(1, Math.ceil(keywords.length * 0.35)));
  const success = value.length >= 10 && matched.length >= required;

  finishDebugReview(success, note.correct || '정답 데이터 없음', success
    ? '서술형 핵심 개념을 다시 복구했습니다.'
    : `조금 더 구체적으로 써보세요. 힌트: ${keywords.slice(0, 4).join(', ')}`);
}

function extractDebugKeywords(text) {
  let source = String(text || '');
  try {
    const parsed = JSON.parse(source);
    if (Array.isArray(parsed)) source = parsed.join(' ');
  } catch (error) {
    // Plain text is fine.
  }
  const cleaned = source.replace(/해설:/g, ' ').replace(/[.,()[\]{}"]/g, ' ');
  const words = cleaned.split(/\s+/).filter(word => word.length >= 2);
  const preferred = words.filter(word => /[가-힣A-Za-z]/.test(word));
  return [...new Set(preferred)].slice(0, 10);
}

function getDebugAnswerCandidates(note) {
  const candidates = [];
  const correctText = String(note.correct || '');

  candidates.push(cleanCorrectAnswer(correctText));
  candidates.push(...correctText
    .split(/\n|해설:|정답:|모범 답안|\/|,|，|·/)
    .map(cleanCorrectAnswer));

  try {
    const parsed = JSON.parse(note.answerKeywordsJson || '[]');
    if (Array.isArray(parsed)) candidates.push(...parsed);
  } catch (error) {
    // Older notes may not have keyword metadata.
  }

  return [...new Set(candidates
    .map(candidate => String(candidate || '').trim())
    .filter(Boolean))];
}

function isDebugAnswerAccepted(value, note) {
  const submitted = normalizeAnswer(value);
  if (!submitted) return false;

  return getDebugAnswerCandidates(note).some(candidate => {
    const answer = normalizeAnswer(candidate);
    if (!answer) return false;
    if (submitted === answer) return true;
    return answer.length >= 2 && (submitted.includes(answer) || answer.includes(submitted));
  });
}

window.checkDebugAnswer = function(clickedIndex, correctConcept) {
  const selected = document.querySelectorAll('.cyber-sentence')[clickedIndex];
  if (selected) selected.style.textDecoration = 'line-through';

  const success = clickedIndex === window.currentBugDataInfo.ans;
  const hint = success ? '옳은 설명을 정확히 골랐습니다.' : window.currentBugDataInfo.hint;
  finishDebugReview(success, correctConcept, hint);
};

function finishDebugReview(success, correctConcept, hint) {
  const modalContent = document.getElementById('debugModalContent');
  const terminalUI = document.getElementById('debugTerminalUI');

  setTimeout(() => {
    document.getElementById('debugInitialUI').style.display = 'none';
    terminalUI.style.display = 'flex';
    terminalUI.style.flexDirection = 'column';

    if (success) {
      window.currentBugData.debugSolved = true;
      window.currentBugData.cooldownUntil = null;
      window.currentBugData.relapsed = false;
      modalContent.classList.add('hacker-mode-success');
    } else {
      window.currentBugData.cooldownUntil = Date.now() + 30 * 1000;
      modalContent.classList.add('hacker-mode-fail');
    }

    window.saveAppNotes();
    window.addCyberButtonsToCards();

    const lines = success
      ? ['오개념을 분석하는 중...', '복구 진행률 100%', '오답 디버깅 완료']
      : ['선택한 답이 아직 정확하지 않습니다.', '복습 잠금 30초 적용', '힌트를 보고 다시 시도하세요.'];
    const finalBlock = success
      ? `<div style="border-top:1px dashed #1ecf73;margin-top:15px;padding-top:15px;"><div style="color:#fff;font-weight:bold;">복구된 핵심 개념</div><div style="color:#dfffea;line-height:1.6;">${escapeDebugHtml(correctConcept)}</div></div><button onclick="window.closeDebugModal()" class="disconnect-btn-success">닫기</button>`
      : `<div style="border-top:1px dashed #ffaa00;margin-top:15px;padding-top:15px;"><div style="color:#fff;font-weight:bold;margin-bottom:5px;">힌트</div><div style="color:#fff2cf;line-height:1.6;">${escapeDebugHtml(hint)}</div></div><button onclick="window.closeDebugModal()" class="disconnect-btn-fail">닫기</button>`;

    terminalUI.innerHTML = '';
    typeWriter(terminalUI, lines, 0, '#dfffea', () => {
      terminalUI.innerHTML += finalBlock;
      terminalUI.scrollTop = terminalUI.scrollHeight;
    });
  }, 300);
}

function typeWriter(element, lines, index, color, callback) {
  if (index >= lines.length) {
    if (callback) callback();
    return;
  }
  let charIndex = 0;
  const lineDiv = document.createElement('div');
  element.appendChild(lineDiv);

  function typeChar() {
    if (charIndex < lines[index].length) {
      lineDiv.innerHTML = lines[index].substring(0, charIndex + 1) + '<span class="terminal-cursor"></span>';
      charIndex++;
      setTimeout(typeChar, 15);
    } else {
      lineDiv.innerHTML = lines[index];
      setTimeout(() => typeWriter(element, lines, index + 1, color, callback), 150);
    }
  }
  typeChar();
}

window.closeDebugModal = function() {
  const modal = document.getElementById('debugModal');
  if (modal) modal.style.display = 'none';
};

window.addCyberButtonsToCards = function() {
  const grid = document.getElementById('notesGrid');
  const activeNotes = window.getAppNotes();
  if (!grid || activeNotes.length === 0) return;

  const cards = grid.querySelectorAll('.note-card');
  const usedIds = new Set();

  cards.forEach(card => {
    let btn = card.querySelector('button[class*="cyber-btn"]');
    if (!btn) {
      btn = document.createElement('button');
      card.appendChild(btn);
    }

    const titleEl = card.querySelector('.note-title');
    if (!titleEl) return;
    const cardText = card.innerText.replace(/\s+/g, '');

    const noteData = activeNotes.find(note => {
      if (note.id && usedIds.has(note.id)) return false;
      const questionText = note.q ? note.q.replace(/\s+/g, '') : '';
      return (questionText && cardText.includes(questionText)) || titleEl.innerText.includes(note.title);
    });
    if (!noteData) return;

    usedIds.add(noteData.id);

    if (noteData.debugSolved) {
      btn.className = 'cyber-btn-solved';
      btn.textContent = '디버깅 완료, 다시 풀어보기';
    } else if (noteData.cooldownUntil && Date.now() < noteData.cooldownUntil) {
      btn.className = 'cyber-btn-cooldown';
      const remaining = Math.max(0, noteData.cooldownUntil - Date.now());
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      btn.textContent = `복습 잠금 ${mins}:${secs.toString().padStart(2, '0')}`;
    } else {
      btn.className = noteData.relapsed ? 'cyber-btn relapsed' : 'cyber-btn';
      btn.textContent = isBlankNote(noteData)
        ? '빈칸 다시 풀기'
        : isEssayNote(noteData)
          ? '서술형 오답 복구하기'
          : '오답 디버깅 시작';
    }

    btn.disabled = btn.className === 'cyber-btn-cooldown';
    btn.onclick = btn.disabled ? null : () => window.startDebuggingQuiz(noteData);
  });
};

function cleanCorrectAnswer(value) {
  return String(value || '')
    .split('\n')[0]
    .replace(/^(\[?모범 답안\]?|정답|답)\s*[:：]?\s*/i, '')
    .trim();
}

function normalizeAnswer(value) {
  return String(value || '')
    .replace(/^(\[?모범 답안\]?|정답|답|해설)\s*[:：]?\s*/i, '')
    .replace(/[()[\]{}"'`.,!?;:：/\\|·•\-_\s]/g, '')
    .toLowerCase();
}

function cleanLine(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 140);
}

function escapeDebugHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
