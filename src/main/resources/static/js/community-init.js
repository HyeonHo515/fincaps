window.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();

  loadPosts().catch(() => {
    posts = [];
    renderBoard();
  });

  loadChatRooms();
});