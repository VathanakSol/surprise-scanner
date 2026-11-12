// Surprise Scanner — scan logic, animations, and persistent log

const form      = document.getElementById('scan-form');
const nameInput = document.getElementById('scan-name');
const scanBtn   = document.getElementById('scan-btn');
const diceBtn   = document.getElementById('dice-btn');
const scope     = document.getElementById('scope');
const beam      = document.getElementById('beam');
const scopeMsg  = document.getElementById('scope-msg');
const resultCard= document.getElementById('result-card');
const progWrap  = document.getElementById('progress-wrap');
const progBar   = document.getElementById('progress-bar');
const statusText= document.getElementById('status-text');
const historyList = document.getElementById('history-list');
const countBadge  = document.getElementById('count-badge');
const emptyNote   = document.getElementById('empty-note');
const clearBtn    = document.getElementById('clear-btn');
const stars       = document.getElementById('stars');

const STORAGE_KEY = 'surprise-scans-v1';
let scans = load();
let busy = false;

// ---------- surprise pool ----------
const RARITIES = [
  { key: 'common',    label: 'Common',    weight: 55, color: '#9fb4d8' },
  { key: 'rare',      label: 'Rare',      weight: 30, color: '#7dd3fc' },
  { key: 'epic',      label: 'Epic',      weight: 11, color: '#a78bfa' },
  { key: 'legendary', label: 'Legendary', weight: 4,  color: '#fbbf24' },
];

const SURPRISES = [
  { emoji:'🐙', name:'Confetti Octopus',    rarity:'rare',      note:'Hugs you with eight arms at once.' },
  { emoji:'🌱', name:'Talking Sprout',      rarity:'common',    note:'Asks for water and compliments.' },
  { emoji:'🛸', name:'Pocket UFO',          rarity:'epic',      note:'Beams up loose socks.' },
  { emoji:'🧀', name:'Moon Cheese Cube',    rarity:'common',    note:'Slightly gravitational.' },
  { emoji:'🦖', name:'Tiny T-Rex',          rarity:'rare',      note:'Terrible at clap. Great at roar.' },
  { emoji:'🔮', name:'Honest Crystal Ball', rarity:'epic',      note:'Only predicts good snacks.' },
  { emoji:'🐉', name:'Bubble Dragon',       rarity:'legendary', note:'Breathles soap, not fire. Royally pleased.' },
  { emoji:'🍄', name:'Disco Mushroom',      rarity:'common',    note:'Spins on its own beat.' },
  { emoji:'⚡', name:'Static Cat',          rarity:'rare',      note:'Purrs in voltages.' },
  { emoji:'🪐', name:'Ringed Pocket Planet',rarity:'epic',      note:'Fits in a backpack. Somehow.' },
  { emoji:'🦄', name:'Glitter Unicorn',     rarity:'legendary', note:'Manes permanently in highlighter mode.' },
  { emoji:'🐻', name:'Marmalade Bear',      rarity:'common',    note:'Shares jam. Always.' },
  { emoji:'🤖', name:'Shy Robot',           rarity:'rare',      note:'Blushes in LED orange.' },
  { emoji:'👻', name:'Friendly Ghost',      rarity:'rare',      note:'Boos softly, apologizes after.' },
  { emoji:'🌈', name:'Bottled Rainbow',     rarity:'legendary', note:'Uncap indoors only.' },
  { emoji:'🐢', name:'Turbo Turtle',        rarity:'epic',      note:'Shell aerodynamics: unmatched.' },
];

const IDEAS = ["grandma's attic","an old library book","the fridge at 2am","a dusty shoebox","a beach rock","mom's jacket pocket","the back seat","a cereal box","a garden pot","an abandoned locker","a seashell","the sock drawer"];

const STATUS_LINES = ['Warming up sensors…','Sweeping the object…','Reading quantum fuzz…','Cross-checking surprise vault…','Decoding rarity signal…','Almost there…'];

// ---------- starfield ----------
(function makeStars() {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 70; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
    s.style.transform = `scale(${(0.6 + Math.random() * 1.6).toFixed(2)})`;
    frag.appendChild(s);
  }
  stars.appendChild(frag);
})();

