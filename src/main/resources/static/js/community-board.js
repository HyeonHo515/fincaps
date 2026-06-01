let posts = [];
let editingPostId = null;

async function loadPosts() {

  const response = await fetch("http://localhost:8080/api/community/posts");

  posts = await response.json();

  renderBoard();
}

function openWriteModal() {

  if (!currentUser) {
    showToast("로그인이 필요합니다.", "🔐");
    openLogin();
    return;
  }

  document.getElementById('write-title').value = '';
  document.getElementById('write-content').value = '';
  document.getElementById('write-category').value = 'exam';

  const fileInput = document.getElementById('write-file');
  if (fileInput) fileInput.value = '';

  document.getElementById('writeModal').classList.add('open');
}

const writeModal = document.getElementById('writeModal');

if (writeModal) {
  writeModal.addEventListener('click', e => {
    if (e.target === writeModal) {
      writeModal.classList.remove('open');
    }
  });
}

async function submitPost() {
  const title = document.getElementById('write-title').value.trim();
  const content = document.getElementById('write-content').value.trim();
  const category = document.getElementById('write-category').value;
  const fileInput = document.getElementById('write-file');

  if (!title || !content) {
    showToast("제목과 내용을 입력해주세요.", "⚠️");
    return;
  }

  try {
    const isEdit = editingPostId !== null;

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    formData.append("category", category);
    
    if (!isEdit) {
      formData.append("authorId", currentUser.id);
    }

    if (fileInput && fileInput.files.length > 0) {
      formData.append("file", fileInput.files[0]);
    }

    const url = isEdit
      ? `http://localhost:8080/api/community/posts/${editingPostId}?userId=${currentUser.id}`
      : "http://localhost:8080/api/community/posts";

    const method = isEdit ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      body: formData
    });

    if (!response.ok) {
      throw new Error(isEdit ? "게시글 수정 실패" : "게시글 등록 실패");
    }

    const savedPost = await response.json();

    if (isEdit) {
      const index = posts.findIndex(p => Number(p.id) === Number(editingPostId));
      posts[index] = savedPost;
      showToast("게시글 수정 완료", "✏️");
      editingPostId = null;
      viewPostDetail(savedPost.id);
    } else {
      posts.unshift(savedPost);
      showToast("게시글이 등록되었습니다!", "✍️");
      renderBoard();
    }

    document.getElementById('writeModal').classList.remove('open');

  } catch (error) {
    console.error(error);
    showToast(editingPostId !== null ? "게시글 수정 실패" : "게시글 등록 실패", "❌");
  }
}

function editPost(postId) {

  const post = posts.find(
    p => Number(p.id) === Number(postId)
  );

  if (!post) return;

  editingPostId = postId;

  document.getElementById('write-title').value =
    post.title;

  document.getElementById('write-content').value =
    post.content;

  document.getElementById('write-category').value =
    post.category || 'exam';

  document.getElementById('writeModal')
    .classList.add('open');
}

async function deletePost(postId) {

  const ok = confirm("게시글을 삭제하시겠습니까?");
  if (!ok) return;

  try {

    const response = await fetch(
      `http://localhost:8080/api/community/posts/${postId}?userId=${currentUser.id}`,
      {
        method: "DELETE"
      }
    );

    if (!response.ok) {
      throw new Error("게시글 삭제 실패");
    }

    posts = posts.filter(
      p => Number(p.id) !== Number(postId)
    );

    showToast("게시글 삭제 완료", "🗑");

    hideDetail();
    renderBoard();

  } catch (error) {

    console.error(error);
    showToast("게시글 삭제 실패", "❌");
  }
}

let currentFilter = 'all';

function searchPosts() {
  renderBoard(currentFilter);
}

