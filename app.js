// Surprise Scanner — image uploads, animations, scan log
const STORAGE_KEY = 'surprise-scans-v1';
const MAX_BYTES = 5 * 1024 * 1024;

const $ = (id) => document.getElementById(id);
const form = $('scan-form');
const nameInput = $('scan-name');
const scanBtn = $('scan-btn');
const diceBtn = $('dice-btn');
const scope = $('scope');
const scopeMsg = $('scope-msg');
const resultCard = $('result-card');
const progWrap = $('progress-wrap');
const progBar = $('progress-bar');
const statusText = $('status-text');
const historyList = $('history-list');
const countBadge = $('count-badge');
const emptyNote = $('empty-note');
const clearBtn = $('clear-btn');
const stars = $('stars');
const dropZone = $('drop-zone');
const fileInput = $('scan-image');
const dropHint = $('drop-hint');
const thumb = $('thumb');
const removeBtn = $('remove-img');

let scans = loadScans();
let busy = false;
let pendingImage = null;

const RARITIES = {
  common: { label: 'Common', color: '#9fb4d8' },
  rare: { label: 'Rare', color: '#7dd3fc' },
  epic: { label: 'Epic', color: '#a78bfa' },
  legendary: { label: 'Legendary', color: '#fbbf24' }
};

const SURPRISES = [
  { emoji: '🐙', name: 'Confetti Octopus', rarity: 'rare', note: 'Hugs you with eight arms at once.' },
  { emoji: '🌱', name: 'Talking Sprout', rarity: 'common', note: 'Asks for water and compliments.' },
  { emoji: '🛸', name: 'Pocket UFO', rarity: 'epic', note: 'Beams up loose socks.' },
  { emoji: '🧀', name: 'Moon Cheese Cube', rarity: 'common', note: 'Slightly gravitational.' },
  { emoji: '🦖', name: 'Tiny T-Rex', rarity: 'rare', note: 'Terrible at clap. Great at roar.' },
  { emoji: '🔮', name: 'Fortune Marble', rarity: 'legendary', note: 'Predicts snacks in your future.' },
  { emoji: '🐝', name: 'Disco Bee', rarity: 'rare', note: 'Pollinates dance floors.' },
  { emoji: '🍄', name: 'Mushroom Wizard', rarity: 'epic', note: 'Casts spores of delight.' }
];

const IDEAS = ["grandma's attic", "the fridge", "an old book", "under my bed", "a shoebox", "the garden shed"];
const STATUS_LINES = ['Warming sensors…', 'Detecting anomalies…', 'Decoding signal…', 'Rendering surprise…'];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function random(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function makeStars() {
  if (!stars) return;
  stars.innerHTML = Array.from({ length: 70 }, (_, i) => `<i style="left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${(i%12)*.3}s"></i>`).join('');
}

function setPreview(dataUrl) {
  pendingImage = dataUrl || null;
  if (dataUrl) {
    thumb.src = dataUrl;
    thumb.classList.remove('is-hidden');
    dropHint.classList.add('is-hidden');
    removeBtn.classList.remove('is-hidden');
    dropZone.classList.add('has-image');
  } else {
    thumb.removeAttribute('src');
    thumb.classList.add('is-hidden');
    dropHint.classList.remove('is-hidden');
    removeBtn.classList.add('is-hidden');
    dropZone.classList.remove('has-image');
    fileInput.value = '';
  }
}

function handleFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }
  if (file.size > MAX_BYTES) { alert('That image is larger than 5 MB. Choose a smaller one.'); return; }
  const reader = new FileReader();
  reader.onload = () => setPreview(String(reader.result));
  reader.onerror = () => alert('Could not read that image.');
  reader.readAsDataURL(file);
}

function rollRarity() {
  const r = Math.random() * 100;
  if (r < 4) return 'legendary';
  if (r < 15) return 'epic';
  if (r < 45) return 'rare';
  return 'common';
}

