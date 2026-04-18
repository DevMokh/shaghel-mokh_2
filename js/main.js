// js/main.js
import './firebase.js';
import { initAuth, listenToUserData } from './auth.js';
import {
  updateUI, navTo, renderMap, renderShop, renderLeaderboard, renderDailyChallenge,
  renderStats, switchStatsTab, renderColorPicker, showShopTab
} from './ui.js';
import {
  showToast, playSound, openModal, closeModal, showConfirmDialog, showInputDialog,
  confirmInput, cancelInput, confirmExit, _confirmExit, _cancelExit
} from './helpers.js';
import {
  saveData, updateDailyTask, updateWeeklyTask, addSeasonXP, checkLevel, updateLoginStreak,
  AVATAR_FRAMES, ACCENT_COLORS, categoryConfig
} from './data.js';
import {
  startQuiz, showQuestion, selectAnswer, nextQuestion, useHelper, askAIAnalysis
} from './quiz.js';
import {
  createRoom, joinRoomByCode, joinRoomById, confirmCreateRoom, toggleReady,
  startRoomGame, leaveRoom, sendLobbyMessage, kickPlayer, loadRooms
} from './rooms.js';
import {
  startDailyChallenge, renderWeeklyChallenge, renderSeasonTab, switchChallengeTab,
  claimWeeklyTask, startWeeklyChallenge
} from './challenges.js';
import {
  showFriendsModal, copyFriendCode, addFriendByCode, removeFriend
} from './friends.js';

// تعيين الدوال العامة على window
window.navTo = navTo;
window.updateUI = updateUI;
window.renderMap = renderMap;
window.renderShop = renderShop;
window.renderLeaderboard = renderLeaderboard;
window.renderDailyChallenge = renderDailyChallenge;
window.renderWeeklyChallenge = renderWeeklyChallenge;
window.renderSeasonTab = renderSeasonTab;
window.renderStats = renderStats;
window.switchStatsTab = switchStatsTab;
window.switchChallengeTab = switchChallengeTab;
window.switchLeaderboard = (tab) => renderLeaderboard(tab);
window.showShopTab = showShopTab;
window.renderColorPicker = renderColorPicker;

window.showToast = showToast;
window.playSound = playSound;
window.openModal = openModal;
window.closeModal = closeModal;
window.showConfirmDialog = showConfirmDialog;
window.showInputDialog = showInputDialog;
window._confirmInput = confirmInput;
window._cancelInput = cancelInput;
window._cancelConfirm = () => document.getElementById('cmod-confirm')?.classList.remove('active');
window.confirmExit = confirmExit;
window._confirmExit = _confirmExit;
window._cancelExit = _cancelExit;

window.saveData = saveData;
window.updateDailyTask = updateDailyTask;
window.updateWeeklyTask = updateWeeklyTask;
window.addSeasonXP = addSeasonXP;
window.checkLevel = checkLevel;
window.updateLoginStreak = updateLoginStreak;

window.AVATAR_FRAMES = AVATAR_FRAMES;
window.ACCENT_COLORS = ACCENT_COLORS;
window.categoryConfig = categoryConfig;

window.startQuiz = startQuiz;
window.showQuestion = showQuestion;
window.selectAnswer = selectAnswer;
window.nextQuestion = nextQuestion;
window.useHelper = useHelper;
window.askAIAnalysis = askAIAnalysis;

window.createRoom = createRoom;
window.joinRoomByCode = joinRoomByCode;
window.joinRoomById = joinRoomById;
window.confirmCreateRoom = confirmCreateRoom;
window.toggleReady = toggleReady;
window.startRoomGame = startRoomGame;
window.leaveRoom = leaveRoom;
window.sendLobbyMessage = sendLobbyMessage;
window.kickPlayer = kickPlayer;
window.loadRooms = loadRooms;
window.openJoinRoomModal = () => openModal('join-room');

window.startDailyChallenge = startDailyChallenge;
window.startWeeklyChallenge = startWeeklyChallenge;
window.claimWeeklyTask = claimWeeklyTask;

window.showFriendsModal = showFriendsModal;
window.copyFriendCode = copyFriendCode;
window.addFriendByCode = addFriendByCode;
window.removeFriend = removeFriend;

