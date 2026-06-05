const pdfSamples = {
  os: `운영체제에서 프로세스는 실행 중인 프로그램을 의미한다. 프로세스는 독립적인 메모리 공간을 가지며 운영체제로부터 자원을 할당받는다. 스레드는 프로세스 내부에서 실행되는 흐름 단위이며 같은 프로세스 안의 스레드들은 Code, Data, Heap 영역을 공유하고 Stack은 독립적으로 가진다. CPU 스케줄링은 여러 프로세스에 CPU를 배분하는 방식이며 FCFS, SJF, Round Robin 방식이 있다. 교착상태는 두 개 이상의 프로세스가 서로의 자원을 기다리며 무한정 대기하는 상태이다.`
};

let pdfState = {
  sourceText: '',
  summaryText: '',
  summaryItems: [],
  summaryRefs: [],
  visualPages: [],
  visualSummary: '',
  subject: '운영체제',
  keywords: [],
  blanks: [],
  reverseQuestion: '',
  activeKeyword: '',
  activeBlank: null,
  summaryId: 0
};

function requireLoginForSave() {
  // 1. 브라우저 저장소(세션 또는 로컬)에서 로그인된 유저 ID 키값을 가져옵니다.
  // 💡 본인의 프로젝트에서 로그인할 때 세션에 저장한 키값(예: 'userId', 'user', 'username')으로 변경하세요.
  let userId = sessionStorage.getItem("userId") || localStorage.getItem("userId");

  // 2. 만약 기존에 window.getCurrentUserId 함수가 정의되어 있다면 그것도 같이 체크
  if (!userId && typeof window.getCurrentUserId === 'function') {
    userId = window.getCurrentUserId();
  }

  // 3. 디버깅용 로그 (개발자 도구 콘솔창에서 확인 가능)
  console.log("현재 프론트가 인식한 유저 ID:", userId);

  // 4. 아이디가 없거나, 공백이거나, 문자열 'guest'인 경우 차단
  if (!userId || userId.trim() === '' || userId === 'guest') {
    showToast("로그인 후 저장할 수 있습니다.", "WARN");
    if (typeof openLogin === 'function') {
      openLogin();
    }
    return null;
  }
  
  return userId; // 정식 유저 ID 반환
}


const pdfApi = {
  upload: '/api/pdf/upload',
  summary: '/api/pdf/summary',
  quiz: '/api/pdf/quiz',
  saveQuestion: '/api/pdf/save-question',
  reverseQuestion: '/api/pdf/reverse-question',
  evaluateAnswer: '/api/pdf/evaluate-answer',
  memo: '/api/pdf/memo',
  memoList: summaryId => `/api/pdf/memo/${summaryId || 0}`,
  updateMemo: '/api/pdf/memo/update',
  deleteMemo: '/api/pdf/memo/delete'
};

const maxPdfFileSizeMb = 50;
const maxPdfFileSizeBytes = maxPdfFileSizeMb * 1024 * 1024;
const allowedPdfSubjects = ['자료구조', '알고리즘', '운영체제'];

function loadSamplePdfText(type) {
  const textarea = document.getElementById('pdfSourceText');
  textarea.value = pdfSamples[type] || '';
  pdfState.sourceText = textarea.value;
  showToast('예시 학습 자료를 불러왔습니다.');
}

async function loadPdfTextFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (file.size > maxPdfFileSizeBytes) {
    showToast(`파일 용량은 최대 ${maxPdfFileSizeMb}MB까지 업로드할 수 있습니다.`, 'WARN');
    event.target.value = '';
    return;
  }

  const textarea = document.getElementById('pdfSourceText');
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    try {
      showToast('PDF 텍스트를 추출하는 중입니다...');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(pdfApi.upload, {
        method: 'POST',
        body: formData
      });

      const data = await readJsonOrText(response);
      if (!response.ok) {
        throw new Error(data.message || data.error || String(data));
      }

      const extractedText = (data.text || '').trim();
      const visualPages = Array.isArray(data.visualPages) ? data.visualPages : [];
      const visualSummary = (data.visualSummary || '').trim();
      console.log("visualPages count:", visualPages.length);
      console.log("first visual src:", visualPages[0]?.slice(0, 80));
      console.log("first visual length:", visualPages[0]?.length);

      if (!extractedText && !visualPages.length) {
        throw new Error('PDF에서 텍스트나 시각 자료를 추출하지 못했습니다.');
}

      const detectedSubject = inferPdfSubject(extractedText);
      if (!isAllowedPdfSubject(detectedSubject)) {
        showToast(buildBlockedPdfSubjectMessage(detectedSubject), 'WARN');
        return;
      }

      textarea.value = extractedText;
      pdfState.sourceText = extractedText;
      pdfState.visualPages = visualPages;
      pdfState.visualSummary = visualSummary;
      pdfState.subject = detectedSubject;
      pdfState.summaryId = 0;

      renderPdfVisualMaterials();

      showToast(`${detectedSubject} PDF를 불러왔습니다. (${extractedText.length.toLocaleString()}자)`);
      return;
    } catch (error) {
      console.error(error);
      showToast(error.message || 'PDF를 읽지 못했습니다.', 'WARN');
      return;
    } finally {
      event.target.value = '';
    }
  }

  const reader = new FileReader();
  reader.onload = e => {
    textarea.value = e.target.result;
    pdfState.sourceText = textarea.value;
    showToast('텍스트 파일을 불러왔습니다.');
  };
  reader.readAsText(file, 'utf-8');
  event.target.value = '';
}

