let noteAiQuizzes = [];
let noteQuizIndex = 0;
window.currentBugDataInfo = null;
window.currentBugData = null;

const noteQuizApi = {
  generate: '/api/ai/quiz'
};

const csQuizSubjects = ['자료구조', '알고리즘', '운영체제'];
const quizSubjects = [...csQuizSubjects];

const difficultyLabels = {
  easy: '하',
  medium: '중',
  hard: '상'
};

const difficultyColors = {
  easy: '#10b981',
  medium: '#f59e0b',
  hard: '#ef4444'
};

const questionTypes = ['mcq', 'mcq', 'mcq', 'essay'];

if (!window.getAppNotes) {
  window.getAppNotes = function() {
    return window.notes || [];
  };
}

function injectQuizUI() {
  const page = document.getElementById('page-ai');
  if (!page) return;

  const existingArea = document.getElementById('noteQuizArea');
  if (existingArea) existingArea.remove();
  const existingModal = document.getElementById('quizSettingsModal');
  if (existingModal) existingModal.remove();

  const quizArea = document.createElement('div');
  quizArea.id = 'noteQuizArea';
  quizArea.className = 'quiz-generate-area';

  const openSettingsBtn = document.createElement('button');
  openSettingsBtn.className = 'btn-primary quiz-settings-open';
  openSettingsBtn.type = 'button';
  openSettingsBtn.textContent = 'AI 문제 설정 열기';
  openSettingsBtn.onclick = openQuizSettingsModal;

  const quizContainer = document.createElement('div');
  quizContainer.id = 'noteQuizContainer';
  quizContainer.style.display = 'none';

  quizArea.appendChild(openSettingsBtn);
  quizArea.appendChild(quizContainer);
  document.body.insertAdjacentHTML('beforeend', buildQuizSettingsModalHtml());

  const noteToolbar = page.querySelector('.note-toolbar');
  if (noteToolbar) {
    noteToolbar.insertAdjacentElement('afterend', quizArea);
  }
}

function buildQuizSettingsModalHtml() {
  return `
    <div id="quizSettingsModal" class="quiz-settings-modal" onclick="handleQuizSettingsBackdrop(event)">
      <div class="quiz-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="quizSettingsTitle">
        <div class="quiz-settings-head">
          <div>
            <div id="quizSettingsTitle" class="quiz-settings-title"><span class="quiz-settings-icon">AI</span> 문제 맞춤 설정</div>
            <p class="quiz-settings-subtitle">요약 번호, 문제 유형, 난이도를 적으면 PDF 요약 내용을 기준으로 문제와 정답을 생성합니다.</p>
          </div>
          <button class="quiz-settings-close" type="button" onclick="closeQuizSettingsModal()" aria-label="닫기">×</button>
        </div>
        <div class="quiz-settings-body">
          <div class="quiz-setting-group">
            <div class="quiz-setting-label">난이도</div>
            <div class="quiz-choice-row">
              <label class="quiz-choice"><input type="radio" name="quiz-diff-select" value="easy"> <span>쉬움</span></label>
              <label class="quiz-choice"><input type="radio" name="quiz-diff-select" value="medium" checked> <span>중간</span></label>
              <label class="quiz-choice"><input type="radio" name="quiz-diff-select" value="hard"> <span>어려움</span></label>
            </div>
          </div>
          <div class="quiz-prompt-box">
            <label for="noteQuizPrompt">원하는 문제 방향</label>
            <textarea id="noteQuizPrompt" class="quiz-prompt-input" rows="6" placeholder="예시
• 1,3번 요약을 바탕으로 객관식 문제를 만들어줘
• 프로세스와 스레드 차이를 서술형으로 만들어줘
• 그리디와 동적 계획법 차이를 난이도 높게 만들어줘
• 시간 복잡도 개념을 코드 추론 문제처럼 만들어줘"></textarea>
          </div>
        </div>
        <div class="quiz-settings-actions">
          <button class="btn-secondary" type="button" onclick="closeQuizSettingsModal()">취소</button>
          <button class="btn-primary quiz-create-btn" type="button" onclick="generateQuizFromSettings(event)">문제 만들기</button>
        </div>
      </div>
    </div>
  `;
}

function openQuizSettingsModal() {
  const modal = document.getElementById('quizSettingsModal');
  if (modal) modal.classList.add('open');
}

function closeQuizSettingsModal() {
  const modal = document.getElementById('quizSettingsModal');
  if (modal) modal.classList.remove('open');
}

function handleQuizSettingsBackdrop(event) {
  if (event.target && event.target.id === 'quizSettingsModal') {
    closeQuizSettingsModal();
  }
}

async function generateQuizFromSettings(event) {
  const selectedDiffRadio = document.querySelector('input[name="quiz-diff-select"]:checked');
  const selectedDiff = selectedDiffRadio ? selectedDiffRadio.value : 'all';
  closeQuizSettingsModal();
  await generateQuizData(selectedDiff, event?.target || null);
  const container = document.getElementById('noteQuizContainer');
  if (container) container.style.display = 'block';
}

