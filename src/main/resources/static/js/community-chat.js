const API_BASE_URL = "http://localhost:8080/api/chat";

let chatRooms = [];
let currentRoomId = null;
let currentChannelId = null;
let currentChatType = "channel";
let currentDmTargetId = null;
let currentDmTargetName = null;

function normalizeRoom(room) {
  return {
    id: room.roomId,
    title: room.roomName,
    inviteCode: room.inviteCode,
    ownerId: room.ownerId,
    ownerName: room.ownerName,
    isHost: currentUser ? Number(room.ownerId) === Number(currentUser.id) : false,
    channels: [],
    dms: [],
    participants: currentUser ? [
      { id: currentUser.id, name: currentUser.name }
    ] : [],
    messages: {}
  };
}

function normalizeChannel(channel) {
  return {
    id: channel.channelId,
    roomId: channel.roomId,
    name: channel.channelName
  };
}

function normalizeMessage(message) {
  return {
    id: message.messageId,
    roomId: message.roomId,
    channelId: message.channelId,
    senderId: message.senderId,
    name: message.senderName,
    text: message.content,
    messageType: message.messageType,
    time: formatMessageTime(message.createdAt),
    isFile: message.messageType === 'FILE',
    fileName: message.fileName || message.content,
    fileUrl: message.fileUrl || `${API_BASE_URL}/files/${message.messageId}`
  };
}

