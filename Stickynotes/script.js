/* =====================================================
   PINBOARD — STICKY NOTES SCRIPT
   GSAP-powered, localStorage-backed
   ===================================================== */

const COLORS  = ['yellow', 'peach', 'mint', 'sky', 'lavender', 'rose'];
const TILTS   = [-2.5, -1.5, -0.8, 0.5, 1.2, 2, 2.8, -2];
const PLACEHOLDERS = [
  'What\'s on your mind…',
  'A quick thought…',
  'Don\'t forget…',
  'Idea brewing…',
  'Note to self…',
  'Remember this…',
];

/* ---- DOM ---- */
const board      = document.getElementById('board');
const addBtn     = document.getElementById('add-btn');
const noteCount  = document.getElementById('note-count');
const emptyState = document.getElementById('empty-state');

/* ---- State ---- */
let notes = [];

/* ---- Storage ---- */
function save() {
  localStorage.setItem('pinboard-notes', JSON.stringify(notes));
}

function load() {
  try {
    const raw = localStorage.getItem('pinboard-notes');
    notes = raw ? JSON.parse(raw) : [];
  } catch {
    notes = [];
  }
}

/* ---- Update count badge & empty state ---- */
function updateUI() {
  noteCount.textContent = notes.length;

  if (notes.length === 0) {
    gsap.to(emptyState, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', display: 'block' });
  } else {
    gsap.to(emptyState, { opacity: 0, duration: 0.25, onComplete: () => { emptyState.style.display = 'none'; } });
  }

  /* Animate count badge bump */
  gsap.fromTo('#note-count',
    { scale: 1.4, color: '#f97316' },
    { scale: 1,   color: '',       duration: 0.4, ease: 'back.out(2)' }
  );
}

/* ---- Format date ---- */
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ---- Build note DOM element ---- */
function buildNoteEl(note) {
  const card = document.createElement('div');
  card.className = `note-card ${note.color}`;
  card.dataset.id = note.id;

  /* Random subtle tilt */
  const tilt = TILTS[note.id % TILTS.length];
  gsap.set(card, { rotation: tilt });

  /* Color dot buttons */
  const dots = COLORS.map(c =>
    `<div class="note-dot dot-${c}" data-color="${c}" title="${c}"></div>`
  ).join('');

  card.innerHTML = `
    <div class="note-topbar">
      <div class="note-color-dots">${dots}</div>
      <button class="note-delete" aria-label="Delete note">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <textarea class="note-textarea"
      placeholder="${PLACEHOLDERS[note.id % PLACEHOLDERS.length]}"
      maxlength="500"
      spellcheck="false"
    >${note.text}</textarea>
    <div class="note-footer">${formatDate(note.createdAt)}</div>
  `;

  /* --- Textarea input → save --- */
  const ta = card.querySelector('.note-textarea');
  ta.addEventListener('input', () => {
    const n = notes.find(n => n.id === note.id);
    if (n) { n.text = ta.value; save(); }
  });

  /* --- Delete button --- */
  card.querySelector('.note-delete').addEventListener('click', () => deleteNote(note.id, card));

  /* --- Color dot click --- */
  card.querySelectorAll('.note-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const newColor = dot.dataset.color;
      const n = notes.find(n => n.id === note.id);
      if (!n || n.color === newColor) return;

      /* Animate color swap */
      gsap.to(card, {
        scale: 0.95, duration: 0.1, ease: 'power2.in',
        onComplete: () => {
          COLORS.forEach(c => card.classList.remove(c));
          card.classList.add(newColor);
          n.color = newColor;
          save();
          gsap.to(card, { scale: 1, duration: 0.35, ease: 'back.out(2)' });
        }
      });
    });
  });

  /* --- Hover tilt reset / restore --- */
  card.addEventListener('mouseenter', () => {
    gsap.to(card, { rotation: 0, y: -6, duration: 0.3, ease: 'power2.out' });
  });
  card.addEventListener('mouseleave', () => {
    gsap.to(card, { rotation: tilt, y: 0, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
  });

  return card;
}

/* ---- Create note ---- */
function createNote(text = '', color = null, id = null, createdAt = null) {
  const note = {
    id:        id        ?? Date.now(),
    text:      text,
    color:     color     ?? COLORS[Math.floor(Math.random() * COLORS.length)],
    createdAt: createdAt ?? Date.now(),
  };

  notes.push(note);
  save();

  const card = buildNoteEl(note);
  board.appendChild(card);

  return card;
}

/* ---- Add note with animation ---- */
function addNote() {
  const card = createNote();
  updateUI();

  /* Pop-in animation */
  gsap.fromTo(card,
    { scale: 0, opacity: 0, rotation: -8, y: -20 },
    {
      scale: 1, opacity: 1, rotation: TILTS[card.dataset.id % TILTS.length], y: 0,
      duration: 0.55,
      ease: 'back.out(1.8)',
    }
  );

  /* Focus textarea */
  setTimeout(() => card.querySelector('.note-textarea').focus(), 300);

  /* Scroll into view */
  setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
}

/* ---- Delete note with animation ---- */
function deleteNote(id, card) {
  gsap.timeline()
    .to(card, {
      scale: 0.85,
      rotation: '+=8',
      duration: 0.18,
      ease: 'power2.in',
    })
    .to(card, {
      scale: 0,
      opacity: 0,
      y: 20,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        card.remove();
        notes = notes.filter(n => n.id !== id);
        save();
        updateUI();
      }
    });
}

/* ---- Page load ---- */
function init() {
  load();
  updateUI();

  /* Hide empty state immediately if notes exist */
  if (notes.length > 0) emptyState.style.display = 'none';

  /* Render saved notes with staggered entrance */
  const cards = notes.map(n => {
    const card = buildNoteEl(n);
    board.appendChild(card);
    gsap.set(card, { opacity: 0, scale: 0.88, y: 14 });
    return card;
  });

  if (cards.length > 0) {
    gsap.to(cards, {
      opacity: 1, scale: 1, y: 0,
      duration: 0.5,
      ease: 'back.out(1.5)',
      stagger: {
        each: 0.07,
        from: 'start',
      },
      delay: 0.15,
    });
  }

  /* Header entrance */
  gsap.from('.header', { y: -60, opacity: 0, duration: 0.6, ease: 'expo.out' });
}

/* ---- Add button click + hover ---- */
addBtn.addEventListener('click', () => {
  addNote();

  /* Button squish */
  gsap.fromTo(addBtn,
    { scale: 0.9 },
    { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' }
  );
});

addBtn.addEventListener('mouseenter', () => {
  gsap.to(addBtn, { y: -2, boxShadow: '0 8px 24px rgba(224,123,57,0.55)', duration: 0.2, ease: 'power2.out' });
});
addBtn.addEventListener('mouseleave', () => {
  gsap.to(addBtn, { y: 0, boxShadow: '0 4px 14px rgba(224,123,57,0.45)', duration: 0.25, ease: 'power2.out' });
});

/* ---- Run ---- */
init();