async function toggleQuizInNote(event) {
  const container = document.getElementById('noteQuizContainer');
  const btn = event?.target || document.querySelector('#noteQuizArea .btn-primary');
  if (!container || !btn) return;

  const selectedDiffRadio = document.querySelector('input[name="quiz-diff-select"]:checked');
  const selectedDiff = selectedDiffRadio ? selectedDiffRadio.value : 'all';

  if (noteAiQuizzes.length === 0 || btn.textContent.includes('생성')) {
    await generateQuizData(selectedDiff, btn);
    container.style.display = 'block';
    btn.textContent = 'AI 예상문제 접기';
    btn.style.background = '#475569';
    return;
  }

  if (container.style.display === 'none') {
    container.style.display = 'block';
    btn.textContent = 'AI 예상문제 접기';
    btn.style.background = '#475569';
  } else {
    container.style.display = 'none';
    btn.textContent = 'AI 예상문제 새로 생성하기';
    btn.style.background = 'var(--accent3)';
  }
}

setTimeout(injectQuizUI, 500);

async function generateQuizData(selectedDiff = 'all', btn = null) {
  const container = document.getElementById('noteQuizContainer');
  if (container) {
    container.innerHTML = '<div class="quiz-loading">AI 예상문제 묶음을 생성하는 중입니다...</div>';
  }

  const previousText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'AI 예상문제 생성 중...';
  }

  const userPrompt = getQuizUserPrompt();
  const targetCount = getQuizTargetCount(userPrompt);
  const requests = Array.from({ length: targetCount }, (_, index) => buildQuizRequest(selectedDiff, index, targetCount));

  try {
    const quizzes = await Promise.all(requests.map((request, index) => fetchQuizOrFallback(request, index)));
    noteAiQuizzes = quizzes;
    noteQuizIndex = 0;
    renderNoteQuizzes();
    showToast(`${noteAiQuizzes.length}개의 AI 예상문제가 생성되었습니다.`);
  } catch (error) {
    console.warn('AI quiz bundle generation failed. Falling back to local quizzes.', error);
    noteAiQuizzes = requests.map((request, index) => buildFallbackQuiz(request.subject, request.difficulty, request.type, index));
    noteQuizIndex = 0;
    renderNoteQuizzes();
    showToast('API 연결이 어려워 임시 문제 묶음을 생성했습니다.', 'WARN');
  } finally {
    if (btn) {
      btn.disabled = false;
      if (previousText) btn.textContent = previousText;
    }
  }
}

async function fetchQuizOrFallback(request, index) {
  try {
    const response = await fetch(noteQuizApi.generate, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify(request)
    });

    if (!response.ok) throw new Error(await response.text());
    return normalizeQuiz(await response.json(), request, index);
  } catch (error) {
    console.warn(`AI quiz API failed for item ${index + 1}. Falling back to local quiz.`, error);
    return buildFallbackQuiz(request.subject, request.difficulty, request.type, index);
  }
}

function buildQuizRequest(selectedDiff, sequenceIndex = 0, totalCount = 3) {
  const difficulty = selectedDiff === 'all'
    ? ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)]
    : selectedDiff;

  const userPrompt = getQuizUserPrompt();
  const requestedType = getPromptQuestionType(userPrompt);
  const type = requestedType || questionTypes[sequenceIndex % questionTypes.length];
  const sourceText = buildQuizSourceText(userPrompt);
  const subject = getSelectedQuizSubject(sourceText);
  const recentQuestions = getRecentQuizQuestions(subject);
  const countInstruction = getQuizCountInstruction();

  return {
    subject,
    difficulty,
    type,
    sourceText: [
      buildSubjectSourceText(subject, sourceText),
      '',
      userPrompt ? `사용자 요청: ${userPrompt}` : '',
      userPrompt ? '사용자 요청에 특정 요약 번호나 문제 유형이 있으면 그 조건을 우선 반영해주세요.' : '',
      countInstruction,
      `이번 묶음은 총 ${totalCount}문제입니다. 현재는 ${sequenceIndex + 1}번째 문제이므로 앞뒤 문제와 다른 개념, 다른 표현, 다른 정답이 되게 만들어주세요.`,
      '최근 생성한 문제와 겹치지 않게 다른 개념, 다른 예시, 다른 함정으로 새 문제를 만들어주세요.',
      `최근 문제:\n${recentQuestions.join('\n')}`
    ].filter(Boolean).join('\n')
  };
}

function getQuizTargetCount(prompt = '') {
  const requestedCount = getPromptRequestedQuizCount(prompt);
  if (requestedCount) return requestedCount;
  return 3;
}

