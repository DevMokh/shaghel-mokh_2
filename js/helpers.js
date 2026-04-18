// js/helpers.js
export function showToast(msg, dur = 2800) {
  const c = document.getElementById("toast-container");
  if (!c) return;
  const el = document.createElement("div");
  el.className = "toast-msg";
  el.innerText = msg;
  c.appendChild(el);
  setTimeout(() => {
    el.classList.add("hide");
    setTimeout(() => el.remove(), 350);
  }, dur);
}
window.showToast = showToast;

// محرك الأصوات Web Audio
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}
function playTone(freq, duration, type = "sine", gainStart = 0.4, gainEnd = 0, delay = 0) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  gain.gain.setValueAtTime(gainStart, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.001), ctx.currentTime + delay + duration);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}
const SOUNDS = {
  "snd-correct": () => { playTone(523.25, 0.10, "sine", 0.35, 0.10, 0.00); playTone(659.25, 0.10, "sine", 0.35, 0.10, 0.08); playTone(783.99, 0.18, "sine", 0.40, 0.00, 0.16); },
  "snd-wrong": () => { playTone(220, 0.08, "square", 0.30, 0.05, 0.00); playTone(180, 0.08, "square", 0.30, 0.05, 0.06); playTone(140, 0.15, "square", 0.25, 0.00, 0.12); },
  "snd-win": () => { playTone(523.25, 0.12, "sine", 0.35, 0.10, 0.00); playTone(659.25, 0.12, "sine", 0.35, 0.10, 0.10); playTone(783.99, 0.12, "sine", 0.35, 0.10, 0.20); playTone(1046.5, 0.25, "sine", 0.40, 0.00, 0.30); },
  "snd-level": () => { [392, 494, 587, 698, 880].forEach((f, i) => playTone(f, 0.14, "sine", 0.30, 0.05, i * 0.09)); },
  "snd-timeout": () => { playTone(440, 0.08, "square", 0.35, 0.05, 0.00); playTone(370, 0.08, "square", 0.35, 0.05, 0.10); playTone(311, 0.20, "square", 0.30, 0.00, 0.20); },
  "snd-buy": () => { playTone(1046.5, 0.06, "sine", 0.30, 0.05, 0.00); playTone(1318.5, 0.06, "sine", 0.30, 0.05, 0.06); playTone(1568.0, 0.15, "sine", 0.30, 0.00, 0.12); },
  "snd-warn": () => { [0, 0.18, 0.36].forEach(d => playTone(880, 0.10, "sine", 0.28, 0.02, d)); },
};
export function playSound(id) {
  if (window.gameData?.soundEnabled === false) return;
  const fn = SOUNDS[id];
  if (fn) try { fn(); } catch (e) {}
}
window.playSound = playSound;

export function openModal(type) { document.getElementById(`modal-${type}`)?.classList.add("active"); document.body.style.overflow = "hidden"; }
window.openModal = openModal;
export function closeModal(type) { document.getElementById(`modal-${type}`)?.classList.remove("active"); document.body.style.overflow = ""; }
window.closeModal = closeModal;

let _confirmResolve = null;
export function showConfirmDialog(opts) {
  const modal = document.getElementById("cmod-confirm");
  document.getElementById("cmod-ico").innerText = opts.icon || "⚠️";
  document.getElementById("cmod-ttl").innerText = opts.title || "هل أنت متأكد؟";
  document.getElementById("cmod-msg").innerText = opts.msg || "";
  const btn = document.getElementById("cmod-yes");
  btn.innerText = opts.okText || "تأكيد";
  btn.className = `cmod-btn ${opts.okClass || "danger"}`;
  btn.onclick = () => { modal.classList.remove("active"); if (opts.onOk) opts.onOk(); };
  modal.classList.add("active");
}
window.showConfirmDialog = showConfirmDialog;
export function cancelConfirm() { document.getElementById("cmod-confirm")?.classList.remove("active"); }
window._cancelConfirm = cancelConfirm;

let _inputResolve = null;
export function showInputDialog(def = "") {
  return new Promise(resolve => {
    _inputResolve = resolve;
    const modal = document.getElementById("cmod-input");
    const field = document.getElementById("cmod-inp-field");
    const hint = document.getElementById("cmod-inp-hint");
    field.value = def;
    hint.innerText = `${def.length} / 15 حرف`;
    modal.classList.add("active");
    setTimeout(() => field.focus(), 350);
  });
}
window.showInputDialog = showInputDialog;
export function confirmInput() {
  const field = document.getElementById("cmod-inp-field");
  const val = field.value.trim();
  document.getElementById("cmod-input").classList.remove("active");
  if (_inputResolve) { _inputResolve(val); _inputResolve = null; }
}
window._confirmInput = confirmInput;
export function cancelInput() {
  document.getElementById("cmod-input").classList.remove("active");
  if (_inputResolve) { _inputResolve(null); _inputResolve = null; }
}
window._cancelInput = cancelInput;

export function confirmExit() { document.getElementById("cmod-exit").classList.add("active"); }
window.confirmExit = confirmExit;
export function _confirmExit() {
  document.getElementById("cmod-exit").classList.remove("active");
  if (window.timerInterval) clearInterval(window.timerInterval);
  window.navTo("map");
}
window._confirmExit = _confirmExit;
export function _cancelExit() { document.getElementById("cmod-exit").classList.remove("active"); }
window._cancelExit = _cancelExit;

export function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

const OFFLINE_QUEUE_KEY = "shaghel_offline_queue";
export function queueOfflineSave(data) {
  try { const q = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]"); q.push({ data, ts: Date.now() }); localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q.slice(-3))); } catch (e) {}
}
window.queueOfflineSave = queueOfflineSave;
export async function syncOfflineQueue() {
  if (!window.firebaseReady || !window.currentUser) return;
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY); if (!raw) return;
    const queue = JSON.parse(raw); if (!queue.length) return;
    const last = queue[queue.length - 1];
    await window.db_set(`artifacts/${window.appId}/users/${window.currentUser.uid}/profile/data`, last.data, { merge: true });
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (e) {}
}
window.syncOfflineQueue = syncOfflineQueue;
window.addEventListener("online", () => setTimeout(syncOfflineQueue, 2000));