async function loadChatRooms() {
  const list = document.getElementById('chatRoomList');
  if (!list) return;

  if (!currentUser) {
    chatRooms = [];
    list.innerHTML = `
      <div style="text-align:center; padding:40px; color:var(--text3);">
        로그인 후 채팅방을 확인할 수 있습니다.
      </div>
    `;
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/rooms?userId=${currentUser.id}`);

    if (!response.ok) {
      throw new Error(`채팅방 조회 실패: ${response.status}`);
    }

    const rooms = await response.json();
    chatRooms = rooms.map(normalizeRoom);

    if (chatRooms.length === 0) {
      list.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--text3);">
          현재 참가 중인 채팅방이 없습니다.
        </div>
      `;
      return;
    }

    list.innerHTML = chatRooms.map(room => `
      <div class="post-item" onclick="enterChatRoom(${room.id})">
        <div class="post-stats">
          <span style="font-size:24px;">💬</span>
        </div>
        <div class="post-main">
          <div class="post-title">${escapeHtml(room.title)}</div>
          <div class="post-info">
            <span>방장 ${escapeHtml(room.ownerName)}</span>
            <span>초대코드 ${escapeHtml(room.inviteCode)}</span>
          </div>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error(error);
    list.innerHTML = `
      <div style="text-align:center; padding:40px; color:var(--accent4);">
        채팅방 목록 조회 실패
      </div>
    `;
  }
}

function openJoinModal() {
  document.getElementById('join-code-input').value = '';
  document.getElementById('joinRoomModal').classList.add('open');
}

function openCreateModal() {
  document.getElementById('create-room-name').value = '';
  document.getElementById('createRoomModal').classList.add('open');
}

document.getElementById('joinRoomModal').addEventListener('click', e => {
  if (e.target === document.getElementById('joinRoomModal')) e.target.classList.remove('open');
});
document.getElementById('createRoomModal').addEventListener('click', e => {
  if (e.target === document.getElementById('createRoomModal')) e.target.classList.remove('open');
});

async function joinChatRoom() {
  if (!currentUser) {
    showToast("로그인이 필요합니다.", "🔐");
    openLogin();
    return;
  }
  const inviteCode = document.getElementById('join-code-input').value.trim().toUpperCase();

  if (!inviteCode) {
    showToast("초대 코드를 입력해주세요.", "⚠️");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/rooms/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inviteCode: inviteCode,
        userId: currentUser.id
      })
    });

    if (!response.ok) {
      throw new Error("채팅방 참가 실패");
    }

    const joinedRoom = await response.json();
    const normalizedRoom = normalizeRoom(joinedRoom);

    const exists = chatRooms.some(r => Number(r.id) === Number(normalizedRoom.id));
    if (!exists) {
      chatRooms.push(normalizedRoom);
    }

    document.getElementById('joinRoomModal').classList.remove('open');
    document.getElementById('join-code-input').value = '';

    showToast("채팅방에 참가했습니다!", "✅");

    await enterChatRoom(normalizedRoom.id);

  } catch (error) {
    console.error(error);
    showToast("초대 코드가 올바르지 않거나 참가할 수 없습니다.", "❌");
  }
}

async function createChatRoom() {
  if (!currentUser) {
    showToast("로그인이 필요합니다.", "🔐");
    openLogin();
    return;
  }
  const roomName = document.getElementById('create-room-name').value.trim();

  if (!roomName) {
    showToast("채팅방 이름을 입력해주세요.", "⚠️");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roomName: roomName,
        ownerId: currentUser.id
      })
    });

    if (!response.ok) {
      throw new Error("채팅방 생성 실패");
    }

    const newRoom = await response.json();
    const normalizedNewRoom = normalizeRoom(newRoom);

    chatRooms.push(normalizedNewRoom);

    document.getElementById('createRoomModal').classList.remove('open');
    document.getElementById('create-room-name').value = '';

    showToast(`방이 생성되었습니다! 초대코드: ${normalizedNewRoom.inviteCode}`, "✨");

    await enterChatRoom(normalizedNewRoom.id);

  } catch (error) {
    console.error(error);
    showToast("채팅방 생성 중 오류가 발생했습니다.", "❌");
  }
}

async function renderChatRoomList() {
  loadChatRooms();
}

async function enterChatRoom(roomId) {
  try {
    const targetRoomId = Number(roomId);
    currentRoomId = targetRoomId;

    let room = chatRooms.find(r => Number(r.id) === targetRoomId);

    if (!room) {
      const response = await fetch(`${API_BASE_URL}/rooms?userId=${currentUser.id}`);
      const rooms = await response.json();
      chatRooms = rooms.map(normalizeRoom);
      room = chatRooms.find(r => Number(r.id) === targetRoomId);
    }

    if (!room) {
      console.log("입장 실패 roomId:", roomId);
      console.log("현재 chatRooms:", chatRooms);
      showToast("채팅방을 찾을 수 없습니다.", "❌");
      return;
    }

    document.getElementById('chat-list-view').style.display = 'none';
    document.getElementById('chat-room-view').style.display = 'block';
    document.getElementById('current-room-title').textContent = room.title;

    document.getElementById('btn-add-channel').style.display = room.isHost ? 'block' : 'none';

    const copyBtn = document.getElementById('btn-copy-code');
    if (room.isHost) {
      copyBtn.style.display = 'flex';
      copyBtn.setAttribute('data-code', room.inviteCode);
    } else {
      copyBtn.style.display = 'none';
    }

    await loadChannels(room);

    renderSidebar(room);
    renderParticipantList(room);

    if (room.channels.length > 0) {
      await selectChannel(room.channels[0].id, room.channels[0].name, 'channel');
    } else {
      document.getElementById('current-channel-name').textContent = '# 채널 없음';
      document.getElementById('chat-messages').innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--text3);">
          이 채팅방에는 채널이 없습니다.
        </div>
      `;
    }

  } catch (error) {
    console.error("채팅방 입장 중 오류:", error);
    showToast("채팅방 입장 중 오류가 발생했습니다.", "❌");
  }
}

async function loadChannels(room) {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${room.id}/channels`);
    if (!response.ok) throw new Error(`채널 조회 실패: ${response.status}`);

    const data = await response.json();
    room.channels = data.map(normalizeChannel);
  } catch (error) {
    console.error(error);
    showToast("채널 목록을 불러오지 못했습니다.", "❌");
    room.channels = [];
  }
}

function copyInviteCode() {
  const code = document.getElementById('btn-copy-code').getAttribute('data-code');
  if (!code) return;

  navigator.clipboard.writeText(code).then(() => {
    showToast(`초대 코드가 복사되었습니다: ${code}`, "📋");
  }).catch(err => {
    console.error('클립보드 복사 실패:', err);
    showToast("복사에 실패했습니다.", "❌");
  });
}

function exitChatRoom() {
  document.getElementById('chat-room-view').style.display = 'none';
  document.getElementById('chat-list-view').style.display = 'block';
  currentRoomId = null;
  currentChannelId = null;
  loadChatRooms();
}

async function renderSidebar(room) {
  document.getElementById('channel-list').innerHTML = room.channels.map(c => `
    <div class="channel-item" id="nav-channel-${c.id}" onclick="selectChannel(${c.id}, '${escapeHtml(c.name)}', 'channel')">
      # ${escapeHtml(c.name)}
    </div>
  `).join('');

  await loadRoomMembers(room);
}

async function loadRoomMembers(room) {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${room.id}/members`);

    if (!response.ok) {
      throw new Error("참가자 조회 실패");
    }

    const members = await response.json();

    room.participants = members.map(m => ({
      id: m.userId,
      name: m.name,
      email: m.email
    }));

    renderDmList(room);
    renderParticipantList(room);

  } catch (error) {
    console.error(error);
    document.getElementById('dm-list').innerHTML = `
      <div style="padding:10px; color:var(--accent4); font-size:13px;">
        DM 목록을 불러오지 못했습니다.
      </div>
    `;
  }
}