function getPromptRequestedQuizCount(prompt = '') {
  const text = String(prompt || '').trim();
  if (!text) return 0;

  const digitMatch = text.match(/(\d+)\s*(문제|문항|개|개만|개로)/);
  if (digitMatch) return clampQuizCount(Number.parseInt(digitMatch[1], 10));

  const koreanNumbers = {
    한: 1,
    두: 2,
    세: 3,
    네: 4,
    다섯: 5,
    여섯: 6,
    일곱: 7,
    여덟: 8,
    아홉: 9,
    열: 10
  };

  for (const [word, count] of Object.entries(koreanNumbers)) {
    if (new RegExp(`${word}\\s*(문제|문항|개)`).test(text)) {
      return clampQuizCount(count);
    }
  }

  return 0;
}

function clampQuizCount(count) {
  if (!Number.isFinite(count)) return 0;
  return Math.max(3, Math.min(10, count));
}

function getQuizUserPrompt() {
  const input = document.getElementById('noteQuizPrompt');
  return input ? input.value.trim() : '';
}

function getPromptQuestionType(prompt) {
  if (!prompt) return '';
  if (/(객관식|선택형|multiple|choice|mcq)/i.test(prompt)) return 'mcq';
  if (/(서술형|논술|주관식|essay|short answer)/i.test(prompt)) return 'essay';
  return '';
}

function getQuizCountInstruction() {
  return '사용자가 문제 수를 직접 적지 않으면 기본 3문제를 생성합니다.';
}

function getSelectedQuizSubject(sourceText) {
  if (hasPdfStudyMaterial()) {
    if (typeof pdfState !== 'undefined' && quizSubjects.includes(pdfState.subject)) {
      return pdfState.subject;
    }
    const inferred = inferSubject(sourceText);
    return quizSubjects.includes(inferred) ? inferred : '운영체제';
  }

  const currentFilter = window.currentNoteFilter || 'all';
  if (currentFilter !== 'all') {
    return normalizeQuizSubject(currentFilter);
  }

  const inferred = inferSubject(sourceText);
  if (quizSubjects.includes(inferred)) {
    return inferred;
  }

  if (hasPdfStudyMaterial()) {
    return '운영체제';
  }

  return csQuizSubjects[Math.floor(Math.random() * csQuizSubjects.length)];
}

function buildQuizSourceText(userPrompt = '') {
  if (typeof pdfState !== 'undefined') {
    const chunks = [];
    const selectedRefs = getPromptSummaryRefs(userPrompt);
    if (selectedRefs.length > 0) {
      chunks.push(`사용자가 선택한 요약 번호:\n${selectedRefs.map(ref => `${ref.number}번. ${ref.text}`).join('\n')}`);
    }
    if (pdfState.summaryText) chunks.push(`AI 요약:\n${pdfState.summaryText}`);
    if (pdfState.summaryRefs && pdfState.summaryRefs.length > 0) {
      chunks.push(`번호가 붙은 요약 항목:\n${pdfState.summaryRefs.map(ref => `${ref.number}번. ${ref.text}`).join('\n')}`);
    } else if (pdfState.summaryItems && pdfState.summaryItems.length > 0) {
      chunks.push(`요약 항목:\n${pdfState.summaryItems.join('\n')}`);
    }
    if (pdfState.sourceText) chunks.push(`원문 일부:\n${pdfState.sourceText.slice(0, 4000)}`);
    if (chunks.length > 0) return chunks.join('\n\n');
  }

  const activeNotes = window.getAppNotes();
  if (activeNotes.length > 0) {
    return activeNotes
      .slice(0, 6)
      .map(note => `${note.subject || ''} ${note.title || ''} ${note.q || ''} ${note.correct || ''}`)
      .join(' ');
  }

  return '운영체제 프로세스 스레드 교착상태 자료구조 스택 큐 트리 알고리즘 빅오 정렬 탐색 재귀 DP';
}

function getPromptSummaryRefs(prompt) {
  if (!prompt || typeof pdfState === 'undefined' || !Array.isArray(pdfState.summaryRefs)) return [];
  const numbers = new Set();
  const normalized = prompt.replace(/번/g, '');
  const matches = normalized.match(/\d+/g) || [];
  matches.forEach(value => {
    const number = Number.parseInt(value, 10);
    if (Number.isInteger(number)) numbers.add(number);
  });
  return pdfState.summaryRefs.filter(ref => numbers.has(ref.number));
}

function hasPdfStudyMaterial() {
  if (typeof pdfState === 'undefined') return false;
  return Boolean(
    (pdfState.summaryText && pdfState.summaryText.trim()) ||
    (pdfState.summaryItems && pdfState.summaryItems.length > 0) ||
    (pdfState.sourceText && pdfState.sourceText.trim())
  );
}

