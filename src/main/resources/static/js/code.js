// 1. PDF 업로드
document.getElementById('pdfUpload')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file && file.type === 'application/pdf') {
    const fileURL = URL.createObjectURL(file);
    document.getElementById('pdfViewer').src = fileURL;
    document.getElementById('pdfPlaceholder').style.display = 'none';
    document.getElementById('pdfViewer').style.display = 'block';
    if (typeof showToast === 'function') showToast('PDF 로드 완료', '📄');
  }
});

// ==========================================
// 🌟 Ace Editor 초기화 (VS Code 스타일)
// ==========================================
let editor = null;
const codeEditorElement = document.getElementById('codeEditor');

// 랜딩 페이지 등 에디터가 없는 화면에서는 에러가 나지 않도록 방어 코드 추가
if (codeEditorElement) {
  editor = ace.edit("codeEditor");
  editor.setTheme("ace/theme/tomorrow_night"); // 어두운 테마
  editor.setOptions({
    fontSize: "14px",
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    showPrintMargin: false,
  });

  // 에디터에서 타자를 칠 때 실시간 시각화 디버거와 코드 동기화
  editor.session.on('change', function() {
    currentUserCode = editor.getValue();
    updateTrackerUI();
  });
}

// 3. Judge0 API 실행 (한글 입출력 Base64 인코딩 적용)
// 3. 코드 실행 (Judge0 컴파일 + 자체 백엔드 시각화 독립 병렬 처리)
async function runCodeWithJudge0() {
  if (!editor) {
    alert("에디터를 찾을 수 없습니다.");
    return;
  }
  
  const code = editor.getValue();
  const langElem = document.getElementById('languageSelect') || document.getElementById('langSelect');
  const langId = langElem ? langElem.value : "71";
  const customInput = document.getElementById('customInput')?.value || ""; 
  const out = document.getElementById('editorOutput');
  
  if (!code.trim()) { 
    if (typeof showToast === 'function') showToast('코드를 입력하세요.', '⚠️'); 
    else alert('코드를 입력하세요.');
    return; 
  }
  
  // 실행 시작 시 로딩 메시지
  out.innerHTML = '<div class="output-line info">컴파일 및 디버깅 분석 중... 🚀</div>';

  const encodeBase64 = (str) => btoa(unescape(encodeURIComponent(str)));
  const decodeBase64 = (str) => {
    if (!str) return "";
    return decodeURIComponent(escape(atob(str)));
  };

  try {
    // 🚀 [트랙 1] Judge0 API 호출 (일반 컴파일 및 터미널 출력용)
    const judge0Promise = fetch('http://localhost:8080/api/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        language_id: parseInt(langId), 
        source_code: encodeBase64(code),
        stdin: encodeBase64(customInput) 
      })
    }).then(res => res.json());

    // 🚀 [트랙 2] 자바 백엔드 디버거 호출 (시각화 UI용)
    const tracerPromise = fetch('http://localhost:8080/api/trace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        source_code: code,
        stdin: customInput,
        language_id: langId 
      })
    }).then(res => res.json()).catch(err => {
      console.warn("디버깅 서버 연결 실패", err);
      return null;
    });

    // ==========================================
    // ✅ 1. 왼쪽 하단 터미널 처리 (Judge0) : 데이터 오자마자 바로 그림!
    // ==========================================
    judge0Promise.then(judge0Result => {
      let outputText = "";
      if (judge0Result.compile_output) {
        outputText = `<div class="output-line err">${decodeBase64(judge0Result.compile_output).replace(/\n/g, '<br>')}</div>`;
      } else if (judge0Result.stderr) {
        outputText = `<div class="output-line err">${decodeBase64(judge0Result.stderr).replace(/\n/g, '<br>')}</div>`;
      } else if (judge0Result.stdout !== null) {
        outputText = `<div class="output-line">${decodeBase64(judge0Result.stdout).replace(/\n/g, '<br>')}</div>`;
      } else {
        outputText = `<div class="output-line info">실행 완료 (출력 없음)</div>`;
      }
      out.innerHTML = outputText; // "분석 중..." 글자를 지우고 실제 결과로 덮어쓰기!
    }).catch(err => {
      out.innerHTML = `<div class="output-line err">❌ 컴파일 서버 통신 실패</div>`;
    });

    // ==========================================
    // ✅ 2. 우측 시각화 패널 처리 (Tracer) : 독자적으로 그림!
    // ==========================================
    tracerPromise.then(tracerResult => {
      if (tracerResult) {
        if (tracerResult.frames) {
          // 파이썬, JS 정상 처리
          debugFrames = tracerResult.frames;
          currentStep = 0;
          updateTrackerUI();
        } else if (tracerResult.trace) {
          
          // 🌟 핵심: C/C++ 클라우드 과부하 발생 시 우측 디버깅 패널에만 안내창 띄우기
          if (tracerResult.trace.length > 0 && tracerResult.trace[0].event === 'uncaught_exception') {
            document.getElementById('trackerCodeDisplay').innerHTML = 
                // 👇 바로 이 div의 style 부분에 white-space: normal, word-break: keep-all, line-height: 1.6을 추가했습니다!
                `<div style="color: var(--accent4); padding: 20px; text-align: center; background: rgba(255, 100, 100, 0.1); border-radius: 8px; white-space: normal; word-break: keep-all; line-height: 1.6;">
                    <b style="font-size: 16px;">⚠️ 클라우드 시각화 엔진 지연</b><br><br>
                    현재 C/C++ 메모리 분석 서버(Valgrind)의 트래픽 과부하로 인해<br>해당 언어의 시각화 추적이 일시적으로 제한되었습니다.<br><br>
                    <span style="color: var(--text2); font-size: 13px;">(좌측 하단 터미널에서 기본 컴파일 및 실행 결과는 정상 확인 가능합니다.)</span>
                 </div>`;
            document.getElementById('stepCounter').innerText = "Step 0 / 0";
            document.getElementById('trackerMemoryDisplay').innerHTML = `<span style="color: var(--text2); font-size: 13px;">데이터 없음</span>`;
            debugFrames = [];
            return; // 여기서 멈춤
          }

          // 정상 C, C++, Java 데이터 처리
          debugFrames = tracerResult.trace.map((t, idx) => {
            let v = {};
            if (t.stack_to_render && t.stack_to_render.length > 0) {
              let locals = t.stack_to_render[0].encoded_locals || {};
              for (let k in locals) {
                v[k] = typeof locals[k] === 'object' ? JSON.stringify(locals[k]) : String(locals[k]);
              }
            }
            return { step: idx, line: t.line, vars: v };
          });
          currentStep = 0;
          updateTrackerUI();
        } else {
          debugFrames = []; updateTrackerUI();
        }
      } else {
        debugFrames = []; updateTrackerUI();
      }
    });

  } catch (error) {
    console.error("시스템 내부 오류:", error);
  }
}
// ==========================================
// 🔍 시각화 디버거 실시간 동기화 로직
// ==========================================