function renderPdfVisualMaterials() {
  const box = document.getElementById('pdfVisualMaterials');
  if (!box) return;

  const pages = pdfState.visualPages || [];

  if (!pages.length) {
    box.innerHTML = '';
    box.hidden = true;
    return;
  }

  box.hidden = false;

box.innerHTML = `
  <div class="pdf-visual-block">
    <div class="pdf-visual-heading">
      시각 자료 원본
    </div>

    <div class="pdf-visual-scroll">
      ${pages.map((src, index) => `
        <div class="pdf-visual-card">
          <div class="pdf-visual-label">
            시각 자료 ${index + 1}
          </div>
          <img src="${src}" alt="PDF 시각 자료 ${index + 1}" class="pdf-visual-image">
        </div>
      `).join('')}
    </div>
  </div>
`;
}

async function readJsonOrText(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  return response.text();
}

function splitSentences(text) {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?다])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

function cleanSummaryLine(line) {
  return String(line || '')
    .replace(/^\s*#{1,6}\s*/g, '')
    .replace(/^\s*[-*•]\s*/g, '')
    .replace(/^\s*\d+\s*[.)]\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSummaryHeading(line) {
  const cleaned = cleanSummaryLine(line);
  return !cleaned || /^(\d+|요약|핵심\s*요약|정리|개요|결론)$/i.test(cleaned) || cleaned.length <= 3;
}

function extractKeywords(text) {
  const candidates = [
    '프로세스', '스레드', 'CPU 스케줄링', '스케줄링', '교착상태', '메모리', '자원', '운영체제',
    '자료구조', '알고리즘', '트리', '스택', '큐', '빅오', '정렬', '탐색', '재귀', 'DP'
  ];
  const knownKeywords = candidates.filter(keyword => text.includes(keyword));
  if (knownKeywords.length >= 3) return knownKeywords.slice(0, 8);

  const stopwords = new Set([
    '그리고', '그러나', '따라서', '하지만', '또한', '대한', '위해', '있는', '한다', '된다',
    'this', 'that', 'with', 'from', 'into', 'about', 'when', 'where', 'which', 'there'
  ]);
  const words = String(text)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length >= 2 && !stopwords.has(word.toLowerCase()));

  const counts = new Map();
  words.forEach(word => counts.set(word, (counts.get(word) || 0) + 1));

  const inferredKeywords = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([word]) => word)
    .filter(word => !knownKeywords.includes(word));

  return [...knownKeywords, ...inferredKeywords].slice(0, 8);
}

function buildLocalSummary(text) {
  const lineItems = String(text || '')
    .split(/\n+/)
    .map(cleanSummaryLine)
    .filter(line => line.length >= 8 && !isSummaryHeading(line));

  if (lineItems.length >= 3) {
    return lineItems.slice(0, 8);
  }

  return splitSentences(text)
    .map(cleanSummaryLine)
    .filter(line => line.length >= 8 && !isSummaryHeading(line))
    .slice(0, 7)
    .map(sentence => sentence.replace(/\s+/g, ' '));
}

async function postText(url, text) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: text
  });
  if (!response.ok) throw new Error(await response.text());
  return response.text();
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(await response.text());
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

