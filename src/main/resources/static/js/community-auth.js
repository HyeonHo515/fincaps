const AUTH_API_URL = "http://localhost:8080/api/auth";

let currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;

function updateAuthUI() {
  const navRight = document.querySelector(".nav-right");

  if (!currentUser) {
    navRight.innerHTML = `<button class="btn-login" onclick="openLogin()">로그인</button>`;
    return;
  }

  navRight.innerHTML = `
    <button
    class="btn-outline"
    style="
      padding:8px 14px;
      font-size:13px;
      margin-right:8px;
    "
    onclick="showPage('mypage')"
  >
    👤 마이페이지
  </button>
    <span style="font-size:13px; color:var(--text2);">${escapeHtml(currentUser.name)}님</span>
    <button class="btn-login" onclick="logout()">로그아웃</button>
  `;
}

function showLoginForm() {
  document.getElementById("auth-desc").textContent = "로그인하세요";
  document.getElementById("login-form").style.display = "flex";
  document.getElementById("register-form").style.display = "none";

  document.getElementById("login-id").value = "";
  document.getElementById("login-password").value = "";
}

function showRegisterForm() {
  document.getElementById("auth-desc").textContent = "회원가입하세요";
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-form").style.display = "flex";

  document.getElementById("register-login-id").value = "";
  document.getElementById("register-name").value = "";
  document.getElementById("register-email").value = "";
  document.getElementById("register-password").value = "";
}

function openLogin() {
  showLoginForm();
  document.getElementById('loginModal').classList.add('open');
}

const loginModal = document.getElementById('loginModal');

if (loginModal) {
  loginModal.addEventListener('click', e => {
    if (e.target === loginModal) {
      loginModal.classList.remove('open');
    }
  });
}

async function doRegister() {
  const loginId = document.getElementById("register-login-id").value.trim();
  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value.trim();

  if (!loginId || !name || !email || !password) {
    showToast("아이디, 이름, 이메일, 비밀번호를 모두 입력해주세요.", "⚠️");
    return;
  }

  try {
    const response = await fetch(`${AUTH_API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        loginId: loginId,
        name: name,
        email: email,
        password: password
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message);
    }

    showToast("회원가입이 완료되었습니다. 로그인해주세요.", "✅");
    showLoginForm();

  } catch (error) {
    console.error(error);
    showToast(error.message || "회원가입 실패", "❌");
  }
}

async function doLogin() {
  const loginId = document.getElementById("login-id").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!loginId || !password) {
    showToast("아이디와 비밀번호를 입력해주세요.", "⚠️");
    return;
  }

  try {
    const response = await fetch(`${AUTH_API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        loginId: loginId,
        password: password
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message);
    }

    const user = await response.json();

    currentUser = {
      id: user.userId,
      email: user.email,
      name: user.name
    };

    localStorage.setItem("currentUser", JSON.stringify(currentUser));

    document.getElementById('loginModal').classList.remove('open');

    updateAuthUI();
    await loadChatRooms();
    if (typeof loadNotesFromApi === 'function') {
      await loadNotesFromApi(); 
    }
    if (typeof loadStudyMemos === 'function') {
      await loadStudyMemos();
    }
    showToast(`${currentUser.name}님 로그인되었습니다.`, "🎉");

  } catch (error) {
    console.error(error);
    showToast(error.message || "로그인 실패", "❌");
  }
}

function logout() {

  currentUser = null;
  localStorage.removeItem("currentUser");

  chatRooms = [];
  currentRoomId = null;
  currentChannelId = null;
  currentDmTargetId = null;
  currentDmTargetName = null;
  currentChatType = "channel";

  document.getElementById('chat-room-view').style.display = 'none';
  document.getElementById('chat-list-view').style.display = 'block';
  if (typeof notes !== 'undefined' && Array.isArray(notes)) {
    notes.length = 0; // 전역 오답노트 배열 비우기
  }
  
  if (typeof renderNotes === 'function') {
    renderNotes(); // 로그인 체크 후 "로그인 후 확인할 수 있습니다" 문구 출력 유도
  }
  
  if (typeof renderStudyMemos === 'function') {
    renderStudyMemos([]); // 빈 배열을 전달하여 메모장 초기화 혹은 안내문구 출력 유도
  }

  updateAuthUI();
  loadChatRooms();

  if (window.currentPage === 'mypage') {
    if (typeof showPage === 'function') {
      showPage('home'); // 만약 홈화면 ID가 'home'이 아니면 'main' 등으로 변경
    }
  }

  showToast("로그아웃되었습니다.", "👋");
}