function renderBoard(filter = 'all') {

  currentFilter = filter;

  const list = document.getElementById('postList');

  const keyword =
    document.getElementById('searchInput')
      ?.value
      .trim()
      .toLowerCase() || '';

  let filtered =
    filter === 'all'
      ? posts
      : posts.filter(
          p => p.category === filter
        );

  if (keyword) {
    filtered = filtered.filter(
      p => p.title.toLowerCase().includes(keyword)
    );
  }

  const catNames = {
    exam: '족보공유',
    qna: '질문답변',
    career: '진로취업'
  };

  list.innerHTML = filtered.map(p => `
    <div class="post-item" onclick="viewPostDetail(${p.id})">
      <div class="post-stats">
        <div class="stat-val">${p.likes}</div>
        <div class="stat-label">추천</div>
      </div>

      <div class="post-main">
        <div class="post-title">
          <span class="post-badge">
            ${catNames[p.category]}
          </span>
          ${p.title}
        </div>

        <div class="post-info">
          <span>👤 ${p.author}</span>
          <span>📅 ${p.date}</span>
          <span>👁️ ${p.views}</span>
        </div>
      </div>

      ${
        p.fileName
          ? `<div class="file-badge"
              style="
                background:var(--surface);
                border:1px solid var(--border);
                padding:2px 8px;
                border-radius:4px;
                font-size:12px;
                color:var(--accent);
              ">
                💾 족보 포함
            </div>`
          : ''
      }
    </div>
  `).join('');
}

function filterBoard(val, el) {

  currentFilter = val;

  document.querySelectorAll('.btab')
    .forEach(b => b.classList.remove('active'));

  el.classList.add('active');

  renderBoard(val);
}