function buildSubjectSourceText(subject, sourceText) {
  const guide = {
    '자료구조': '자료구조 범위: 배열, 연결 리스트, 스택, 큐, 트리, 그래프, 힙, 해시 테이블.',
    '알고리즘': '알고리즘 범위: 시간 복잡도, 빅오, 정렬, 탐색, 재귀, DP, 그리디.',
    '운영체제': '운영체제 범위: 프로세스, 스레드, CPU 스케줄링, 메모리 관리, 교착상태.'
  }[subject] || '업로드한 학습 자료의 핵심 개념.';

  return `선택 과목: ${subject}\n${guide}\n학습 자료:\n${sourceText}`;
}

function inferSubject(text) {
  const source = String(text || '');
  const subjectRules = {
    '알고리즘': [
      [/알고리즘|algorithm/i, 7],
      [/시간\s*복잡도|공간\s*복잡도|빅오|big-?o/i, 7],
      [/탐욕\s*알고리즘|그리디|greedy|프림|prim|크루스칼|kruskal|최소\s*비용\s*신장\s*트리|최소\s*신장\s*트리|MST/i, 7],
      [/다익스트라|dijkstra|벨만|플로이드|최단\s*경로|분할\s*정복|동적\s*계획|동적\s*프로그래밍|DP|백트래킹/i, 7],
      [/재귀\s*알고리즘|정렬\s*알고리즘|탐색\s*알고리즘|이진\s*탐색|선형\s*탐색/i, 6]
    ],
    '자료구조': [
      [/자료구조|data\s*structure/i, 7],
      [/스택|큐|덱|연결\s*리스트|해시\s*테이블|해시|힙|우선순위\s*큐/i, 6],
      [/이진\s*트리|탐색\s*트리|BST|AVL|B-?트리/i, 6],
      [/그래프\s*자료구조|인접\s*리스트|인접\s*행렬/i, 6]
    ],
    '운영체제': [
      [/운영체제|operating\s*system|OS|프로세스|스레드|CPU\s*스케줄링|스케줄링|교착상태|메모리\s*관리|페이징|세그먼테이션|가상\s*메모리/i, 7]
    ]
  };

  const scores = Object.fromEntries(Object.keys(subjectRules).map(subject => [subject, 0]));
  Object.entries(subjectRules).forEach(([subject, rules]) => {
    rules.forEach(([pattern, weight]) => {
      const matches = source.match(pattern);
      if (matches) scores[subject] += weight * matches.length;
    });
  });

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : '';
}

function normalizeQuiz(rawQuiz, request, indexOffset = 0) {
  const type = rawQuiz?.type === 'essay' ? 'essay' : 'mcq';
  const difficulty = normalizeDifficulty(rawQuiz?.difficulty || request.difficulty);
  const subject = normalizeQuizSubject(rawQuiz?.subject || request.subject);
  const fallback = buildFallbackQuiz(subject, difficulty, type);
  const quiz = {
    id: Date.now() + indexOffset,
    type,
    subject,
    difficulty,
    keyword: rawQuiz?.keyword || subject,
    question: rawQuiz?.question || fallback.question,
    options: Array.isArray(rawQuiz?.options) ? rawQuiz.options.slice(0, 4) : fallback.options,
    answerIdx: Number.isInteger(rawQuiz?.answerIdx) ? rawQuiz.answerIdx : fallback.answerIdx,
    answer: buildSafeQuizAnswer(rawQuiz, fallback, type, request),
    explanation: buildSafeQuizExplanation(rawQuiz, fallback, type, request),
    source: rawQuiz?.source || 'openai'
  };

  if (quiz.type === 'mcq') {
    if (!quiz.options || quiz.options.length < 4) quiz.options = fallback.options;
    quiz.answerIdx = resolveQuizAnswerIndex(rawQuiz, quiz.options, fallback.answerIdx);
    quiz.answer = quiz.options[quiz.answerIdx] || quiz.answer || fallback.answer;
  } else {
    quiz.options = [];
    quiz.answerIdx = -1;
  }

  quiz.answerKeywords = buildAnswerKeywords(`${quiz.answer} ${quiz.explanation}`);
  rememberQuizQuestion(quiz.subject, quiz.question);
  return quiz;
}

function resolveQuizAnswerIndex(rawQuiz, options, fallbackIdx = 0) {
  const safeOptions = Array.isArray(options) ? options : [];
  const answerText = normalizeAnswerText(rawQuiz?.answer || '');

  if (answerText) {
    const exactIdx = safeOptions.findIndex(option => normalizeAnswerText(option) === answerText);
    if (exactIdx >= 0) return exactIdx;

    const containedIdx = safeOptions.findIndex(option => {
      const normalizedOption = normalizeAnswerText(option);
      return normalizedOption && (normalizedOption.includes(answerText) || answerText.includes(normalizedOption));
    });
    if (containedIdx >= 0) return containedIdx;

    const numericMatch = answerText.match(/^[1-4]/);
    if (numericMatch) {
      const oneBasedIdx = Number.parseInt(numericMatch[0], 10) - 1;
      if (oneBasedIdx >= 0 && oneBasedIdx < safeOptions.length) return oneBasedIdx;
    }
  }

  const rawIdx = Number.parseInt(rawQuiz?.answerIdx, 10);
  if (Number.isInteger(rawIdx)) {
    if (rawIdx >= 0 && rawIdx < safeOptions.length) return rawIdx;
    if (rawIdx >= 1 && rawIdx <= safeOptions.length) return rawIdx - 1;
  }

  return fallbackIdx >= 0 && fallbackIdx < safeOptions.length ? fallbackIdx : 0;
}