function renderDmList(room) {
  const others = room.participants.filter(p => Number(p.id) !== Number(currentUser.id));

  const dmList = document.getElementById('dm-list');

  if (others.length === 0) {
    dmList.innerHTML = `
      <div style="padding:10px; color:var(--text3); font-size:13px;">
        DM을 보낼 참가자가 없습니다.
      </div>
    `;
    return;
  }

  dmList.innerHTML = others.map(user => `
    <div class="channel-item" id="nav-dm-${user.id}" onclick="startDM(${user.id}, '${escapeHtml(user.name)}')">
      👤 ${escapeHtml(user.name)}
    </div>
  `).join('');
}

async function startDM(userId, userName) {
  currentChatType = "dm";
  currentDmTargetId = Number(userId);
  currentDmTargetName = userName;
  currentChannelId = null;

  document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));

  const navEl = document.getElementById(`nav-dm-${userId}`);
  if (navEl) navEl.classList.add('active');

  document.getElementById('current-channel-name').textContent = `👤 ${userName}`;

  await loadDirectMessages();
}

async function selectChannel(id, name, type) {
  currentChatType = "channel";
  currentDmTargetId = null;
  currentDmTargetName = null;

  currentChannelId = Number(id);
  const room = chatRooms.find(r => Number(r.id) === Number(currentRoomId));
  if (!room) return;

  document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById(`nav-channel-${id}`);
  if (navEl) navEl.classList.add('active');

  document.getElementById('current-channel-name').textContent = type === 'channel' ? `# ${name}` : `👤 ${name}`;

  await loadMessages(room, currentChannelId);
  renderMessages(room.messages[currentChannelId] || []);
}

async function loadDirectMessages() {
  const room = chatRooms.find(r => Number(r.id) === Number(currentRoomId));
  if (!room) return;

  try {
    const response = await fetch(
      `${API_BASE_URL}/rooms/${currentRoomId}/dm?userId=${currentUser.id}&targetUserId=${currentDmTargetId}`
    );

    if (!response.ok) {
      throw new Error("DM 조회 실패");
    }

    const data = await response.json();

    const messages = data.map(m => ({
      id: m.messageId,
      roomId: m.roomId,
      senderId: m.senderId,
      name: m.senderName,
      receiverId: m.receiverId,
      text: m.content,
      messageType: m.messageType,
      time: formatMessageTime(m.createdAt),
      isFile: m.messageType === "FILE",
      fileName: m.fileName || m.content,
      fileUrl: `${API_BASE_URL}/dm/files/${m.messageId}`
    }));

    renderMessages(messages);

  } catch (error) {
    console.error(error);
    showToast("DM을 불러오지 못했습니다.", "❌");
  }
}

async function loadMessages(room, channelId) {
  try {
    const response = await fetch(`${API_BASE_URL}/channels/${channelId}/messages`);
    if (!response.ok) throw new Error(`메시지 조회 실패: ${response.status}`);

    const data = await response.json();
    room.messages[channelId] = data.map(normalizeMessage);
  } catch (error) {
    console.error(error);
    showToast("메시지를 불러오지 못했습니다.", "❌");
    room.messages[channelId] = [];
  }
}

