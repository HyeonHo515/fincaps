window.injectCustomExamModal = function() {
  if (document.getElementById('customExamModal')) return;

  const modalHtml = `
    <div id="customExamModal" class="exam-modal-overlay">
      <div class="exam-modal">
        <div class="exam-modal-head">
          <h3>나만의 복습 시험지</h3>
          <button type="button" onclick="document.getElementById('customExamModal').style.display='none'">닫기</button>
        </div>
        <div id="customExamContent" class="exam-modal-content"></div>
        <div class="exam-modal-actions">
          <button class="btn-primary" onclick="window.submitAndPrintExam()">답안 제출 및 리포트 출력</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.generateCustomPDF = function() {
  const activeNotes = window.getAppNotes ? window.getAppNotes() : [];
  if (!activeNotes || activeNotes.length === 0) {
    showToast('오답노트에 기록된 문제가 없습니다.', 'WARN');
    return;
  }

  window.injectCustomExamModal();
  const selected = [...activeNotes].sort(() => 0.5 - Math.random()).slice(0, 10);
  window.currentExamNotes = selected.map(prepareExamNote);

  const contentDiv = document.getElementById('customExamContent');
  contentDiv.innerHTML = `
    <div class="exam-guide">
      오답노트에서 무작위로 추출한 <strong>${window.currentExamNotes.length}문제</strong>를 다시 풀어보세요.
      객관식은 지문을 선택하고, 빈칸은 키워드를 입력하며, 서술형은 핵심 키워드 포함 여부로 채점합니다.
    </div>
    ${window.currentExamNotes.map(renderExamQuestion).join('')}
  `;

  document.getElementById('customExamModal').style.display = 'flex';
};

function prepareExamNote(note) {
  const type = getExamQuestionType(note);
  const options = type === 'mcq' ? getExamOptions(note) : [];
  return {
    ...note,
    questionType: type,
    examOptions: options
  };
}

function renderExamQuestion(note, index) {
  const typeLabel = {
    mcq: '객관식',
    blank: '빈칸',
    essay: '서술형'
  }[note.questionType] || '서술형';

  return `
    <div class="exam-question-card">
      <div class="exam-question-title">
        <span>Q${index + 1}</span>
        <strong>${escapeExamHtml(note.q || note.title)}</strong>
        <em>${typeLabel}</em>
      </div>
      ${renderExamAnswerArea(note, index)}
    </div>
  `;
}

function renderExamAnswerArea(note, index) {
  if (note.questionType === 'mcq') {
    return `
      <div class="exam-options">
        ${note.examOptions.map((option, optionIndex) => `
          <label class="exam-option">
            <input type="radio" name="exam-ans-${index}" value="${optionIndex}">
            <span>지문 ${optionIndex + 1}. ${escapeExamHtml(option)}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  if (note.questionType === 'blank') {
    return `<input id="exam-ans-${index}" class="exam-short-answer" placeholder="빈칸에 들어갈 핵심 키워드를 입력하세요.">`;
  }

  return `<textarea id="exam-ans-${index}" class="exam-essay-answer" placeholder="핵심 키워드를 포함해 답안을 서술해보세요."></textarea>`;
}

window.submitAndPrintExam = async function() {
  const selected = window.currentExamNotes;
  if (!selected) return;

  const results = [];
  for (let index = 0; index < selected.length; index++) {
    results.push(await gradeExamAnswer(selected[index], index));
  }

  document.getElementById('customExamModal').style.display = 'none';
  showToast('복습 시험 리포트를 생성합니다...');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('팝업 차단을 해제해주세요.');
    return;
  }

  const score = results.filter(result => result.isCorrect).length;
  const htmlContent = buildExamReportHtml(selected, results, score);
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

async function gradeExamAnswer(note, index) {
  if (note.questionType === 'mcq') {
    const checked = document.querySelector(`input[name="exam-ans-${index}"]:checked`);
    const selectedIndex = checked ? Number(checked.value) : -1;
    const hasStoredIndex = note.answerIdx !== null && note.answerIdx !== undefined && note.answerIdx !== '';
    const storedIndex = Number(note.answerIdx);
    const correctIndex = hasStoredIndex && Number.isInteger(storedIndex) && storedIndex >= 0
      ? storedIndex
      : findCorrectOptionIndex(note);
    return {
      userAnswer: selectedIndex >= 0 ? note.examOptions[selectedIndex] : '(선택한 지문이 없습니다)',
      isCorrect: selectedIndex === correctIndex,
      feedback: selectedIndex === correctIndex ? '정답 지문을 선택했습니다.' : `정답은 지문 ${correctIndex + 1}입니다.`
    };
  }

  const input = document.getElementById(`exam-ans-${index}`);
  const value = input ? input.value.trim() : '';
  if (note.questionType === 'blank') {
    const answer = getExamAnswerCandidates(note)[0] || cleanExamCorrectAnswer(note.correct);
    const isCorrect = isExamAnswerAccepted(value, note);
    return {
      userAnswer: value || '(작성된 답안이 없습니다)',
      isCorrect,
      feedback: isCorrect
        ? '빈칸 핵심 키워드를 정확히 입력했습니다.'
        : `정답 키워드는 "${answer}"입니다.`
    };
  }

  return gradeEssayAnswer(note, value);
}

async function gradeEssayAnswer(note, value) {
  const answerText = value || '(작성된 답안이 없습니다)';
  const keywords = getEssayKeywords(note);
  const matched = keywords.filter(keyword => value.includes(keyword));
  const required = Math.min(3, Math.max(1, Math.ceil(keywords.length * 0.35)));
  let isCorrect = value.length >= 10 && matched.length >= required;
  let feedback = isCorrect
    ? `핵심 키워드 ${matched.join(', ')}를 포함해 정답으로 인정했습니다.`
    : `핵심 키워드가 부족합니다. 보완 키워드: ${keywords.slice(0, 5).join(', ')}`;

  try {
    const aiResult = await requestEssayAiJudgement(note, value, keywords);
    if (aiResult) {
      isCorrect = Boolean(aiResult.isCorrect);
      feedback = aiResult.feedback || feedback;
    }
  } catch (error) {
    console.warn('Essay AI judgement failed. Using keyword judgement.', error);
  }

  return { userAnswer: answerText, isCorrect, feedback };
}

async function requestEssayAiJudgement(note, value, keywords) {
  if (!value || value.length < 5) return null;
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({
      message: [
        '서술형 답안을 채점해줘. 핵심 키워드가 충분히 들어가고 의미가 맞으면 정답으로 인정해.',
        '반드시 JSON만 반환해. 형식: {"isCorrect":true,"feedback":"짧은 한국어 피드백"}'
      ].join('\n'),
      context: `문제: ${note.q}\n모범 답안: ${note.correct}\n핵심 키워드: ${keywords.join(', ')}\n학생 답안: ${value}`
    })
  });
  if (!response.ok) return null;
  const data = await response.json();
  const text = String(data.answer || '').replace(/```json|```/g, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) return null;
  return JSON.parse(text.slice(start, end + 1));
}

function buildExamReportHtml(selected, results, score) {
  return `
    <html lang="ko">
    <head>
      <title>CodeMind - 맞춤형 복습 시험지</title>
      <style>
        body { font-family: Arial, sans-serif; padding:40px; color:#1e293b; line-height:1.6; max-width:850px; margin:0 auto; background:#fff; }
        h1 { border-bottom:3px solid #0f172a; padding-bottom:15px; text-align:center; color:#0f172a; }
        .header-info { text-align:right; margin-bottom:30px; font-size:0.95em; color:#64748b; font-weight:bold; }
        .score { padding:16px 20px; border-radius:12px; background:#eff6ff; border:1px solid #bfdbfe; margin-bottom:30px; font-weight:bold; color:#1d4ed8; }
        .q-box { margin-bottom:36px; page-break-inside:avoid; border:1px solid #cbd5e1; border-radius:12px; overflow:hidden; }
        .q-header { background:#f8fafc; padding:20px 25px; border-bottom:1px solid #e2e8f0; }
        .q-meta { font-size:0.85em; color:#fff; background:#3b82f6; padding:4px 12px; font-weight:bold; display:inline-block; margin-bottom:12px; border-radius:20px; }
        .q-title { font-size:1.1em; font-weight:700; color:#0f172a; margin:0; }
        .q-body { padding:25px; display:flex; flex-direction:column; gap:18px; }
        .ans-user { border-left:4px solid #f59e0b; background:#fffbeb; padding:15px 20px; }
        .ans-correct { border-left:4px solid #10b981; background:#ecfdf5; padding:15px 20px; }
        .feedback { border-left:4px solid #3b82f6; background:#eff6ff; padding:15px 20px; }
        .label { font-size:0.85em; font-weight:800; margin-bottom:8px; }
      </style>
    </head>
    <body>
      <h1>맞춤형 오답 복습 리포트</h1>
      <div class="header-info">생성일자: ${new Date().toLocaleDateString()} | 문제 수: ${selected.length}문항</div>
      <div class="score">점수: ${score} / ${selected.length}</div>
      ${selected.map((note, index) => renderExamReportQuestion(note, results[index], index)).join('')}
    </body>
    </html>
  `;
}

function renderExamReportQuestion(note, result, index) {
  return `
    <div class="q-box">
      <div class="q-header">
        <div class="q-meta">${escapeExamHtml(note.subject || 'CS')}</div>
        <h3 class="q-title">Q${index + 1}. ${escapeExamHtml(note.q || note.title)}</h3>
      </div>
      <div class="q-body">
        <div class="ans-user">
          <div class="label">나의 답안</div>
          <div>${escapeExamHtml(result.userAnswer).replace(/\n/g, '<br>')}</div>
        </div>
        <div class="ans-correct">
          <div class="label">정답 및 해설</div>
          <div>${escapeExamHtml(note.correct || '정답 데이터 없음').replace(/\n/g, '<br>')}</div>
          ${note.wrong ? `<div style="margin-top:12px;font-size:0.9em;color:#047857;">과거 오답: ${escapeExamHtml(note.wrong)}</div>` : ''}
        </div>
        <div class="feedback">
          <div class="label">${result.isCorrect ? '채점 결과: 정답' : '채점 결과: 보완 필요'}</div>
          <div>${escapeExamHtml(result.feedback)}</div>
        </div>
      </div>
    </div>
  `;
}

function getExamQuestionType(note) {
  if (typeof window.normalizeQuestionType === 'function') {
    return window.normalizeQuestionType(note);
  }
  const title = String(note.title || '');
  if (title.includes('빈칸')) return 'blank';
  if (title.includes('객관식')) return 'mcq';
  return 'essay';
}

function getExamOptions(note) {
  try {
    const parsed = JSON.parse(note.optionsJson || '[]');
    if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
  } catch (error) {
    // Fallback below.
  }

  const correct = cleanExamCorrectAnswer(note.correct);
  const wrong = cleanExamCorrectAnswer(note.wrong);
  const distractors = [
    wrong || '문제 조건과 맞지 않는 설명입니다.',
    '핵심 개념의 원인과 결과를 반대로 설명한 지문입니다.',
    '항상 성립한다고 단정했지만 예외가 있는 지문입니다.'
  ];
  return [correct, ...distractors].slice(0, 4);
}

function findCorrectOptionIndex(note) {
  const candidates = getExamAnswerCandidates(note).map(normalizeExamAnswer).filter(Boolean);
  const index = note.examOptions.findIndex(option => {
    const normalized = normalizeExamAnswer(option);
    return candidates.some(candidate => (
      normalized === candidate ||
      (candidate.length >= 3 && normalized.includes(candidate)) ||
      (normalized.length >= 3 && candidate.includes(normalized))
    ));
  });
  return index >= 0 ? index : 0;
}

function getEssayKeywords(note) {
  try {
    const parsed = JSON.parse(note.answerKeywordsJson || '[]');
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch (error) {
    // Build from correct text.
  }
  return cleanExamCorrectAnswer(note.correct)
    .replace(/[.,()[\]{}"]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 2)
    .slice(0, 10);
}

function cleanExamCorrectAnswer(value) {
  return String(value || '')
    .split('\n')[0]
    .replace(/^(\[?모범 답안\]?|정답|답)\s*[:：]?\s*/i, '')
    .trim();
}

function normalizeExamAnswer(value) {
  return String(value || '')
    .replace(/^(\[?모범 답안\]?|정답|답|해설)\s*[:：]?\s*/i, '')
    .replace(/[()[\]{}"'`.,!?;:：/\\|·•\-_\s]/g, '')
    .toLowerCase();
}

function getExamAnswerCandidates(note) {
  const candidates = [];
  const correctText = String(note.correct || '');

  candidates.push(cleanExamCorrectAnswer(correctText));
  candidates.push(...correctText
    .split(/\n|해설:|정답:|모범 답안|\/|,|，|·/)
    .map(cleanExamCorrectAnswer));

  try {
    const parsed = JSON.parse(note.answerKeywordsJson || '[]');
    if (Array.isArray(parsed)) candidates.push(...parsed);
  } catch (error) {
    // Older notes may not include keyword metadata.
  }

  return [...new Set(candidates
    .map(candidate => String(candidate || '').trim())
    .filter(Boolean))];
}

function isExamAnswerAccepted(value, note) {
  const submitted = normalizeExamAnswer(value);
  if (!submitted) return false;

  return getExamAnswerCandidates(note).some(candidate => {
    const answer = normalizeExamAnswer(candidate);
    if (!answer) return false;
    if (submitted === answer) return true;
    return answer.length >= 2 && (submitted.includes(answer) || answer.includes(submitted));
  });
}

function escapeExamHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