async function viewPostDetail(id) {
  const post = posts.find(p => Number(p.id) === Number(id));
  if (!post) {
    console.log("게시글을 찾지 못했습니다.", id, posts);
    return;
  }

  try {
    await fetch(`http://localhost:8080/api/community/posts/${id}/view`, {
      method: "POST"
    });
    post.views = (post.views || 0) + 1;
  } catch (error) {
    console.error("조회수 증가 API 호출 실패:", error);
  }

  document.getElementById('board-list-view').style.display = 'none';
  document.getElementById('board-detail-view').style.display = 'block';

  document.getElementById('detail-content').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px;">
      <div>
        ${(() => {
          const categoryNames = {
            exam: '📂 시험/과제 족보',
            qna: '❓ 질문/답변',
            career: '🚀 진로/취업'
          };

          return `
            <span class="post-badge" style="margin-bottom:12px;">
              ${categoryNames[post.category] || '❓ 질문/답변'}
            </span>
          `;
        })()}

        <h2 style="font-size:26px; font-weight:800; color:var(--text);">
          ${post.title}
        </h2>
      </div>
      <div style="text-align:right;">
        <div style="font-size:14px; font-weight:700; color:var(--accent2);">${post.author}</div>
        <div style="font-size:12px; color:var(--text3);">${post.date}</div>
      </div>
    </div>
    <p style="font-size:15px; line-height:1.8; color:var(--text2); margin-bottom:24px; white-space:pre-wrap;">${post.content}</p>

    <div style="display:flex; gap:12px; margin-bottom:32px;">
      <button class="btn-outline"
        style="padding:10px 18px; font-size:13px;"
        onclick="likePost(${post.id})">
        👍 추천 ${post.likes || 0}
      </button>

      <button class="btn-outline"
        style="padding:10px 18px; font-size:13px; border-color:rgba(252,129,129,0.3); color:var(--accent4);"
        onclick="reportPost(${post.id})">
        🚨 신고
      </button>

      ${
        currentUser && currentUser.id === post.authorId
          ? `
            <button class="btn-outline"
              style="padding:10px 18px; font-size:13px;"
              onclick="editPost(${post.id})">
              ✏️ 수정
            </button>

            <button class="btn-outline"
              style="padding:10px 18px; font-size:13px; color:red;"
              onclick="deletePost(${post.id})">
              🗑 삭제
            </button>
          `
          : ''
      }
    </div>
    
    ${post.fileName ? `
      <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:24px;">📄</span>
          <div>
            <div style="font-size:14px; font-weight:600; color:var(--text);">${post.fileName}</div>
            <div style="font-size:11px; color:var(--text3);">첨부파일이 등록된 게시글입니다.</div>
          </div>
        </div>
        <button class="btn-primary" style="padding:8px 16px; font-size:13px;" onclick="downloadRealFile(${post.id}, '${post.fileName}')">다운로드</button>
      </div>
    ` : ''}
  `;

  const comments = post.comments || [];

  document.getElementById('comment-count').textContent = comments.length;
  document.getElementById('comment-list').innerHTML = comments.length ? comments.map(c => `
    <div style="background:var(--surface); padding:16px; border-radius:12px; border-left:3px solid ${c.isSecret ? 'var(--accent4)' : 'var(--accent)'};">
      <div style="display:flex; align-items:center; margin-bottom:10px; width:100%;">
        <div class="left-group" style="display:flex; align-items:center;">
          <span style="font-size:13px; font-weight:700; color:var(--text2);">
            ${c.author} ${c.isSecret ? '🔒' : ''}
          </span>
        </div>

        <div class="right-group" style="display:flex; align-items:center; gap:8px; margin-left: auto;">
          <span style="font-size:11px; color:var(--text3); margin-right: 4px;">
            ${c.date}
          </span>

          ${
            currentUser && currentUser.id === c.authorId
              ? `
                <span style="color:var(--text3); font-size:11px;">|</span>
                <button onclick="editComment(${post.id}, ${c.id})" style="background:none; border:none; color:var(--text3); font-size:12px; cursor:pointer; padding:0 2px;">
                  수정
                </button>
                <span style="color:var(--text3); font-size:11px;">|</span>
                <button onclick="deleteComment(${post.id}, ${c.id})" style="background:none; border:none; color:var(--accent4); font-size:12px; cursor:pointer; padding:0 2px;">
                  삭제
                </button>
              `
              : ''
          }
        </div>
      </div>

      <div id="comment-content-${c.id}">
        <p style="
          font-size:14px;
          color:${c.isSecret ? 'var(--text3)' : 'var(--text)'};
          font-style:${c.isSecret ? 'italic' : 'normal'};
        ">
          ${
            c.isSecret
              ? '비밀 댓글입니다. 작성자와 게시글 주인만 볼 수 있습니다.'
              : c.text
          }
        </p>
      </div>
    </div>
  `).join('') : '<div style="color:var(--text3); font-size:14px; text-align:center; padding:20px;">첫 댓글을 남겨보세요!</div>';

  document.getElementById('comment-list').innerHTML += `
    <div style="margin-top:20px; display:flex; flex-direction:column; gap:12px;">
      <textarea id="comment-input"
        placeholder="댓글을 입력하세요"
        rows="3"
        style="padding:12px; background:var(--surface); border:1px solid var(--border); border-radius:8px; color:var(--text); resize:none;"></textarea>

      <div style="display:flex; justify-content:flex-end;">
        <button class="btn-primary" style="padding:8px 18px; font-size:13px;"
          onclick="submitComment(${post.id})">
          댓글 등록
        </button>
      </div>
    </div>
  `;
}

async function submitComment(postId) {
  if (!currentUser) {
    showToast("로그인이 필요합니다.", "🔐");
    openLogin();
    return;
  }

  const input = document.getElementById('comment-input');
  const text = input.value.trim();

  if (!text) {
    showToast("댓글 내용을 입력해주세요.", "⚠️");
    return;
  }

  try {
    const response = await fetch("http://localhost:8080/api/community/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        postId: postId,
        authorId: currentUser.id,
        content: text
      })
    });

    if (!response.ok) {
      throw new Error("댓글 등록 실패");
    }

    const savedComment = await response.json();

    const post = posts.find(p => Number(p.id) === Number(postId));
    if (!post.comments) post.comments = [];
    post.comments.push(savedComment);

    showToast("댓글이 등록되었습니다.", "💬");
    viewPostDetail(postId);

  } catch (error) {
    console.error(error);
    showToast("댓글 등록 실패", "❌");
  }
}

function editComment(postId, commentId) {

  const post = posts.find(
    p => Number(p.id) === Number(postId)
  );

  const comment = post.comments.find(
    c => Number(c.id) === Number(commentId)
  );

  const container =
    document.getElementById(
      `comment-content-${commentId}`
    );

  container.innerHTML = `
    <textarea
      id="edit-comment-${commentId}"
      style="
        width:100%;
        min-height:90px;
        padding:12px;
        background:var(--surface);
        border:1px solid var(--border);
        border-radius:8px;
        color:var(--text);
        resize:none;
        font-size:14px;
      "
    >${comment.text}</textarea>

    <div style="
      display:flex;
      justify-content:flex-end;
      gap:8px;
      margin-top:10px;
    ">

      <button
        class="btn-outline"
        onclick="cancelEditComment(${postId}, ${commentId})"
      >
        취소
      </button>

      <button
        class="btn-primary"
        onclick="saveComment(${postId}, ${commentId})"
      >
        저장
      </button>

    </div>
  `;
}

async function saveComment(
  postId,
  commentId
) {

  const textarea =
    document.getElementById(
      `edit-comment-${commentId}`
    );

  const newText =
    textarea.value.trim();

  if (!newText) {
    showToast(
      "댓글 내용을 입력해주세요.",
      "⚠️"
    );
    return;
  }

  try {

    const response = await fetch(
      `http://localhost:8080/api/community/comments/${commentId}?userId=${currentUser.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          content: newText
        })
      }
    );

    if (!response.ok) {
      throw new Error(
        "댓글 수정 실패"
      );
    }

    const updatedComment =
      await response.json();

    const post = posts.find(
      p => Number(p.id) === Number(postId)
    );

    const index =
      post.comments.findIndex(
        c =>
          Number(c.id) ===
          Number(commentId)
      );

    post.comments[index] =
      updatedComment;

    showToast(
      "댓글 수정 완료",
      "✏️"
    );

    viewPostDetail(postId);

  } catch (error) {

    console.error(error);

    showToast(
      "댓글 수정 실패",
      "❌"
    );
  }
}