async function animateScan() {
  progWrap.classList.remove('is-hidden');
  scope.className = 'scope is-scanning';
  scopeMsg.textContent = 'Scanning target';
  resultCard.innerHTML = '';
  for (let p = 0; p <= 100; p += 2) {
    progBar.style.width = `${p}%`;
    statusText.textContent = STATUS_LINES[Math.min(STATUS_LINES.length - 1, Math.floor(p / 26))];
    await new Promise((resolve) => setTimeout(resolve, 24));
  }
  progWrap.classList.add('is-hidden');
  progBar.style.width = '0%';
}

function showResult(scan) {
  const rarity = RARITIES[scan.rarity];
  scope.className = 'scope is-result';
  scopeMsg.textContent = '';
  resultCard.innerHTML = `
    ${scan.image ? `<img class="result-image" src="${scan.image}" alt="Scanned surprise">` : `<div class="result-emoji">${scan.emoji}</div>`}
    <h3>${escapeHtml(scan.name)}</h3>
    <p>${escapeHtml(scan.note)}</p>
    <span class="rarity" style="color:${rarity.color};border-color:${rarity.color}">${rarity.label}</span>
    <small>Confidence ${(70 + Math.floor(Math.random() * 29))}% · ${new Date(scan.at).toLocaleTimeString()}</small>`;
}

function createScan(label) {
  const surprise = random(SURPRISES);
  const title = label || (pendingImage ? 'Uploaded mystery' : surprise.name);
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    title,
    note: pendingImage ? 'Your uploaded photo hid inside the beam.' : surprise.note,
    emoji: surprise.emoji,
    rarity: pendingImage ? 'legendary' : rollRarity(),
    image: pendingImage,
    at: Date.now()
  };
}

function renderHistory() {
  countBadge.textContent = scans.length;
  emptyNote.classList.toggle('is-hidden', scans.length > 0);
  clearBtn.classList.toggle('is-hidden', scans.length === 0);
  historyList.innerHTML = scans.map((scan) => `
    <li>
      <button type="button" class="history-item" data-id="${scan.id}">
        ${scan.image ? `<img src="${scan.image}" alt="">` : `<span class="history-emoji">${scan.emoji}</span>`}
        <span><strong>${escapeHtml(scan.title)}</strong><small>${RARITIES[scan.rarity].label}</small></span>
      </button>
    </li>`).join('');
}

function saveScans() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(scans.slice(0, 30))); }
  catch { alert('Scan saved for this session, but storage is full because images are large.'); }
}

function loadScans() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy) return;
  const label = nameInput.value.trim();
  if (!label && !pendingImage) {
    alert('Type something to scan or add an image first.');
    return;
  }
  busy = true;
  scanBtn.disabled = true;
  await animateScan();
  const scan = createScan(label);
  scans.unshift(scan);
  saveScans();
  renderHistory();
  showResult(scan);
  setPreview(null);
  nameInput.value = '';
  busy = false;
  scanBtn.disabled = false;
});

fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
['dragenter', 'dragover'].forEach((type) => dropZone.addEventListener(type, (e) => {
  e.preventDefault();
  dropZone.classList.add('is-dragging');
}));
['dragleave', 'drop'].forEach((type) => dropZone.addEventListener(type, (e) => {
  e.preventDefault();
  dropZone.classList.remove('is-dragging');
}));
dropZone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
dropZone.addEventListener('click', (e) => {
  if (e.target !== removeBtn && !removeBtn.contains(e.target)) fileInput.click();
});
removeBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  setPreview(null);
});
diceBtn.addEventListener('click', () => { nameInput.value = random(IDEAS); });
historyList.addEventListener('click', (e) => {
  const button = e.target.closest('.history-item');
  if (!button) return;
  const scan = scans.find((item) => item.id === button.dataset.id);
  if (scan) showResult(scan);
});
clearBtn.addEventListener('click', () => {
  scans = [];
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
  resultCard.innerHTML = '';
  scope.className = 'scope is-idle';
  scopeMsg.textContent = 'Ready to scan';
});

makeStars();
renderHistory();