let currentStep = 0;
let debugFrames = []; 
let currentUserCode = "";

// C, C++ 언어 데이터 포함
// 🌟 1. 시각화 프레임(목업) 삭제하고 뼈대 코드만 남김
// 🌟 언어별 필수 실행 뼈대(Boilerplate) 세팅
const mockDataByLanguage = {
  "71": { // Python: 필수 뼈대가 없으므로 주석만 제공
    code: "# 코드를 작성하세요\n"
  },
  "63": { // JavaScript: 필수 뼈대가 없으므로 주석만 제공
    code: "// 코드를 작성하세요\n"
  },
  "62": { // Java: 클래스와 main 메서드 필수
    code: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // 코드를 작성하세요\n        \n    }\n}"
  },
  "50": { // C: stdio.h와 main 함수 필수
    code: "#include <stdio.h>\n\nint main() {\n    // 코드를 작성하세요\n    \n    return 0;\n}"
  },
  "54": { // C++: iostream, namespace, main 함수 필수
    code: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // 코드를 작성하세요\n    \n    return 0;\n}"
  }
};

const languageSelect = document.getElementById('languageSelect');
const trackerCodeDisplay = document.getElementById('trackerCodeDisplay');
const trackerMemoryDisplay = document.getElementById('trackerMemoryDisplay');
const stepCounter = document.getElementById('stepCounter');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnReset = document.getElementById('btnReset');