function renderMessages(msgs) {
  const container = document.getElementById('chat-messages');
  if (msgs.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text3);">첫 메시지를 보내보세요!</div>`;
    return;
  }

  container.innerHTML = msgs.map(m => {
    const isMe = Number(m.senderId) === Number(currentUser.id);
    const senderName = escapeHtml(m.name || '알 수 없음');
    const initial = isMe ? '나' : senderName.charAt(0);

    let contentHtml = `<div class="chat-bubble">${escapeHtml(m.text)}</div>`;
    if (m.isFile) {
      contentHtml += `
        <div class="chat-file-attachment">
          <span style="font-size:20px;">📄</span>
          <div>
            <div style="font-size:13px; font-weight:600;">${escapeHtml(m.fileName || '첨부파일')}</div>
            <div style="font-size:11px; cursor:pointer; text-decoration:underline;" onclick="downloadMessageFile(${m.id})">다운로드</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="chat-message-row ${isMe ? 'me' : ''}">
        <div class="chat-avatar" style="${isMe ? 'display:none;' : ''}">${initial}</div>
        <div class="chat-message-content">
          <div class="chat-sender-info">
            <span style="font-weight:600; color:${isMe ? 'var(--accent)' : 'var(--text)'};">${senderName}</span>
            <span>${escapeHtml(m.time)}</span>
          </div>
          ${contentHtml}
        </div>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function downloadMessageFile(messageId) {
  if (currentChatType === "dm") {
    window.location.href = `${API_BASE_URL}/dm/files/${messageId}`;
  } else {
    window.location.href = `${API_BASE_URL}/files/${messageId}`;
  }
}

async function sendChatMessage(fileObj = null) {
  if (!currentUser) {
    showToast("로그인이 필요합니다.", "🔐");
    openLogin();
    return;
  }
  if (fileObj) {
    showToast("파일 업로드 API는 아직 연결하지 않았습니다.", "ℹ️");
    return;
  }

  const textarea = document.getElementById('chat-textarea');
  const text = textarea.value.trim();

  if (!text) return;

  if (currentChatType === "dm") {
  await sendDirectMessage(text);
  textarea.value = '';
  return;
  }
  if (!currentRoomId || !currentChannelId) {
    showToast("채팅방과 채널을 먼저 선택해주세요.", "⚠️");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: currentRoomId,
        channelId: currentChannelId,
        senderId: currentUser.id,
        content: text
      })
    });

    if (!response.ok) throw new Error(`메시지 저장 실패: ${response.status}`);

    const saved = normalizeMessage(await response.json());
    const room = chatRooms.find(r => Number(r.id) === Number(currentRoomId));

    if (!room.messages[currentChannelId]) room.messages[currentChannelId] = [];
    room.messages[currentChannelId].push(saved);

    textarea.value = '';
    renderMessages(room.messages[currentChannelId]);
  } catch (error) {
    console.error(error);
    showToast("메시지 전송 실패", "❌");
  }
}

async function handleChatFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!currentUser) {
    showToast("로그인이 필요합니다.", "🔐");
    event.target.value = '';
    return;
  }

  if (currentChatType === "dm") {
    await uploadDirectMessageFile(file);
    event.target.value = '';
    return;
  }

  if (!currentRoomId || !currentChannelId) {
    showToast("채팅방과 채널을 먼저 선택해주세요.", "⚠️");
    event.target.value = '';
    return;
  }

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    showToast("용량이 너무 큽니다. (최대 50MB)", "⚠️");
    event.target.value = '';
    return;
  }

  const formData = new FormData();
  formData.append("roomId", currentRoomId);
  formData.append("channelId", currentChannelId);
  formData.append("senderId", currentUser.id);
  formData.append("file", file);

  try {
    const response = await fetch(`${API_BASE_URL}/messages/file`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("파일 업로드 실패 상태:", response.status);
      console.error("파일 업로드 실패 내용:", errorText);
      throw new Error(errorText || "파일 업로드 실패");
    }

    const saved = await response.json();

    const room = chatRooms.find(r => Number(r.id) === Number(currentRoomId));

    const fileMessage = {
      id: saved.messageId,
      roomId: saved.roomId,
      channelId: saved.channelId,
      senderId: saved.senderId,
      name: saved.senderName,
      text: saved.content,
      messageType: "FILE",
      time: formatMessageTime(saved.createdAt),
      isFile: true,
      fileName: saved.fileName,
      fileUrl: `${API_BASE_URL}/files/${saved.messageId}`
    };

    if (!room.messages[currentChannelId]) {
      room.messages[currentChannelId] = [];
    }

    room.messages[currentChannelId].push(fileMessage);
    renderMessages(room.messages[currentChannelId]);

    showToast("파일을 업로드했습니다.", "📎");

  } catch (error) {
    console.error(error);
    showToast("파일 업로드 실패", "❌");
  }

  event.target.value = '';
}

function deleteChannel(channelId) {
  showToast("채널 삭제 API는 아직 연결하지 않았습니다.", "ℹ️");
}

function toggleParticipants() {
  const pPanel = document.getElementById('chat-participants');
  pPanel.style.display = pPanel.style.display === 'none' ? 'block' : 'none';
}

function renderParticipantList(room) {
  const list = document.getElementById('participant-list');

  if (!room.participants || room.participants.length === 0) {
    list.innerHTML = `
      <div style="padding:12px; color:var(--text3); font-size:13px;">
        참가자가 없습니다.
      </div>
    `;
    return;
  }

  list.innerHTML = room.participants.map(user => {
    const isMe = Number(user.id) === Number(currentUser.id);
    const initial = isMe ? '나' : escapeHtml(user.name).charAt(0);

    return `
      <div class="participant-item">
        <div class="chat-avatar" style="width:28px; height:28px; font-size:12px;">
          ${initial}
        </div>
        <div>
          <div style="font-size:14px; font-weight:600;">
            ${escapeHtml(user.name)} ${isMe ? '(나)' : ''}
          </div>
          <div style="font-size:11px; color:var(--text3);">
            ${escapeHtml(user.email || '')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function sendDirectMessage(text) {
  if (!currentRoomId || !currentDmTargetId) {
    showToast("DM 상대를 먼저 선택해주세요.", "⚠️");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/dm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roomId: currentRoomId,
        senderId: currentUser.id,
        receiverId: currentDmTargetId,
        content: text
      })
    });

    if (!response.ok) {
      throw new Error("DM 전송 실패");
    }

    await loadDirectMessages();

  } catch (error) {
    console.error(error);
    showToast("DM 전송 실패", "❌");
  }
}