async function generatePdfSummary() {
  const text = document.getElementById('pdfSourceText').value.trim();
  if (!text) {
    showToast('먼저 학습 자료를 입력해주세요.', 'WARN');
    return;
  }

  pdfState.sourceText = text;
  const detectedSubject = inferPdfSubject(text);
  if (!isAllowedPdfSubject(detectedSubject)) {
    showToast(buildBlockedPdfSubjectMessage(detectedSubject), 'WARN');
    return;
  }
  pdfState.subject = detectedSubject;
  let summaryText = '';

  try {
    showToast('AI 요약을 생성하는 중입니다...');
    
    // 유저 ID 추출
    let currentUserId = 'guest';
    if (typeof window.getCurrentUserId === 'function' && window.getCurrentUserId()) {
      currentUserId = window.getCurrentUserId();
    } else if (typeof window.currentUser !== 'undefined' && window.currentUser?.id) {
      currentUserId = window.currentUser.id;
    } else {
      currentUserId = sessionStorage.getItem("userId") || localStorage.getItem("userId") || 'guest';
    }

    const visualSummary = (pdfState.visualSummary || '').trim();

const summarySource = [
  text,
  visualSummary ? `[시각 자료 요약]\n${visualSummary}` : ''
].filter(Boolean).join('\n\n');

const response = await fetch(pdfApi.summary, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
    'X-User-Id': String(currentUserId)
  },
  body: JSON.stringify({ 
    text: summarySource,
    subject: pdfState.subject || "운영체제"
  })
});

    if (!response.ok) throw new Error(await response.text());
    
    const result = await response.json(); 
    
    // 🛑 [수정 포인트] 여기서 미리 summaryId를 고정하지 않습니다. (아직 저장을 안 했으므로 0)
    pdfState.summaryId = 0; 
    summaryText = result.summary || result.text || ''; // 백엔드가 텍스트만 주든 객체를 주든 받음

  } catch (error) {
    console.warn('Summary API failed. Falling back to local summary.', error);
    summaryText = buildLocalSummary(text).join('\n');
    pdfState.summaryId = 0;
    showToast('요약 API 연결이 어려워 로컬 요약을 표시합니다.', 'WARN');
  }

  // 이후 화면 렌더링 로직은 동일
  pdfState.summaryText = cleanSummaryMarkdown(summaryText);
  pdfState.summaryItems = buildLocalSummary(pdfState.summaryText || text);
  if (!pdfState.summaryItems.length && summaryText) {
    pdfState.summaryItems = summaryText.split('\n').map(cleanSummaryLine).filter(line => line.length >= 8 && !isSummaryHeading(line));
  }
  pdfState.keywords = extractKeywords(`${text} ${pdfState.summaryText}`);
  pdfState.subject = inferPdfSubject(`${text} ${pdfState.summaryText}`);
  
  if (!isAllowedPdfSubject(pdfState.subject)) {
    showToast(buildBlockedPdfSubjectMessage(pdfState.subject), 'WARN');
    return;
  }
  pdfState.summaryRefs = buildSummaryRefs(pdfState.summaryItems, pdfState.keywords);

  const currentVisualSummary = (pdfState.visualSummary || '').trim();

document.getElementById('pdfSummaryOutput').innerHTML = `
  <div style="margin-bottom:18px;">
    <div style="
      font-size:14px;
      font-weight:800;
      color:var(--text);
      margin-bottom:10px;
    ">
      텍스트 요약
    </div>

    <ul class="summary-list">
      ${pdfState.summaryRefs.map(ref => `
        <li>
          <span class="summary-ref" title="${escapePdfHtml(ref.tooltip)}">${ref.number}</span>
          <span>${highlightSummaryKeywords(ref.text, ref.keywords)}</span>
        </li>
      `).join('')}
    </ul>
  </div>

  ${currentVisualSummary ? `
    <div style="
      margin-top:18px;
      padding-top:16px;
      border-top:1px solid var(--border);
    ">
      <div style="
        font-size:14px;
        font-weight:800;
        color:var(--text);
        margin-bottom:10px;
      ">
        시각 자료 요약
      </div>

      <div style="
        white-space:pre-wrap;
        line-height:1.8;
        font-size:14px;
        color:var(--text2);
      ">
        ${escapePdfHtml(currentVisualSummary)}
      </div>
    </div>
  ` : ''}
`;

  showToast('번호가 붙은 요약을 생성했습니다. 저장하려면 [요약 저장]을 누르세요.');
}

function cleanSummaryMarkdown(text) {
  return String(text || '')
    .split(/\n+/)
    .map(cleanSummaryLine)
    .filter(line => line.length >= 8 && !isSummaryHeading(line))
    .join('\n');
}

function buildSummaryRefs(items, keywords) {
  return items.map((item, index) => {
    const matchedKeywords = keywords.filter(keyword => item.includes(keyword)).slice(0, 4);
    return {
      number: index + 1,
      text: item,
      keywords: matchedKeywords,
      tooltip: matchedKeywords.length
        ? `${index + 1}번 핵심: ${matchedKeywords.join(', ')}`
        : `${index + 1}번 요약 문장입니다. 이 번호를 문제 생성 프롬프트에 사용할 수 있습니다.`
    };
  });
}

function highlightSummaryKeywords(text, keywords) {
  let escapedText = escapePdfHtml(text);
  keywords
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .forEach(keyword => {
      const escapedKeyword = escapePdfHtml(keyword);
      escapedText = escapedText.split(escapedKeyword).join(`<mark class="summary-keyword">${escapedKeyword}</mark>`);
    });
  return escapedText;
}