function cancelEditComment(
  postId,
  commentId
) {
  viewPostDetail(postId);
}

async function deleteComment(postId, commentId) {

  const ok = confirm("댓글을 삭제하시겠습니까?");
  if (!ok) return;

  try {

    const response = await fetch(
      `http://localhost:8080/api/community/comments/${commentId}?userId=${currentUser.id}`,
      {
        method: "DELETE"
      }
    );

    if (!response.ok) {
      throw new Error("댓글 삭제 실패");
    }

    const post = posts.find(
      p => Number(p.id) === Number(postId)
    );

    post.comments = post.comments.filter(
      c => Number(c.id) !== Number(commentId)
    );

    showToast("댓글 삭제 완료", "🗑");

    viewPostDetail(postId);

  } catch (error) {

    console.error(error);
    showToast("댓글 삭제 실패", "❌");
  }
}

function hideDetail() {
  document.getElementById('board-list-view').style.display = 'block';
  document.getElementById('board-detail-view').style.display = 'none';
}

function downloadRealFile(postId, fileName) {
  const downloadUrl = `http://localhost:8080/api/community/posts/${postId}/download`;
  
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast(fileName + ' 다운로드 요청!', '💾');
}

async function likePost(postId) {

  if (!currentUser) {
    showToast("로그인이 필요합니다.", "🔐");
    openLogin();
    return;
  }

  try {

    const response = await fetch(
      `http://localhost:8080/api/community/posts/${postId}/like?userId=${currentUser.id}`,
      {
        method: "POST"
      }
    );

    if (!response.ok) {

      const message = await response.text();
      throw new Error(message);
    }

    const updatedPost = await response.json();

    const index = posts.findIndex(
      p => Number(p.id) === Number(postId)
    );

    if (index !== -1) {
      posts[index] = updatedPost;
    }

    showToast("게시글을 추천했습니다.", "👍");

    viewPostDetail(postId);

  } catch (error) {

    console.error(error);

    showToast(
      error.message || "추천 실패",
      "❌"
    );
  }
}

async function reportPost(postId) {

  if (!currentUser) {
    showToast("로그인이 필요합니다.", "🔐");
    openLogin();
    return;
  }

  const input = prompt(
    `신고 사유를 선택하세요.

    1 = 스팸/광고
    2 = 욕설/비방
    3 = 부적절한 내용
    4 = 기타`
  );

  if (!input) return;

  let reason = "";

  switch (input.trim()) {

    case "1":
      reason = "SPAM";
      break;

    case "2":
      reason = "ABUSE";
      break;

    case "3":
      reason = "INAPPROPRIATE";
      break;

    case "4":
      reason = "ETC";
      break;

    default:
      showToast("올바른 번호를 입력해주세요.", "⚠️");
      return;
  }

  try {

    const response = await fetch(
      `http://localhost:8080/api/community/posts/${postId}/report?userId=${currentUser.id}&reason=${reason}`,
      {
        method: "POST"
      }
    );

    if (!response.ok) {

      const message = await response.text();

      throw new Error(message);
    }

    const updatedPost = await response.json();

    const index = posts.findIndex(
      p => Number(p.id) === Number(postId)
    );

    if (index !== -1) {
      posts[index] = updatedPost;
    }

    showToast("게시글이 신고되었습니다.", "🚨");

    viewPostDetail(postId);

  } catch (error) {

    console.error(error);

    showToast(
      error.message || "신고 실패",
      "❌"
    );
  }
}