async function uploadDirectMessageFile(file) {
  if (!currentRoomId || !currentDmTargetId) {
    showToast("DM 상대를 먼저 선택해주세요.", "⚠️");
    return;
  }

  const formData = new FormData();
  formData.append("roomId", currentRoomId);
  formData.append("senderId", currentUser.id);
  formData.append("receiverId", currentDmTargetId);
  formData.append("file", file);

  try {
    const response = await fetch(`${API_BASE_URL}/dm/file`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error("DM 파일 업로드 실패");
    }

    await loadDirectMessages();
    showToast("DM 파일을 업로드했습니다.", "📎");

  } catch (error) {
    console.error(error);
    showToast("DM 파일 업로드 실패", "❌");
  }
}

async function leaveChatRoom() {
  if (!currentRoomId) {
    showToast("나가기 할 채팅방이 선택되지 않았습니다.", "⚠️");
    return;
  }

  const room = chatRooms.find(
    r => Number(r.id) === Number(currentRoomId)
  );

  if (room && room.isHost) {
    const confirmed = confirm(
      "방장은 방을 나갈 수 없습니다.\n" +
      "나가면 채팅방이 삭제(해체)될 수 있습니다.\n" +
      "정말 삭제하시겠습니까?"
    );

    if (!confirmed) return;

  } else {
    const confirmed = confirm(
      "이 채팅방에서 나가시겠습니까?\n" +
      "나간 후에는 초대코드가 있어야 다시 들어올 수 있습니다."
    );

    if (!confirmed) return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/rooms/${currentRoomId}/leave?userId=${currentUser.id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      const errMsg = await response.text();
      throw new Error(errMsg || "채팅방 나가기 실패");
    }

    showToast("채팅방에서 정상적으로 퇴장했습니다.", "🚪");

    currentRoomId = null;
    currentChannelId = null;
    currentDmTargetId = null;
    currentDmTargetName = null;
    currentChatType = "channel";

    exitChatRoom();

  } catch (error) {
    console.error("채팅방 퇴장 오류:", error);
    showToast(
      error.message || "채팅방을 나가는 도중 오류가 발생했습니다.",
      "❌"
    );
  }
}