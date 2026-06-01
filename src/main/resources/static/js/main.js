window.addEventListener('DOMContentLoaded', async () => {
  if (typeof window.injectAllModals === 'function') {
    window.injectAllModals();
  }

  const originalRenderNotes = window.renderNotes || null;
  if (originalRenderNotes) {
    window.renderNotes = function(filter) {
      originalRenderNotes(filter);
      if (typeof window.addCyberButtonsToCards === 'function') {
        setTimeout(window.addCyberButtonsToCards, 100);
      }
    };
  }

  if (typeof window.loadNotesFromApi === 'function') {
    await window.loadNotesFromApi();
  } else if (typeof window.renderNotes === 'function') {
    window.renderNotes('all');
  }

  if (typeof injectQuizUI === 'function') {
    injectQuizUI();
  }

  setInterval(() => {
    const cardGrid = document.getElementById('notesGrid');
    const currentNotes = window.getAppNotes ? window.getAppNotes() : [];
    if (!cardGrid || currentNotes.length === 0 || typeof window.addCyberButtonsToCards !== 'function') return;

    let changed = false;
    currentNotes.forEach(note => {
      if (note.cooldownUntil && Date.now() >= note.cooldownUntil) {
        note.cooldownUntil = null;
        changed = true;
      }
    });

    if (changed) {
      window.saveAppNotes();
      window.addCyberButtonsToCards();
      return;
    }

    cardGrid.querySelectorAll('.note-card').forEach(card => {
      const button = card.querySelector('.cyber-btn-cooldown');
      if (!button) return;
      const note = currentNotes.find(item => card.innerText.includes(item.q || item.title));
      if (!note || !note.cooldownUntil) return;
      const remaining = Math.max(0, note.cooldownUntil - Date.now());
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      button.textContent = `복습 잠금 (${mins}:${secs.toString().padStart(2, '0')})`;
    });
  }, 1000);
});