async function generateBlankQuiz() {
  const text = (pdfState.summaryText || document.getElementById('pdfSourceText').value).trim();
  if (!text) {
    showToast('먼저 학습 자료를 입력해주세요.', 'WARN');
    return;
  }

  let questions = [];
  try {
    showToast('AI 빈칸 문제를 생성하는 중입니다...');
    const quiz = await postJson(pdfApi.quiz, text);
    if (quiz.question && quiz.answer) {
      questions = [{ keyword: quiz.answer, question: quiz.question }];
    }
  } catch (error) {
    console.warn('Quiz API failed. Falling back to local quiz.', error);
  }

  if (!questions.length) {
    if (!pdfState.summaryItems.length || !pdfState.keywords.length) {
      await generatePdfSummary();
    }

    questions = pdfState.keywords.slice(0, 3).map(keyword => {
      const source = pdfState.summaryItems.find(sentence => sentence.includes(keyword))
        || pdfState.sourceText.split('.').find(sentence => sentence.includes(keyword));
      return source ? { keyword, question: source.replace(keyword, '____').trim() } : null;
    }).filter(Boolean);
  }

  pdfState.blanks = questions;
  pdfState.activeBlank = questions[0] || null;

  if (pdfState.activeBlank) {
    await saveGeneratedQuestion(pdfState.activeBlank);
  }

  document.getElementById('blankQuizArea').innerHTML = questions.length ? questions.map((question, index) => `
    <div class="blank-item">
      <div class="blank-q"><strong>문제 ${index + 1}.</strong> ${escapePdfHtml(question.question)}</div>
      <div class="blank-answer-row">
        <input class="blank-input" id="blankAnswer${index}" placeholder="핵심 키워드를 입력하세요">
        <button class="btn-secondary" onclick="checkBlankAnswer(${index})">정답 확인</button>
      </div>
      <div class="blank-result" id="blankResult${index}">정답을 입력해보세요.</div>
    </div>
  `).join('') : '생성 가능한 빈칸 문제가 없습니다.';

  showToast('빈칸 문제가 생성되었습니다.');
}

async function checkBlankAnswer(index) {
  const question = pdfState.blanks[index];
  if (!question) return;

  const value = document.getElementById(`blankAnswer${index}`).value.trim();
  const result = document.getElementById(`blankResult${index}`);
  if (!value) {
    result.innerHTML = '<span class="eval-bad">답을 먼저 입력해주세요.</span>';
    return;
  }

  pdfState.activeKeyword = question.keyword;
  pdfState.activeBlank = question;

  if (value === question.keyword) {
    result.innerHTML = `<span class="eval-good">정답입니다.</span> 핵심 개념 <strong>${escapePdfHtml(question.keyword)}</strong>를 정확히 기억했습니다.`;
  } else {
    result.innerHTML = `<span class="eval-bad">오답입니다.</span> 정답은 <strong>${escapePdfHtml(question.keyword)}</strong>입니다. 오답노트에 저장했습니다.`;
    await savePdfBlankWrongNote(question, value);
  }
}

async function savePdfBlankWrongNote(question, userAnswer) {
  const userId = requireLoginForSave();
  if (!userId) return;
  if (typeof window.createNoteViaApi !== 'function') return;

  const subject = inferPdfSubject(`${pdfState.sourceText} ${question.keyword}`);
  const note = {
    subject,
    title: 'PDF 빈칸 복습 오답',
    q: question.question,
    wrong: userAnswer,
    correct: question.keyword,
    date: buildPdfTodayString(),
    color: typeof window.subjectColor === 'function' ? window.subjectColor(subject) : 'var(--accent4)',
    questionType: 'blank',
    optionsJson: '[]',
    answerIdx: null,
    answerKeywordsJson: JSON.stringify([question.keyword]),
    debugSolved: false,
    relapsed: false
  };

  const savedNote = await window.createNoteViaApi(note);
  window.getAppNotes().unshift(savedNote);
  window.saveAppNotes();
  if (typeof window.renderNotes === 'function') window.renderNotes(window.currentNoteFilter || 'all');
}

async function generateReverseQuestion() {
  const activeBlank = pdfState.activeBlank || pdfState.blanks[0];
  const keyword = pdfState.activeKeyword || activeBlank?.keyword || pdfState.keywords[0];
  if (!keyword) {
    showToast('먼저 요약 또는 빈칸 문제를 생성해주세요.', 'WARN');
    return;
  }

  try {
    showToast('AI 역질문을 생성하는 중입니다...');
    pdfState.reverseQuestion = await postJson(pdfApi.reverseQuestion, {
      summary: pdfState.summaryText || pdfState.summaryItems.join(' '),
      question: activeBlank?.question || `${keyword} 개념을 설명해보세요.`,
      answer: keyword
    });
  } catch (error) {
    console.warn('Reverse question API failed. Falling back to local question.', error);
    pdfState.reverseQuestion = buildLocalReverseQuestion(keyword);
  }

  document.getElementById('reverseQuestionArea').innerHTML = `
    <div class="reverse-q">AI 역질문: ${escapePdfHtml(pdfState.reverseQuestion)}</div>
    <div style="color:var(--text2);font-size:13px;line-height:1.6;">직접 설명하면서 이해의 빈틈을 확인해보세요.</div>
  `;

  showToast('AI 역질문이 생성되었습니다.');
}

