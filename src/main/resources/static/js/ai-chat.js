const aiChatApi = {
  chat: '/api/ai/chat'
};

const localAiResponses = {
  '재귀': '재귀는 함수가 자기 자신을 호출해 큰 문제를 더 작은 문제로 나누는 기법입니다. 반드시 재귀를 멈추는 기저 조건이 필요합니다.',
  '스택': '스택은 LIFO 구조입니다. 마지막에 들어온 데이터가 가장 먼저 나가며 함수 호출, 괄호 검사, DFS 등에 사용됩니다.',
  '큐': '큐는 FIFO 구조입니다. 먼저 들어온 데이터가 먼저 나가며 BFS, 작업 대기열, 스케줄링 등에 사용됩니다.',
  '빅오': '빅오 표기법은 입력 크기가 커질 때 알고리즘의 시간 또는 공간 사용량이 어떻게 증가하는지 표현합니다.',
  'TCP': 'TCP는 연결 지향형으로 신뢰성과 순서를 보장합니다. UDP는 비연결형으로 빠르지만 순서와 재전송을 보장하지 않습니다.',
  '운영체제': '운영체제는 프로세스, 스레드, 스케줄링, 메모리, 파일 시스템 같은 자원을 관리합니다.',
  'default': '좋은 질문이에요. PDF 요약이나 오답노트 문맥이 있으면 그 내용을 바탕으로 더 구체적으로 설명할 수 있습니다.'
};

function setTopic(topic) {
  const input = document.getElementById('chatInput');
  if (!input) return;
  input.value = `${topic}에 대해 설명해줘`;
  input.focus();
}

async function sendMsg() {
  const input = document.getElementById('chatInput');
  const msgs = document.getElementById('chatMsgs');
  if (!input || !msgs) return;

  const text = input.value.trim();
  if (!text) return;

  appendChatMessage('user', 'USER', text);
  input.value = '';
  msgs.scrollTop = msgs.scrollHeight;

  const loadingId = appendChatMessage('ai', 'AI', '답변을 생성하는 중입니다...');
  try {
    const answer = await requestAiChat(text);
    updateChatMessage(loadingId, formatAiResponse(answer));
  } catch (error) {
    console.warn('AI chat API failed. Falling back to local answer.', error);
    updateChatMessage(loadingId, formatAiResponse(getLocalAiResponse(text)));
  }

  msgs.scrollTop = msgs.scrollHeight;
}

async function requestAiChat(message) {
  const response = await fetch(aiChatApi.chat, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({ message, context: buildChatContext() })
  });

  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.answer || getLocalAiResponse(message);
}

function buildChatContext() {
  const chunks = [];
  if (typeof pdfState !== 'undefined') {
    if (pdfState.summaryText) chunks.push(pdfState.summaryText);
    if (pdfState.summaryItems && pdfState.summaryItems.length) chunks.push(pdfState.summaryItems.join(' '));
  }

  if (typeof window.getAppNotes === 'function') {
    const noteContext = window.getAppNotes()
      .slice(0, 3)
      .map(note => `${note.subject || ''} ${note.q || ''} ${note.correct || ''}`)
      .join(' ');
    if (noteContext.trim()) chunks.push(noteContext);
  }

  return chunks.join('\n');
}

function getLocalAiResponse(text) {
  for (const [keyword, answer] of Object.entries(localAiResponses)) {
    if (keyword !== 'default' && text.includes(keyword)) return answer;
  }
  return localAiResponses.default;
}

function appendChatMessage(role, avatar, content) {
  const msgs = document.getElementById('chatMsgs');
  if (!msgs) return '';

  const id = `chat-msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const bubbleContent = role === 'ai' ? formatAiResponse(content) : escapeChatHtml(content);
  msgs.insertAdjacentHTML('beforeend', `
    <div class="msg ${role}" id="${id}">
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-bubble">${bubbleContent}</div>
    </div>
  `);
  return id;
}

function updateChatMessage(id, htmlContent) {
  const message = document.getElementById(id);
  if (!message) return;
  const bubble = message.querySelector('.msg-bubble');
  if (bubble) bubble.innerHTML = htmlContent;
}

function formatAiResponse(text) {
  return escapeChatHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function escapeChatHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