function normalizeAnswerText(value) {
  return String(value ?? '')
    .replace(/^정답\s*[:：-]?\s*/i, '')
    .replace(/^\d+\s*(번|[.)])\s*/, '')
    .replace(/\s+/g, '')
    .replace(/[.,!?'"“”‘’(){}\[\]<>:：;；]/g, '')
    .trim();
}

function buildSafeQuizAnswer(rawQuiz, fallback, type, request = null) {
  if (rawQuiz?.answer && String(rawQuiz.answer).trim()) return rawQuiz.answer;
  if (type === 'mcq') return '';
  if (rawQuiz?.explanation && String(rawQuiz.explanation).trim()) return rawQuiz.explanation;
  if (rawQuiz?.source && rawQuiz.source !== 'openai') return fallback.answer;
  return buildMaterialAnswerFromRequest(request, fallback.answer);
}

function buildSafeQuizExplanation(rawQuiz, fallback, type, request = null) {
  if (rawQuiz?.explanation && String(rawQuiz.explanation).trim()) return rawQuiz.explanation;
  if (rawQuiz?.source && rawQuiz.source !== 'openai') return fallback.explanation;
  return type === 'essay'
    ? buildMaterialExplanationFromRequest(request, fallback.explanation)
    : fallback.explanation;
}

function buildMaterialAnswerFromRequest(request, fallbackAnswer = '') {
  const lines = extractStudyMaterialLines(request?.sourceText || '');
  if (lines.length === 0) return fallbackAnswer || '학습 자료의 핵심 개념과 근거를 연결해 설명합니다.';
  return lines.slice(0, 2).join(' ');
}

function buildMaterialExplanationFromRequest(request, fallbackExplanation = '') {
  const lines = extractStudyMaterialLines(request?.sourceText || '');
  if (lines.length === 0) return fallbackExplanation || '학습 자료에서 반복적으로 강조된 핵심 문장을 근거로 판단합니다.';
  return `요약본의 핵심 문장 "${lines[0]}"을 근거로 답을 정리할 수 있습니다.`;
}

function extractStudyMaterialLines(sourceText) {
  return String(sourceText || '')
    .split(/\n+/)
    .map(line => line
      .replace(/^(AI 요약|번호가 붙은 요약 항목|사용자가 선택한 요약 번호|원문 일부|학습 자료|선택 과목|사용자 요청|최근 문제):?\s*/g, '')
      .replace(/^\d+번\.\s*/, '')
      .trim())
    .filter(line => line.length >= 12)
    .filter(line => !/최근 생성한 문제|질문 수 설정|문제 유형|난이도|Requirements/i.test(line))
    .slice(0, 6);
}

function getRecentQuizQuestions(subject) {
  try {
    const saved = safeGetItem(`codemind_recent_quiz_questions_${subject}`);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.slice(-8) : [];
  } catch (error) {
    return [];
  }
}

function rememberQuizQuestion(subject, question) {
  if (!question) return;
  const recent = getRecentQuizQuestions(subject);
  recent.push(question);
  safeSetItem(`codemind_recent_quiz_questions_${subject}`, JSON.stringify(recent.slice(-8)));
}

function normalizeDifficulty(difficulty) {
  if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') return difficulty;
  if (difficulty === '하') return 'easy';
  if (difficulty === '중') return 'medium';
  if (difficulty === '상') return 'hard';
  return 'medium';
}

function normalizeQuizSubject(value) {
  if (typeof window.normalizeSubject === 'function') {
    const normalized = window.normalizeSubject(value);
    return quizSubjects.includes(normalized) ? normalized : '운영체제';
  }
  return quizSubjects.includes(value) ? value : '운영체제';
}

function buildAnswerKeywords(answer) {
  return String(answer)
    .replace(/[.,()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 2)
    .slice(0, 8);
}

function buildFallbackQuiz(subject = '운영체제', selectedDiff = 'medium', type = 'mcq', indexOffset = 0) {
  const difficulty = normalizeDifficulty(selectedDiff === 'all' ? 'medium' : selectedDiff);
  const normalizedSubject = normalizeQuizSubject(subject);
  const pool = fallbackPool[normalizedSubject] || fallbackPool['운영체제'];
  const selected = pool[type === 'essay' ? 'essay' : 'mcq'];
  return {
    id: Date.now() + indexOffset,
    type: type === 'essay' ? 'essay' : 'mcq',
    subject: normalizedSubject,
    difficulty,
    keyword: selected.keyword,
    question: selected.question,
    options: selected.options || [],
    answerIdx: Number.isInteger(selected.answerIdx) ? selected.answerIdx : -1,
    answer: selected.answer,
    answerKeywords: buildAnswerKeywords(selected.answer),
    explanation: selected.explanation,
    source: 'client-fallback'
  };
}

const fallbackPool = {
  '자료구조': {
    mcq: {
      keyword: '스택과 큐',
      question: '스택이 큐보다 더 적합한 상황은 무엇인가요?',
      options: [
        '가장 최근에 추가한 작업을 먼저 되돌려야 할 때',
        '가장 오래 기다린 요청을 먼저 처리해야 할 때',
        '모든 원소를 자동으로 정렬해야 할 때',
        '인덱스로 임의 위치에 자주 접근해야 할 때'
      ],
      answerIdx: 0,
      answer: '가장 최근에 추가한 작업을 먼저 되돌려야 할 때',
      explanation: '스택은 LIFO 구조라서 최근 작업을 먼저 처리하는 undo, 함수 호출 관리에 적합합니다.'
    },
    essay: {
      keyword: '해시 테이블',
      question: '해시 테이블에서 충돌이 발생하는 이유와 이를 처리하는 대표 방법을 설명하세요.',
      answer: '서로 다른 키가 같은 해시 값 또는 같은 버킷으로 매핑될 때 충돌이 발생하며, 체이닝이나 개방 주소법으로 처리할 수 있습니다.',
      explanation: '좋은 답안은 충돌의 원인과 체이닝, 선형 조사 같은 해결 방법을 함께 설명해야 합니다.'
    }
  },
  '알고리즘': {
    mcq: {
      keyword: '시간 복잡도',
      question: '이진 탐색의 시간 복잡도가 O(log n)인 이유로 가장 알맞은 것은 무엇인가요?',
      options: [
        '탐색 범위를 매 단계 절반씩 줄이기 때문이다.',
        '모든 원소를 한 번씩 검사하기 때문이다.',
        '항상 두 번의 비교만 수행하기 때문이다.',
        '배열을 먼저 완전히 정렬하기 때문이다.'
      ],
      answerIdx: 0,
      answer: '탐색 범위를 매 단계 절반씩 줄이기 때문이다.',
      explanation: '이진 탐색은 정렬된 범위의 중앙을 기준으로 절반을 버리므로 입력이 커져도 단계 수가 로그 형태로 증가합니다.'
    },
    essay: {
      keyword: '동적 프로그래밍',
      question: '동적 프로그래밍이 중복 계산을 줄이는 원리를 피보나치 수열 예시로 설명하세요.',
      answer: '이미 계산한 하위 문제의 결과를 저장해 재사용하므로 같은 피보나치 값을 반복 계산하지 않습니다.',
      explanation: '좋은 답안은 하위 문제, 메모이제이션 또는 테이블 저장, 중복 제거를 포함해야 합니다.'
    }
  },
  '운영체제': {
    mcq: {
      keyword: '프로세스와 스레드',
      question: '스레드가 프로세스보다 가볍다고 말하는 이유로 옳은 것은 무엇인가요?',
      options: [
        '같은 프로세스 안의 Code, Data, Heap 영역을 공유하기 때문이다.',
        '스레드는 CPU를 전혀 사용하지 않기 때문이다.',
        '스레드는 항상 별도의 컴퓨터에서 실행되기 때문이다.',
        '스레드는 모든 메모리 영역을 독립적으로 가진다.'
      ],
      answerIdx: 0,
      answer: '같은 프로세스 안의 Code, Data, Heap 영역을 공유하기 때문이다.',
      explanation: '스레드는 같은 프로세스의 자원을 일부 공유하기 때문에 생성과 문맥 교환 비용이 상대적으로 작습니다.'
    },
    essay: {
      keyword: '교착상태',
      question: '교착상태가 발생하기 위한 네 가지 필요 조건을 설명하고, 한 조건을 제거하면 왜 예방이 가능한지 서술하세요.',
      answer: '상호 배제, 점유 대기, 비선점, 순환 대기가 모두 만족될 때 교착상태가 발생하며, 이 중 하나라도 깨면 순환적인 대기를 막을 수 있습니다.',
      explanation: '좋은 답안은 네 조건의 이름과 조건 제거가 예방으로 이어지는 이유를 함께 설명해야 합니다.'
    }
  }
};

function renderNoteQuizzes() {
  const container = document.getElementById('noteQuizContainer');
  if (!container) return;
  if (!noteAiQuizzes.length) {
    container.innerHTML = '';
    return;
  }

  const q = noteAiQuizzes[noteQuizIndex] || noteAiQuizzes[0];
  const diffLabel = difficultyLabels[q.difficulty] || q.difficulty;
  const diffColor = difficultyColors[q.difficulty] || '#64748b';
  const typeLabel = q.type === 'mcq' ? '객관식' : '서술형';
  const sourceLabel = q.source === 'openai' ? 'OpenAI 생성' : '임시 문제';
  const sourceColor = q.source === 'openai' ? '#2563eb' : '#64748b';

  container.innerHTML = `
      <div class="quiz-progress-wrap">
        <div>
          <strong>${noteQuizIndex + 1} / ${noteAiQuizzes.length}</strong>
          <span>한 문제씩 풀고 다음으로 넘어가세요.</span>
        </div>
        <div class="quiz-progress-dots">
          ${noteAiQuizzes.map((_, idx) => `<span class="${idx === noteQuizIndex ? 'active' : idx < noteQuizIndex ? 'done' : ''}"></span>`).join('')}
        </div>
      </div>
      <div class="note-card quiz-card" style="--ncolor:${typeof window.subjectColor === 'function' ? window.subjectColor(q.subject) : 'var(--accent3)'};">
        <div class="note-meta">
          <span class="quiz-title-line">
            [${escapeQuizHtml(q.subject)}] ${escapeQuizHtml(q.keyword)} 예상문제
            <span class="quiz-badge">${typeLabel}</span>
            <span class="quiz-badge" style="background:${diffColor};">난이도: ${diffLabel}</span>
            <span class="quiz-badge" style="background:${sourceColor};">${sourceLabel}</span>
          </span>
        </div>
        <div class="note-title">Q. ${escapeQuizHtml(q.question)}</div>
        <div class="quiz-options">
          ${q.type === 'mcq' ? renderMcqOptions(q) : renderEssayInput(q)}
        </div>
        <button class="btn-primary" id="submit-btn-${q.id}" onclick="submitNoteQuiz(${q.id}, event)">답안 제출 및 채점하기</button>
        <div id="note-quiz-result-${q.id}" class="quiz-result"></div>
      </div>
    `;
}

function renderMcqOptions(q) {
  return q.options.map((option, index) => `
    <label class="quiz-option">
      <input type="radio" name="quiz-${q.id}" value="${index}">
      <span>${index + 1}. ${escapeQuizHtml(option)}</span>
    </label>
  `).join('');
}

function renderEssayInput(q) {
  return `<textarea id="essay-ans-${q.id}" class="quiz-essay" placeholder="여기에 답안을 서술해주세요."></textarea>`;
}

async function submitNoteQuiz(qId, event) {
  const q = noteAiQuizzes.find(item => item.id === qId);
  if (!q) return;

  const resultBox = document.getElementById(`note-quiz-result-${q.id}`);
  const submitBtn = event.target;
  let isCorrect = false;
  let userAnswerStr = '';
  let correctAnswerStr = '';

  if (q.type === 'mcq') {
    const selectedRadio = document.querySelector(`input[name="quiz-${q.id}"]:checked`);
    if (!selectedRadio) {
      showToast('답안을 먼저 선택해주세요.', 'WARN');
      return;
    }

    const selectedIdx = parseInt(selectedRadio.value, 10);
    userAnswerStr = q.options[selectedIdx];
    correctAnswerStr = q.options[q.answerIdx] || q.answer;
    isCorrect = selectedIdx === q.answerIdx;

    document.querySelectorAll(`input[name="quiz-${q.id}"]`).forEach(input => input.disabled = true);
    selectedRadio.closest('.quiz-option').classList.add(isCorrect ? 'correct' : 'wrong');

    const correctRadio = document.querySelector(`input[name="quiz-${q.id}"][value="${q.answerIdx}"]`);
    if (correctRadio) correctRadio.closest('.quiz-option').classList.add('correct');
  } else {
    const essayInput = document.getElementById(`essay-ans-${q.id}`);
    userAnswerStr = essayInput.value.trim();
    if (!userAnswerStr) {
      showToast('답안을 먼저 작성해주세요.', 'WARN');
      return;
    }

    const keywords = q.answerKeywords && q.answerKeywords.length ? q.answerKeywords : buildAnswerKeywords(q.answer || q.explanation);
    const matchCount = keywords.filter(keyword => userAnswerStr.includes(keyword)).length;
    isCorrect = matchCount >= Math.min(2, Math.max(1, keywords.length));
    correctAnswerStr = q.answer || q.explanation;

    essayInput.disabled = true;
    essayInput.classList.add(isCorrect ? 'correct' : 'wrong');
  }

  submitBtn.style.display = 'none';
  resultBox.style.display = 'block';

  if (isCorrect) {
    resultBox.innerHTML = `
      <span class="eval-good">정답입니다.</span>
      <div style="margin-top:10px;"><strong>AI 해설:</strong> ${escapeQuizHtml(q.explanation)}</div>
      ${renderQuizNextAction()}
    `;
    return;
  }

  resultBox.innerHTML = `
    <span class="eval-bad">오답입니다.</span>
    <div style="margin-top:10px;"><strong>AI 해설:</strong> ${escapeQuizHtml(q.explanation)}</div>
    <div class="saved-note-message">오답노트에 자동으로 저장되었습니다.</div>
    ${renderQuizNextAction()}
  `;

  await saveWrongQuizNote(q, userAnswerStr, correctAnswerStr);
}

function renderQuizNextAction() {
  const isLast = noteQuizIndex >= noteAiQuizzes.length - 1;
  return `
    <button class="btn-primary quiz-next-btn" onclick="${isLast ? 'finishNoteQuizSet()' : 'goToNextNoteQuiz()'}">
      ${isLast ? '복습 완료' : '다음 문제'}
    </button>
  `;
}

function goToNextNoteQuiz() {
  noteQuizIndex = Math.min(noteQuizIndex + 1, noteAiQuizzes.length - 1);
  renderNoteQuizzes();
  document.getElementById('noteQuizContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function finishNoteQuizSet() {
  showToast('AI 예상문제 복습을 완료했습니다.');
  const container = document.getElementById('noteQuizContainer');
  if (container) {
    container.innerHTML = `
      <div class="quiz-complete-card">
        <strong>문제 풀이 완료</strong>
        <span>${noteAiQuizzes.length}문제를 모두 확인했습니다. 틀린 문제는 아래 오답노트에 저장되어 다시 복습할 수 있습니다.</span>
        <button class="btn-primary" onclick="openQuizSettingsModal()">새 문제 만들기</button>
      </div>
    `;
  }
}

async function saveWrongQuizNote(q, userAnswerStr, correctAnswerStr) {
  const userId =
      typeof window.getCurrentUserId === 'function' ? window.getCurrentUserId() : '';
  if (!userId || userId === 'guest') {
    showToast("로그인 후 오답노트에 저장할 수 있습니다.", "WARN");

    if (typeof openLogin === 'function') {
      openLogin();
    }

    return;
  }
  const typeLabel = q.type === 'mcq' ? '객관식' : '서술형';
  const diffLabel = difficultyLabels[q.difficulty] || q.difficulty;
  const subject = normalizeQuizSubject(q.subject);
  const activeNotes = window.getAppNotes();
  const normalizedAnswerIdx = Number.parseInt(q.answerIdx, 10);
  const safeAnswerIdx = Number.isInteger(normalizedAnswerIdx) ? normalizedAnswerIdx : -1;
  const safeCorrectAnswer = q.type === 'mcq'
    ? (q.options?.[safeAnswerIdx] || q.answer || correctAnswerStr)
    : (q.answer || correctAnswerStr || q.explanation);
  const note = {
    id: Date.now(),
    subject,
    title: `AI 예상문제 오답 (${typeLabel} / 난이도: ${diffLabel})`,
    q: q.question,
    wrong: userAnswerStr,
    correct: `${safeCorrectAnswer}\n해설: ${q.explanation}`,
    date: buildQuizTodayString(),
    color: typeof window.subjectColor === 'function' ? window.subjectColor(subject) : 'var(--accent4)',
    questionType: q.type === 'mcq' ? 'mcq' : 'essay',
    optionsJson: q.type === 'mcq' ? JSON.stringify(q.options) : '[]',
    answerIdx: q.type === 'mcq' ? safeAnswerIdx : null,
    answerKeywordsJson: JSON.stringify(q.answerKeywords || buildAnswerKeywords(`${q.answer} ${q.explanation}`)),
    debugSolved: false,
    relapsed: false
  };

  let savedNote = note;
  if (typeof window.createNoteViaApi === 'function') {
    savedNote = await window.createNoteViaApi(note);
  }

  activeNotes.unshift(savedNote);
  window.saveAppNotes();
  refreshNotesAfterSave(subject);
}

function refreshNotesAfterSave(subject) {
  if (window.currentNoteFilter !== 'all' && window.currentNoteFilter !== subject) {
    window.currentNoteFilter = subject;
  }

  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  const activeFilterBtn = Array.from(document.querySelectorAll('.filter-btn'))
    .find(btn => btn.textContent.trim() === (window.currentNoteFilter === 'all' ? '전체' : window.currentNoteFilter));
  if (activeFilterBtn) activeFilterBtn.classList.add('active');

  if (typeof window.renderNotes === 'function') window.renderNotes(window.currentNoteFilter || 'all');
  if (typeof window.addCyberButtonsToCards === 'function') setTimeout(window.addCyberButtonsToCards, 100);
}

function buildQuizTodayString() {
  const today = new Date();
  return `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
}

function escapeQuizHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}