function buildLocalReverseQuestion(keyword) {
  const questionMap = {
    '프로세스': '프로세스와 스레드의 차이를 메모리와 자원 공유 관점에서 설명해보세요.',
    '스레드': '스레드가 프로세스보다 가벼운 이유와 자원 공유의 장단점을 설명해보세요.',
    '교착상태': '교착상태가 왜 발생하는지, 어떤 조건이 충족되어야 하는지 설명해보세요.',
    'TCP': 'TCP가 UDP보다 느릴 수 있는데도 많이 쓰이는 이유를 설명해보세요.',
    'UDP': 'UDP가 실시간 서비스에 적합한 이유를 사례와 함께 설명해보세요.',
    'DNS': 'DNS가 없다면 사용자가 웹 서비스를 이용할 때 어떤 불편이 생기는지 설명해보세요.'
  };
  return questionMap[keyword] || `${keyword} 개념을 자신의 말로 설명해보세요.`;
}

async function evaluateReverseAnswer() {
  const answer = document.getElementById('reverseAnswerInput').value.trim();
  const box = document.getElementById('reverseEvalArea');
  const keyword = pdfState.activeKeyword || pdfState.activeBlank?.keyword || pdfState.keywords[0] || '';

  if (!answer) {
    showToast('설명을 입력해주세요.', 'WARN');
    return;
  }

  let feedback = '';
  try {
    showToast('설명을 평가하는 중입니다...');
    feedback = await postJson(pdfApi.evaluateAnswer, {
      summary: pdfState.summaryText || pdfState.summaryItems.join(' '),
      reverseQuestion: pdfState.reverseQuestion || buildLocalReverseQuestion(keyword),
      userAnswer: answer
    });
  } catch (error) {
    console.warn('Evaluation API failed. Falling back to local evaluation.', error);
    feedback = buildLocalEvaluation(keyword, answer);
  }

  box.style.display = 'block';
  box.innerHTML = `
    <div class="reverse-q">설명 평가 결과</div>
    <div style="color:var(--text2);font-size:13.5px;line-height:1.7;">${escapePdfHtml(String(feedback)).replace(/\n/g, '<br>')}</div>
  `;

  showToast('설명 평가 피드백이 생성되었습니다.');
}

function buildLocalEvaluation(keyword, answer) {
  const checks = {
    '프로세스': ['실행', '프로그램', '메모리'],
    '스레드': ['실행', '공유', '프로세스'],
    '교착상태': ['대기', '자원', '프로세스'],
    'TCP': ['신뢰', '연결', '순서'],
    'UDP': ['비연결', '빠르', '실시간'],
    'DNS': ['도메인', 'IP', '변환']
  };

  const expected = checks[keyword] || [keyword];
  const matched = expected.filter(item => answer.includes(item));
  const missing = expected.filter(item => !answer.includes(item));
  let level = '보완 필요';
  if (matched.length >= Math.max(2, expected.length - 1)) level = '이해 양호';
  if (matched.length === expected.length) level = '이해 우수';

  return [
    `평가: ${level}`,
    `잘 언급한 요소: ${matched.length ? matched.join(', ') : '핵심 요소를 더 보강해야 합니다.'}`,
    `보완이 필요한 요소: ${missing.length ? missing.join(', ') : '없음'}`,
    missing.length
      ? `피드백: ${keyword}를 설명할 때 ${missing.join(', ')} 관점까지 포함하면 더 정확합니다.`
      : '피드백: 핵심 포인트를 고르게 설명했습니다.'
  ].join('\n');
}

async function saveStudyMemo() {
  const input = document.getElementById('studyMemoInput');
  const userId = requireLoginForSave();
  if(!userId) return;
  
  const content = input.value.trim();
  if (!content) {
    showToast('메모 내용을 먼저 입력해주세요.', 'WARN');
    return;
  }

  const currentSummaryId = pdfState.summaryId || 0;

  // 🛑 [변경] 임시저장 로직을 완전히 없애고 경고 메시지 후 리턴 처리
  if (currentSummaryId === 0 || currentSummaryId === "0") {
    showToast('먼저 상단의 [요약 저장] 버튼을 눌러 보관함에 추가한 후 메모를 작성할 수 있습니다.', 'WARN');
    return;
  }

  // 요약본 ID가 진짜 존재할 때만 정상적으로 서버(DB) 통신
  const memo = {
    summaryId: String(currentSummaryId),
    memoContent: content
  };

  try {
    const response = await fetch(pdfApi.memo, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-User-Id': userId
      },
      body: JSON.stringify(memo)
    });
    if (!response.ok) throw new Error(await response.text());
    input.value = '';
    showToast('학습 메모를 저장했습니다. ✅');
    await loadStudyMemos(); // 등록 성공 후 서버 데이터 다시 로드
  } catch (error) {
    console.error(error);
    showToast('메모 저장에 실패했습니다: ' + error.message, 'WARN');
  }
}