// 🌟 언어 변경 시 실행될 함수 (에디터 문법 모드 변경 포함)
// 🌟 2. 언어 변경 시 디버거 초기화 로직 수정
function syncLanguageData(langId) {
  const langData = mockDataByLanguage[langId];
  if (langData && editor) {
    editor.setValue(langData.code, -1); // 에디터 코드 뼈대로 덮어쓰기
    currentUserCode = langData.code;

    const customInputElem = document.getElementById('customInput');
    if (customInputElem) {
      customInputElem.value = ""; 
    }
    
    // 👇 핵심: 가짜 데이터(langData.frames)를 넣지 않고 빈 배열로 비워둡니다!
    debugFrames = []; 
    currentStep = 0;
    updateTrackerUI();

    // 언어에 맞게 에디터 색상 및 문법 강조 변경
    if (langId === "71") editor.session.setMode("ace/mode/python");
    else if (langId === "63") editor.session.setMode("ace/mode/javascript");
    else if (langId === "62") editor.session.setMode("ace/mode/java");
    else if (langId === "50" || langId === "54") editor.session.setMode("ace/mode/c_cpp");
  }
}

languageSelect?.addEventListener('change', (e) => {
  syncLanguageData(e.target.value);
});

// 화면 렌더링 함수
function updateTrackerUI() {
  const totalSteps = debugFrames.length;
  const currentFrame = totalSteps > 0 ? debugFrames[currentStep] : null;

  if(btnPrev) btnPrev.disabled = currentStep === 0 || totalSteps === 0;
  if(btnNext) btnNext.disabled = currentStep >= totalSteps - 1 || totalSteps === 0;
  if(stepCounter) stepCounter.textContent = totalSteps > 0 ? `Step ${currentStep + 1} / ${totalSteps}` : `Step 0 / 0`;

  const lines = currentUserCode.split('\n');
  let codeHTML = '';
  lines.forEach((lineText, index) => {
    const lineNumber = index + 1;
    const isHighlighted = currentFrame && currentFrame.line === lineNumber;
    
    const bgColor = isHighlighted ? 'rgba(246, 173, 85, 0.2)' : 'transparent';
    const borderColor = isHighlighted ? '#f6ad55' : 'transparent';
    const textColor = isHighlighted ? '#fff' : 'var(--text)';

    codeHTML += `<div style="display: flex; background-color: ${bgColor}; border-left: 3px solid ${borderColor}; padding-left: 8px; min-width: max-content;"><span style="color: var(--text2); width: 24px; text-align: right; margin-right: 10px; user-select: none;">${lineNumber}</span><span style="color: ${textColor};">${lineText}</span></div>`;
  });
  
  if(trackerCodeDisplay) trackerCodeDisplay.innerHTML = codeHTML || "코드를 입력하세요.";

  if (currentFrame && Object.keys(currentFrame.vars).length > 0) {
    let memoryHTML = '';
    for (const [varName, varValue] of Object.entries(currentFrame.vars)) {
      memoryHTML += `
        <div style="display: flex; justify-content: space-between; background: var(--bg3); padding: 8px; border-radius: 6px; border-left: 3px solid var(--accent);">
          <span style="font-family: var(--font-mono); color: #7ee8a2; font-size: 13px;">${varName}</span>
          <span style="font-family: var(--font-mono); font-weight: bold; font-size: 13px;">${varValue}</span>
        </div>
      `;
    }
    if(trackerMemoryDisplay) trackerMemoryDisplay.innerHTML = memoryHTML;
  } else {
    if(trackerMemoryDisplay) trackerMemoryDisplay.innerHTML = `<span style="color: var(--text2); font-size: 13px;">데이터 없음</span>`;
  }
}

btnPrev?.addEventListener('click', () => { if (currentStep > 0) { currentStep--; updateTrackerUI(); } });
btnNext?.addEventListener('click', () => { if (currentStep < debugFrames.length - 1) { currentStep++; updateTrackerUI(); } });
btnReset?.addEventListener('click', () => { currentStep = 0; updateTrackerUI(); });

// 페이지 최초 로드 시 설정
document.addEventListener('DOMContentLoaded', () => {
  if (languageSelect && editor) {
    languageSelect.value = "71"; 
    syncLanguageData("71");      
  }
});