// دوال إضافية
window.toggleSidebar = () => {
  const s = document.getElementById('sidebar');
  const o = document.getElementById('sb-overlay');
  s.classList.toggle('open');
  o.style.display = s.classList.contains('open') ? 'block' : 'none';
  if (s.classList.contains('open')) { updateUI(); if (typeof renderColorPicker === 'function') renderColorPicker(); }
};
window.toggleSettings = () => {
  const panel = document.getElementById('settings-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
};
window.toggleTheme = () => { window.gameData.theme = window.gameData.theme === 'dark' ? 'light' : 'dark'; updateUI(); saveData(); };
window.toggleSound = () => { window.gameData.soundEnabled = !(window.gameData.soundEnabled !== false); updateUI(); saveData(); showToast(window.gameData.soundEnabled ? '🔊 الصوت مفعّل' : '🔇 الصوت مكتوم'); };
window.changeUsername = async () => {
  const name = await showInputDialog(window.gameData.username); if (name === null) return;
  if (name.length >= 3 && name.length <= 15) { window.gameData.username = name; await saveData(); updateUI(); showToast('✅ تم تغيير الاسم!'); }
  else if (name.length > 0) showToast('❌ الاسم يجب 3-15 حرفاً');
};
window.saveMessageDebounced = () => {
  clearTimeout(window._msgDebounce);
  window._msgDebounce = setTimeout(() => { window.gameData.message = document.getElementById('my-message-input')?.value.trim() || ''; saveData(); }, 800);
};
window.showDailyTasksModal = () => {
  const d = window.gameData; let html = '';
  d.dailyTasks.forEach(t => { const pct = Math.min((t.current / t.goal) * 100, 100); html += `<div class="task-card ${t.claimed ? 'done' : ''}"><span>${t.text}</span><div class="progress-bar"><div style="width:${pct}%"></div></div><span>${t.current}/${t.goal}</span></div>`; });
  document.getElementById('tasks-body').innerHTML = html; openModal('tasks');
};
window.showAchievementsModal = () => {
  const d = window.gameData; const earned = d.achievements.filter(a => a.earned).length;
  let html = `<div><span>المفتوح</span><span>${earned}/${d.achievements.length}</span></div><div class="achv-grid">`;
  d.achievements.forEach(a => { html += `<div class="achv-card ${a.earned ? 'unlocked' : ''}"><span>${a.earned ? a.icon : '🔒'}</span><span>${a.text}</span></div>`; });
  document.getElementById('achv-body').innerHTML = html + '</div>'; openModal('achv');
};
window.showPlayerCard = () => {
  const d = window.gameData; const season = window.getCurrentSeason?.() || '';
  const frame = (AVATAR_FRAMES || []).find(f => f.id === (d.avatarFrame || 'none')) || { style: '' };
  document.getElementById('player-card-content').innerHTML = `<div class="player-card"><img src="${d.avatar}" style="${frame.style || ''}"><h3>${d.username}</h3><span>${d.rank}</span><div>المستوى ${d.level}</div><div>${d.xp || 0} XP</div></div>`;
  openModal('card');
};
window.sharePlayerCard = async () => {
  const d = window.gameData; const text = `🧠 شغل مخك\n👤 ${d.username} · المستوى ${d.level}\n🏆 ${d.rank}\n⭐ ${d.xp} XP`;
  if (navigator.share) { try { await navigator.share({ title: 'بطاقتي في شغل مخك', text }); } catch (e) {} }
  else { await navigator.clipboard.writeText(text).catch(() => {}); showToast('📋 تم نسخ البطاقة!'); }
};
window.buyHelper = (price) => {
  if (window.gameData.coins < price) { showToast('❌ رصيدك غير كافٍ'); return; }
  window.gameData.coins -= price; const amount = price >= 800 ? 10 : 3;
  window.gameData.inventory.delete += amount; window.gameData.inventory.hint += amount; window.gameData.inventory.skip += amount;
  playSound('snd-buy'); try { confetti({ particleCount: 40, spread: 50 }); } catch (e) {} updateUI(); saveData(); showToast(`✅ تم الشراء! +${amount} لكل وسيلة`);
};
window.claimFreeCoins = () => {
  const today = new Date().toDateString(); if (window.lastFreeCoinsDate === today) { showToast('⏰ عُد غداً!'); return; }
  window.lastFreeCoinsDate = today; window.gameData.coins += 200;
  const btn = document.getElementById('btn-free-coins'); if (btn) { btn.innerText = '✅ تم اليوم'; btn.disabled = true; }
  playSound('snd-buy'); try { confetti({ particleCount: 80, spread: 60 }); } catch (e) {} updateUI(); saveData(); showToast('🎁 +200 عملة مجانية!');
};
window.handleFrameClick = (frame) => {
  const owned = frame.id === 'none' || (window.gameData.ownedFrames || []).includes(frame.id);
  if (owned) { window.gameData.avatarFrame = frame.id; updateUI(); saveData(); renderShop('frames'); showToast(`✅ تم تفعيل إطار: ${frame.name}`); }
  else {
    if (window.gameData.coins < frame.price) { showToast('❌ رصيدك غير كافٍ'); return; }
    showConfirmDialog({
      icon: '🖼️', title: 'شراء الإطار', msg: `${frame.name}\nالسعر: ${frame.price} 💰`, okText: 'شراء', okClass: 'ok',
      onOk: () => {
        window.gameData.coins -= frame.price; if (!window.gameData.ownedFrames) window.gameData.ownedFrames = []; window.gameData.ownedFrames.push(frame.id);
        window.gameData.avatarFrame = frame.id; playSound('snd-buy'); try { confetti({ particleCount: 40, spread: 50 }); } catch (e) {}
        updateUI(); saveData(); renderShop('frames'); showToast(`✅ تم شراء وتفعيل: ${frame.name}`);
      }
    });
  }
};
window.resetGame = () => {
  showConfirmDialog({
    icon: '🗑️', title: 'مسح البيانات', msg: 'سيتم تصفير كل شيء نهائياً\nهل أنت متأكد؟', okText: 'امسح كل شيء', okClass: 'danger',
    onOk: async () => { if (window.currentUser && window.db && window.firebaseReady) { try { await window.db_set(`artifacts/${window.appId}/users/${window.currentUser.uid}/profile/data`, { coins: 500, xp: 0, level: 1 }); } catch (e) {} } location.reload(); }
  });
};
window.requestNotifPermission = async () => {
  if (!("Notification" in window)) { showToast("❌ المتصفح لا يدعم الإشعارات"); return; }
  const perm = await Notification.requestPermission();
  if (perm === "granted") { showToast("🔔 تم تفعيل الإشعارات!"); initSmartNotifications(); }
  else showToast("❌ تم رفض الإشعارات");
};

// نظام الإشعارات الذكية
const NOTIF_ICON = "https://i.postimg.cc/qqTBP312/1000061201.png";
function sendNotification(title, body, tag = "general") {
  if (Notification.permission !== "granted") return;
  try {
    if (navigator.serviceWorker?.controller) { navigator.serviceWorker.ready.then(reg => { reg.showNotification(title, { body, icon: NOTIF_ICON, badge: NOTIF_ICON, dir: "rtl", lang: "ar", tag, renotify: true, vibrate: [150, 80, 150] }).catch(() => {}); }); }
    else { new Notification(title, { body, icon: NOTIF_ICON, tag }); }
  } catch (e) {}
}
function initSmartNotifications() {
  if (Notification.permission !== "granted") return;
  const now = new Date();
  const next8pm = new Date(); next8pm.setHours(20, 0, 0, 0); if (next8pm <= now) next8pm.setDate(next8pm.getDate() + 1);
  setTimeout(() => { const d = window.gameData; if (d?.dailyChallengeDate !== new Date().toDateString()) sendNotification("شغل مخك 🧠", "تحدي اليوم ينتظرك!"); }, next8pm - now);
}
function scheduleNotification() { initSmartNotifications(); }

// حفظ واستكمال الجولة
const SAVED_SESSION_KEY = "shaghel_saved_session_v1";
export function saveGameSession() {
  if (window.isDailyChallenge || window.isRoomGame || window.isWeeklyChallenge) return;
  if (!window.currentQuestions?.length || window.currentIdx === 0) return;
  const session = { questions: window.currentQuestions, idx: window.currentIdx, correct: window.quizCorrect || 0, wrong: window.quizWrong || 0, coins: window.quizCoins || 0, xp: window.quizXP || 0, category: window.selectedCategory || "", sub: window.selectedSub || "", savedAt: Date.now(), uid: window.currentUser?.uid || "anon" };
  try { localStorage.setItem(SAVED_SESSION_KEY, JSON.stringify(session)); } catch (e) {}
}
window.saveGameSession = saveGameSession;
export function clearGameSession() { try { localStorage.removeItem(SAVED_SESSION_KEY); } catch (e) {} }
window.clearGameSession = clearGameSession;
export function getSavedSession() {
  try {
    const raw = localStorage.getItem(SAVED_SESSION_KEY); if (!raw) return null; const s = JSON.parse(raw);
    if (!s.savedAt || Date.now() - s.savedAt > 24 * 60 * 60 * 1000) { clearGameSession(); return null; }
    if (s.uid !== (window.currentUser?.uid || "anon")) { clearGameSession(); return null; }
    if (!s.questions?.length || s.idx >= s.questions.length) { clearGameSession(); return null; }
    return s;
  } catch (e) { return null; }
}
window.checkAndOfferResume = () => {
  const s = getSavedSession(); if (!s) return;
  showConfirmDialog({
    icon: "▶️", title: "جولة محفوظة!", msg: `${s.category} — ${s.sub}\nالسؤال ${s.idx + 1}/10\n✅ ${s.correct} | ❌ ${s.wrong}`, okText: "استكمل", okClass: "ok",
    onOk: () => {
      window.currentQuestions = s.questions; window.currentIdx = s.idx; window.quizCorrect = s.correct; window.quizWrong = s.wrong;
      window.quizCoins = s.coins; window.quizXP = s.xp; window.selectedCategory = s.category; window.selectedSub = s.sub;
      window.isDailyChallenge = false; window.isRoomGame = false; window.isWeeklyChallenge = false;
      clearGameSession(); navTo("quiz"); document.getElementById("q-cat-badge").innerText = `${s.category} • ${s.sub}`;
      showToast(`▶️ استكمال الجولة — السؤال ${s.idx + 1}/10`, 3000); window.showQuestion?.();
    }
  });
};

// أوضاع اللعب
const GAME_MODES = {
  popular: [{ id: 'classic', title: 'كلاسيكي', desc: '10 أسئلة · 15 ثانية', icon: 'fa-play', color: 'gm-blue', info: '10 أسئلة متنوعة، 15 ثانية لكل سؤال.' }],
  challenge: [{ id: 'perfect', title: 'الكمال', desc: 'خطأ واحد = انتهى', icon: 'fa-crosshairs', color: 'gm-purple', info: 'لا يُسمح بأي خطأ!' }],
  custom: [{ id: 'easy', title: 'سهل 🌱', desc: '5 أسئلة · 20 ثانية', icon: 'fa-seedling', color: 'gm-green', info: 'مناسب للمبتدئين.' }]
};
let _gmCat = '', _gmSub = '', _gmIcon = '', _gmSelected = null;
window.openGameMode = (cat, sub, icon) => {
  _gmCat = cat; _gmSub = sub; _gmIcon = icon || '🎯'; _gmSelected = null;
  document.getElementById('gm-cat-icon').innerText = _gmIcon; document.getElementById('gm-cat-name').innerText = cat; document.getElementById('gm-sub-name').innerText = sub;
  window.switchGameModeTab('popular'); document.getElementById('modal-gamemode').style.display = 'flex'; document.body.style.overflow = 'hidden';
};
window.closeGameMode = () => { document.getElementById('modal-gamemode').style.display = 'none'; document.body.style.overflow = ''; };
window.switchGameModeTab = (tab) => {
  document.querySelectorAll('.gm-tab').forEach(btn => { btn.classList.toggle('active', btn.dataset.gmtab === tab); });
  const grid = document.getElementById('gm-modes-grid'); grid.innerHTML = '';
  (GAME_MODES[tab] || []).forEach(mode => { const card = document.createElement('div'); card.className = `gm-card ${mode.color}`; card.innerHTML = `<i class="fas ${mode.icon}"></i><span>${mode.title}</span><small>${mode.desc}</small>`; card.onclick = () => selectGameMode(mode); grid.appendChild(card); });
};
function selectGameMode(mode) {
  _gmSelected = mode; document.querySelectorAll('.gm-card').forEach(c => c.classList.remove('selected')); event.currentTarget.classList.add('selected');
  document.getElementById('gm-info-text').innerText = mode.info; document.getElementById('gm-info-box').style.display = 'block';
  document.getElementById('gm-start-label').innerText = `ابدأ · ${mode.title}`;
}
window.launchSelectedMode = () => { if (!_gmSelected) return; window.closeGameMode(); window._gameModeId = _gmSelected.id; window.startQuiz(_gmCat, _gmSub, false); };

// بدء التطبيق
(async () => {
  await initAuth(); listenToUserData(); navTo('home');
  setTimeout(() => { if (Notification.permission === "granted") initSmartNotifications(); }, 3000);
})();
window.addEventListener("load", () => console.log("🚀 شغل مخك Ultra 4.0 — تم تحميل التطبيق"));