async function loadStudyMemos() {
  const list = document.getElementById('studyMemoList');
  
  // 🛑 summaryId가 없거나 0일 때는 조회를 취소하고 안내 문구 출력
  if (!pdfState.summaryId || pdfState.summaryId === 0 || pdfState.summaryId === "0") {
    if (list) {
      list.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--text3); font-size:13.5px;">
          요약본을 저장한 후 학습 메모를 작성하고 확인할 수 있습니다.
        </div>
      `;
    }
    return; 
  }

  try {
    let currentId = 'guest';
    if (typeof window.getCurrentUserId === 'function' && window.getCurrentUserId()) {
      currentId = window.getCurrentUserId();
    } else if (typeof window.currentUser !== 'undefined' && window.currentUser?.id) {
      currentId = window.currentUser.id;
    }

    // 오직 실제 DB 일련번호가 존재할 때만 서버에 메모 데이터를 요청함
    const response = await fetch(pdfApi.memoList(pdfState.summaryId), {
      headers: {
        'X-User-Id': String(currentId)
      }
    });
    if (!response.ok) throw new Error(await response.text());
    const memos = await response.json();
    renderStudyMemos(Array.isArray(memos) ? memos : []);
  } catch (error) {
    console.error(error);
    // 🛑 임시저장을 없앴으므로 에러 시 getLocalMemos 로컬 백업 로직을 태우지 않고 빈 배열 처리합니다.
    renderStudyMemos([]);
  }
}

async function updateStudyMemo(memoId) {
  const userId = requireLoginForSave();
  if (!userId) return;

  const editInput = document.getElementById(`editMemoInput-${memoId}`);
  const updatedContent = editInput.value.trim();

  if (!updatedContent) {
    showToast('수정할 내용을 입력해주세요.', 'WARN');
    return;
  }

  try {
    showToast('메모를 수정하는 중입니다...');
    const response = await fetch(pdfApi.updateMemo, {
      method: 'POST', // 💡 POST로 변경
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-User-Id': userId
      },
      body: JSON.stringify({ 
        id: memoId, // 백엔드 엔티티의 ID 필드명과 맞춰주세요 (예: memoId 등)
        memoContent: updatedContent 
      })
    });

    if (!response.ok) throw new Error(await response.text());

    showToast('학습 메모가 수정되었습니다. ✅');
    await loadStudyMemos(); 
  } catch (error) {
    console.error(error);
    showToast('메모 수정에 실패했습니다: ' + error.message, 'WARN');
  }
}

// 🌟 POST 방식으로 메모 삭제
async function deleteStudyMemo(memoId) {
  const userId = requireLoginForSave();
  if (!userId) return;

  if (!confirm('정말로 이 메모를 삭제하시겠습니까?')) return;

  try {
    showToast('메모를 삭제하는 중입니다...');
    const response = await fetch(pdfApi.deleteMemo, {
      method: 'POST', // 💡 POST로 변경
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-User-Id': userId
      },
      body: JSON.stringify({ 
        id: memoId // 삭제할 메모의 ID 전송
      })
    });

    if (!response.ok) throw new Error(await response.text());

    showToast('학습 메모가 삭제되었습니다. 🗑️');
    await loadStudyMemos(); 
  } catch (error) {
    console.error(error);
    showToast('메모 삭제에 실패했습니다: ' + error.message, 'WARN');
  }
}

// 수정 폼 토글 헬퍼 함수
function toggleEditForm(memoId) {
  const displayDiv = document.getElementById(`memoDisplay-${memoId}`);
  const editDiv = document.getElementById(`memoEditForm-${memoId}`);
  
  if (editDiv.style.display === 'none') {
    editDiv.style.display = 'block';
    displayDiv.style.display = 'none';
  } else {
    editDiv.style.display = 'none';
    displayDiv.style.display = 'block';
  }
}

// 전역 스코프 바인딩
window.updateStudyMemo = updateStudyMemo;
window.deleteStudyMemo = deleteStudyMemo;
window.toggleEditForm = toggleEditForm;

// 💡 summaryId 파라미터 추가
function saveLocalMemo(content, summaryId) {
  const memos = getLocalMemos();
  memos.unshift({
    id: Date.now(),
    summaryId: summaryId ? Number(summaryId) : 0,// 타입을 맞춰서 저장
    memoContent: content,
    createdAt: new Date().toISOString()
  });
  safeSetItem(`codemind_memos_${getMemoUserId()}`, JSON.stringify(memos.slice(0, 30)));
}

function getLocalMemos() {
  try {
    const parsed = JSON.parse(safeGetItem(`codemind_memos_${getMemoUserId()}`) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function getMemoUserId() {
  if (typeof window.getCurrentUserId === 'function' && window.getCurrentUserId()) {
    return window.getCurrentUserId();
  }
  if (typeof window.currentUser !== 'undefined' && window.currentUser?.id) {
    return window.currentUser.id;
  }
  return 'guest';
}

function renderStudyMemos(memos) {
  const list = document.getElementById('studyMemoList');
  if (!list) return;

  let currentId = null;
  if (typeof window.getCurrentUserId === 'function') {
    currentId = window.getCurrentUserId();
  } else if (typeof window.currentUser !== 'undefined' && window.currentUser?.id) {
    currentId = window.currentUser.id;
  } else if (typeof currentUser !== 'undefined' && currentUser?.id) {
    currentId = currentUser.id;
  } else {
    currentId = sessionStorage.getItem("userId") || localStorage.getItem("userId");
  }

  if (!currentId || currentId === 'guest') {
    list.innerHTML = `
      <div style="text-align:center; padding:20px; color:var(--text3); font-size:13.5px;">
        로그인 후 학습 메모를 확인할 수 있습니다.
      </div>
    `;
    return;
  }
  
  // 🛑 0번 임시 아이디 데이터는 완벽히 거부하고 진짜 매핑된 데이터만 필터링
  const currentSummaryId = String(pdfState.summaryId || 0);
  const validMemos = (memos || []).filter(memo => {
    return memo && memo.summaryId !== 0 && memo.summaryId !== "0" && String(memo.summaryId) === currentSummaryId;
  });

  if (!validMemos || validMemos.length === 0) {
    list.textContent = '저장된 메모가 아직 없습니다.';
    return;
  }

  // 이제 임시저장 라벨링 없이 정상적인 리스트만 렌더링
  list.innerHTML = validMemos.map(memo => {
    const memoId = memo.id || memo.memoId; 
    
    return `
      <div class="memo-item" id="memoItem-${memoId}" style="margin-bottom: 12px; padding: 10px; border-bottom: 1px solid var(--border);">
        
        <div id="memoDisplay-${memoId}">
          <div class="memo-content" style="white-space: pre-wrap;">${escapePdfHtml(memo.memoContent || '')}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
            <span class="memo-date" style="font-size: 11px; color: var(--text3);">${formatMemoDate(memo.createdAt)}</span>
            <div class="memo-actions">
              <button class="btn-text" style="color: var(--text2); margin-right: 8px; cursor: pointer; background: none; border: none;" onclick="toggleEditForm(${memoId})">수정</button>
              <button class="btn-text" style="color: var(--accent-warn, #ff4d4f); cursor: pointer; background: none; border: none;" onclick="deleteStudyMemo(${memoId})">삭제</button>
            </div>
          </div>
        </div>

        <div id="memoEditForm-${memoId}" style="display: none; margin-top: 5px;">
          <textarea id="editMemoInput-${memoId}" style="width: 100%; min-height: 60px; padding: 6px; box-sizing: border-box; resize: vertical;">${escapePdfHtml(memo.memoContent || '')}</textarea>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 5px;">
            <button class="btn-secondary" style="font-size: 12px; padding: 4px 8px;" onclick="toggleEditForm(${memoId})">취소</button>
            <button class="btn-primary" style="font-size: 12px; padding: 4px 8px;" onclick="updateStudyMemo(${memoId})">저장</button>
          </div>
        </div>

      </div>
    `;
  }).join('');
}

function formatMemoDate(value) {
  if (!value) return '방금 전';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '방금 전';
  return date.toLocaleString();
}

function inferPdfSubject(text) {
  return scoreStudySubject(text);
}

function isAllowedPdfSubject(subject) {
  return allowedPdfSubjects.includes(subject);
}

function buildBlockedPdfSubjectMessage(subject) {
  if (subject === '네트워크' || subject === '데이터베이스') {
    return `${subject} 자료는 현재 업로드할 수 없습니다. 자료구조, 알고리즘, 운영체제 PDF만 사용할 수 있습니다.`;
  }
  return '현재는 자료구조, 알고리즘, 운영체제 PDF만 업로드할 수 있습니다.';
}

function scoreStudySubject(text) {
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
    ],
    '네트워크': [
      [/네트워크|TCP|UDP|DNS|HTTP|IP|패킷|프로토콜|라우팅|스위칭/i, 8]
    ],
    '데이터베이스': [
      [/데이터베이스|DB|SQL|정규화|인덱스|트랜잭션|관계형|키\s*제약/i, 8]
    ],
    '학습자료': [
      [/한국\s*문화|문화|역사|조선|고려|삼국|근대|현대|소설|문학|시대|사회|여성|어문\s*생활|어문|규합총서|전통|민속|풍속|정치|경제|종교|불교|유교|가족|의식주|음식|한글|훈민정음|예술|음악|미술|문헌|고전|작품|저자/i, 6]
    ]
  };

  const scores = Object.fromEntries(Object.keys(subjectRules).map(subject => [subject, 0]));
  Object.entries(subjectRules).forEach(([subject, rules]) => {
    rules.forEach(([pattern, weight]) => {
      const matches = source.match(pattern);
      if (matches) scores[subject] += weight * matches.length;
    });
  });

  const blockedBest = ['네트워크', '데이터베이스', '학습자료']
    .map(subject => [subject, scores[subject] || 0])
    .sort((a, b) => b[1] - a[1])[0];
  const allowedBest = allowedPdfSubjects
    .map(subject => [subject, scores[subject] || 0])
    .sort((a, b) => b[1] - a[1])[0];

  if (blockedBest && blockedBest[1] >= allowedBest[1] && blockedBest[1] > 0) return blockedBest[0];
  return allowedBest && allowedBest[1] >= 6 ? allowedBest[0] : '학습자료';
}

function buildPdfTodayString() {
  const today = new Date();
  return `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
}

function escapePdfHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function saveSummary(){
  const userId = requireLoginForSave();
  if (!userId) return; 

  if(!pdfState.summaryText || pdfState.summaryText.trim() === ""){
    showToast("먼저 요약을 생성하세요.", "WARN");
    return;
  }

  try{
    const data = {
      summary: pdfState.summaryText,
      visualPagesJson: JSON.stringify(pdfState.visualPages || []),
      visualSummary: pdfState.visualSummary || ""
    };

    const response = await fetch("/api/pdf/save-summary", {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": userId 
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error("서버 저장 실패");
    }

    // 🌟 백엔드가 이제 String 대신 SummaryNote 객체(JSON)를 주므로 정상 파싱 가능합니다.
    const result = await response.json().catch(() => null);

    if (result && (result.id || result.summaryId)) {
      // 서버가 발급해 준 진짜 고유 DB ID를 드디어 할당!
      pdfState.summaryId = result.id || result.summaryId;
      console.log("DB 최초 저장 완료! 고정된 요약 ID:", pdfState.summaryId);
    }
    
    showToast("요약본이 보관함에 최종 저장되었습니다! ✅");
    
    // 요약 저장이 완료되었으니, 이 ID에 종속된 서버 메모를 불러옵니다.
    await loadStudyMemos();
  }
  catch(error){
    console.error(error);
    showToast("요약 저장 실패: " + error.message, "WARN");
  }
}

async function saveGeneratedQuestion(question) {
  const userId = requireLoginForSave();
  if (!userId) return; 

  // 🛑 [가드 코드 추가] 요약이 먼저 저장되어야만 문제를 매핑할 수 있습니다.
  if (!pdfState.summaryId || pdfState.summaryId === 0 || pdfState.summaryId === "0") {
    console.log("요약본이 아직 저장되지 않아 문제 자동 저장을 대기합니다.");
    return; // 사용자가 '요약 저장'을 누를 때 문제도 같이 가므로 여기서 먼저 보낼 필요 없음
  }

  try {
    const response = await fetch(pdfApi.saveQuestion, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "X-User-Id": userId
      },
      body: JSON.stringify({
        summaryId: String(pdfState.summaryId),
        question: question.question,
        answer: question.keyword,
        questionType: "blank"
      })
    });

    if (!response.ok) throw new Error(await response.text());
    showToast("문제가 DB에 저장되었습니다 ✅");
  } catch(error) {
    console.error(error);
  }
}

async function saveFeedbackLog() {
  const userId = requireLoginForSave();
  if(!userId) return;

  if (!pdfState.reverseQuestion) {
    showToast("먼저 AI 역질문을 생성하세요.", "WARN");
    return;
  }

  const answer = document.getElementById("reverseAnswerInput").value.trim();
  const feedbackBox = document.getElementById("reverseEvalArea");
  const feedback = feedbackBox.innerText.trim();

  if (!answer) {
    showToast("답변을 먼저 입력하세요.", "WARN");
    return;
  }

  if (!feedback) {
    showToast("먼저 설명 평가를 받으세요.", "WARN");
    return;
  }

  try {
    const response = await fetch("/api/pdf/reverse-log", {
      method: 'POST',
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "X-User-Id": userId
      },
      body: JSON.stringify({
        summaryId: String(pdfState.summaryId||0),
        reverseQuestion: pdfState.reverseQuestion,
        userAnswer: answer,
        aiFeedback: feedback
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    showToast("AI 피드백 저장 완료 ✅");

  } catch (error) {
    console.error(error);
    showToast("저장 실패 ❌", "WARN");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadStudyMemos();
});

window.loadStudyMemos = loadStudyMemos;