// ---------- helpers ----------
function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(scans)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rollRarity() {
  const total = RARITIES.reduce((sum, r) => sum + r.weight, 0);
  let n = Math.random() * total;
  for (const r of RARITIES) { if ((n -= r.weight) < 0) return r.key; }
  return 'common';
}
function surpriseFor(target) {
  // deterministic-ish flavor: hash the target so same input feels consistent
  let h = 0;
  for (let i = 0; i < target.length; i++) h = (h * 31 + target.charCodeAt(i)) >>> 0;
  const wanted = rollRarity();
  const matching = SURPRISES.filter(s => s.rarity === wanted);
  const pool = matching.length ? matching : SURPRISES;
  return pool[h % pool.length];
}
function rarityOf(key) { return RARITIES.find(r => r.key === key) || RARITIES[0]; }
function fmtTime(ts) {
  return new Date(ts).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ---------- scanning ----------
async function runScan(target) {
  busy = true;
  scanBtn.disabled = true;
  diceBtn.disabled = true;
  resultCard.classList.remove('show');
  resultCard.innerHTML = '';
  scope.classList.remove('is-idle');
  scope.classList.add('is-scanning');
  progWrap.classList.remove('is-hidden');
  progBar.style.width = '0%';
  scopeMsg.textContent = 'Scanning…';

  const duration = 2600;
  const started = performance.now();
  let lineIdx = 0;
  statusText.textContent = STATUS_LINES[0];

  await new Promise(resolve => {
    const tick = () => {
      const pct = Math.min(100, ((performance.now() - started) / duration) * 100);
      progBar.style.width = pct + '%';
      const idx = Math.min(STATUS_LINES.length - 1, Math.floor(pct / (100 / STATUS_LINES.length)));
      if (idx !== lineIdx) { lineIdx = idx; statusText.textContent = STATUS_LINES[idx]; }
      if (pct < 100) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });

  const surprise = surpriseFor(target);
  const rarity = rarityOf(surprise.rarity);

  scope.classList.remove('is-scanning');
  scope.classList.add('is-revealed');
  progWrap.classList.add('is-hidden');
  scopeMsg.textContent = '';

  resultCard.innerHTML = `
    <span class="rarity-tag" style="--rc:${rarity.color}">${rarity.label}</span>
    <div class="surprise-emoji">${surprise.emoji}</div>
    <h3 class="surprise-name">${surprise.name}</h3>
    <p class="surprise-note">${surprise.note}</p>
    <p class="surprise-from">found inside <strong>${escapeHtml(target)}</strong></p>
  `;
  resultCard.classList.add('show', `tone-${surprise.rarity}`);
  burst();

  const entry = { id: Date.now(), target, ...surprise, time: Date.now() };
  scans.unshift(entry);
  if (scans.length > 60) scans.pop();
  save();
  renderHistory();

  setTimeout(() => {
    scope.classList.remove('is-revealed');
    scope.classList.add('is-idle');
    resultCard.classList.remove('show');
    scopeMsg.textContent = 'Ready to scan';
    busy = false;
    scanBtn.disabled = false;
    diceBtn.disabled = false;
    nameInput.focus();
  }, 5200);
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// confetti burst inside the scope
function burst() {
  const colors = ['#5eead4','#a78bfa','#f472b6','#fbbf24','#7dd3fc'];
  for (let i = 0; i < 26; i++) {
    const p = document.createElement('i');
    p.className = 'particle';
    p.style.background = pick(colors);
    p.style.setProperty('--x', (Math.random() * 260 - 130).toFixed(0) + 'px');
    p.style.setProperty('--y', (Math.random() * -180 - 20).toFixed(0) + 'px');
    p.style.animationDelay = (Math.random() * 0.25).toFixed(2) + 's';
    scope.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }
}

// ---------- history ----------
function renderHistory() {
  countBadge.textContent = scans.length;
  emptyNote.classList.toggle('is-hidden', scans.length > 0);
  clearBtn.classList.toggle('is-hidden', scans.length === 0);
  historyList.innerHTML = '';
  scans.forEach(s => {
    const r = rarityOf(s.rarity);
    const li = document.createElement('li');
    li.className = 'history-item tone-' + s.rarity;
    li.innerHTML = `
      <span class="hi-emoji">${s.emoji}</span>
      <span class="hi-body">
        <span class="hi-name">${escapeHtml(s.name)}
          <em class="hi-rarity" style="color:${r.color}">${r.label}</em>
        </span>
        <span class="hi-target">in ${escapeHtml(s.target)}</span>
      </span>
      <span class="hi-time">${fmtTime(s.time)}</span>`;
    li.addEventListener('click', () => replay(s));
    historyList.appendChild(li);
  });
}

// clicking a log entry shows that surprise again
function replay(s) {
  if (busy) return;
  busy = true;
  scanBtn.disabled = true;
  resultCard.className = 'result-card show tone-' + s.rarity;
  const r = rarityOf(s.rarity);
  resultCard.innerHTML = `
    <span class="rarity-tag" style="--rc:${r.color}">${r.label}</span>
    <div class="surprise-emoji">${s.emoji}</div>
    <h3 class="surprise-name">${escapeHtml(s.name)}</h3>
    <p class="surprise-note">${escapeHtml(s.note)}</p>
    <p class="surprise-from">from log · <strong>${escapeHtml(s.target)}</strong></p>`;
  scope.classList.remove('is-idle');
  scope.classList.add('is-revealed');
  burst();
  setTimeout(() => {
    scope.classList.remove('is-revealed');
    scope.classList.add('is-idle');
    resultCard.classList.remove('show');
    busy = false;
    scanBtn.disabled = false;
  }, 4200);
}

// ---------- events ----------
form.addEventListener('submit', e => {
  e.preventDefault();
  const target = nameInput.value.trim();
  if (!target || busy) return;
  runScan(target);
});

diceBtn.addEventListener('click', () => { nameInput.value = pick(IDEAS); nameInput.focus(); });

clearBtn.addEventListener('click', () => {
  scans = [];
  save();
  renderHistory();
});

renderHistory();
nameInput.focus();
