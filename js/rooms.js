// js/rooms.js
import { db, APP_ID } from './firebase.js';
import { showToast, escapeHtml, playSound } from './helpers.js';
import { navTo, updateUI } from './ui.js';
import { startQuiz } from './quiz.js';
import { saveData, categoryConfig } from './data.js';
import {
  collection, addDoc, query, orderBy, limit, onSnapshot, doc, getDoc, updateDoc, deleteDoc,
  getDocs, where, deleteField, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export let currentRoomId = null;
let roomUnsubscribe = null;
let chatUnsubscribe = null;
let roomsUnsubscribe = null;
const ROOM_EXPIRY_MS = 2 * 60 * 60 * 1000;
const ROOM_MAX_PLAYERS = 8;

function generateRoomCode() { return Math.random().toString(36).substr(2, 6).toUpperCase(); }
function getRoomRef(roomId) { return doc(db, 'artifacts', APP_ID, 'public', 'data', 'rooms', roomId); }
async function deleteRoom(roomId) { try { await deleteDoc(getRoomRef(roomId)); } catch (e) {} }
async function cleanupExpiredRooms() {
  if (!window.firebaseReady) return;
  try {
    const cutoff = Date.now() - ROOM_EXPIRY_MS;
    const snap = await getDocs(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'rooms'), where('createdAt', '<', cutoff), limit(20)));
    const deletes = []; snap.forEach(d => deletes.push(deleteDoc(d.ref))); await Promise.all(deletes);
    if (deletes.length > 0) console.log(`🧹 حُذف ${deletes.length} غرفة منتهية الصلاحية`);
  } catch (e) {}
}

export function createRoom() { buildRoomCatSelect(); window.openModal('create-room'); }
window.createRoom = createRoom;

function buildRoomCatSelect() {
  const sel = document.getElementById('room-cat-select'); if (!sel) return;
  sel.innerHTML = '';
  Object.keys(categoryConfig).forEach(k => { sel.innerHTML += `<option value="${k}">${categoryConfig[k].icon} ${categoryConfig[k].name}</option>`; });
}
window.buildRoomCatSelect = buildRoomCatSelect;

export async function confirmCreateRoom() {
  if (!window.firebaseReady) { showToast('❌ يلزم اتصال بالإنترنت'); return; }
  const name = document.getElementById('room-name-input').value.trim() || `غرفة ${window.gameData.username}`;
  const catKey = document.getElementById('room-cat-select').value;
  if (!catKey) { showToast('❌ اختر تصنيف الأسئلة'); return; }
  const code = generateRoomCode(); const now = Date.now();
  const roomData = {
    name, code, catKey, catName: categoryConfig[catKey].name, host: window.currentUser.uid, hostName: window.gameData.username,
    status: 'waiting', createdAt: now, expiresAt: now + ROOM_EXPIRY_MS,
    players: { [window.currentUser.uid]: { uid: window.currentUser.uid, username: window.gameData.username, avatar: window.gameData.avatar, ready: false, score: 0, joinedAt: now } },
  };
  try {
    const ref = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'rooms'), roomData);
    currentRoomId = ref.id; window.closeModal('create-room'); showToast(`✅ غرفة "${name}" — كود: ${code}`);
    if (!window.gameData.detailedStats) window.gameData.detailedStats = {};
    window.gameData.detailedStats.hostedRooms = (window.gameData.detailedStats.hostedRooms || 0) + 1;
    if (window.gameData.detailedStats.hostedRooms >= 5) {
      const ach = window.gameData.achievements.find(a => a.id === 'host_5');
      if (ach && !ach.earned) { ach.earned = true; showToast('🏰 إنجاز: ملك الغرف!', 4000); }
    }
    saveData(); listenLobby(ref.id); navTo('lobby');
  } catch (e) { showToast('❌ خطأ: ' + e.message); }
}
window.confirmCreateRoom = confirmCreateRoom;

export async function joinRoomByCode() {
  const code = document.getElementById('join-code-input').value.trim().toUpperCase();
  if (!code || code.length < 4) { showToast('❌ أدخل الكود الصحيح'); return; }
  if (!window.firebaseReady) { showToast('❌ يلزم اتصال بالإنترنت'); return; }
  try {
    const snap = await getDocs(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'rooms'), where('code', '==', code), where('status', '==', 'waiting'), limit(1)));
    if (snap.empty) { showToast('❌ غرفة غير موجودة أو اللعب بدأ بالفعل'); return; }
    const roomDoc = snap.docs[0]; const roomData = roomDoc.data();
    if (roomData.expiresAt && Date.now() > roomData.expiresAt) { await deleteRoom(roomDoc.id); showToast('❌ هذه الغرفة منتهية الصلاحية'); return; }
    const playerCount = Object.keys(roomData.players || {}).length;
    if (playerCount >= ROOM_MAX_PLAYERS) { showToast('❌ الغرفة ممتلئة'); return; }
    window.closeModal('join-room'); await joinRoomById(roomDoc.id);
  } catch (e) { showToast('❌ خطأ: ' + e.message); }
}
window.joinRoomByCode = joinRoomByCode;

export async function joinRoomById(roomId) {
  if (!window.currentUser) return;
  currentRoomId = roomId; const roomRef = getRoomRef(roomId);
  try {
    await updateDoc(roomRef, { [`players.${window.currentUser.uid}`]: { uid: window.currentUser.uid, username: window.gameData.username, avatar: window.gameData.avatar, ready: false, score: 0, joinedAt: Date.now() } });
    listenLobby(roomId); navTo('lobby');
  } catch (e) { showToast('❌ تعذر الانضمام: ' + e.message); }
}
window.joinRoomById = joinRoomById;

export function listenLobby(roomId) {
  if (roomUnsubscribe) roomUnsubscribe();
  const ref = getRoomRef(roomId);
  roomUnsubscribe = onSnapshot(ref, snap => {
    if (!snap.exists()) { showToast('⚠️ الغرفة أُغلقت من المضيف'); navTo('rooms'); return; }
    const room = snap.data(); const isHost = room.host === window.currentUser.uid; const players = Object.values(room.players || {}); const count = players.length;
    document.getElementById('lobby-room-name').innerText = room.name; document.getElementById('lobby-room-code').innerText = `كود: ${room.code}`;
    renderLobbyPlayers(room, isHost);
    const startBtn = document.getElementById('start-room-btn'); const waitMsg = document.getElementById('waiting-msg'); const readyBtn = document.getElementById('ready-toggle-btn');
    if (isHost) {
      const allReady = players.filter(p => p.uid !== room.host).every(p => p.ready); const canStart = count >= 2;
      if (startBtn) { startBtn.style.display = canStart ? 'block' : 'none'; startBtn.style.background = allReady ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'var(--grad)'; startBtn.innerText = allReady ? '✅ كل اللاعبين جاهزون — ابدأ!' : 'ابدأ اللعبة 🎮'; }
      if (waitMsg) waitMsg.style.display = canStart ? 'none' : 'block';
      if (readyBtn) readyBtn.style.display = 'none';
    } else {
      if (startBtn) startBtn.style.display = 'none';
      if (waitMsg) waitMsg.style.display = 'none';
      const myReady = room.players?.[window.currentUser.uid]?.ready || false;
      if (readyBtn) { readyBtn.style.display = 'block'; readyBtn.innerText = myReady ? '✅ أنا جاهز (اضغط للإلغاء)' : '👆 اضغط للاستعداد'; readyBtn.style.background = myReady ? 'rgba(34,197,94,.15)' : 'rgba(255,255,255,.07)'; readyBtn.style.color = myReady ? '#22c55e' : 'var(--text2)'; readyBtn.style.border = myReady ? '1px solid rgba(34,197,94,.3)' : '1px solid rgba(255,255,255,.1)'; }
    }
    if (room.status === 'playing' && !isHost) startRoomGameAsPlayer(room);
    if (room.expiresAt && Date.now() > room.expiresAt) { showToast('⏰ انتهت صلاحية الغرفة'); if (isHost) deleteRoom(currentRoomId); leaveRoom(); }
  });
  listenChat(roomId);
}

function renderLobbyPlayers(room, isHost) {
  const container = document.getElementById('waiting-players'); if (!container) return;
  container.innerHTML = '';
  const players = Object.values(room.players || {}).sort((a, b) => a.uid === room.host ? -1 : b.uid === room.host ? 1 : (a.joinedAt || 0) - (b.joinedAt || 0));
  players.forEach(p => {
    const isMe = p.uid === window.currentUser.uid; const isMod = p.uid === room.host;
    container.innerHTML += `
      <div class="player-item" style="${isMe ? 'background:rgba(251,191,36,.04);' : ''}">
        <img src="${p.avatar || 'https://i.postimg.cc/qqTBP312/1000061201.png'}" class="player-avatar" style="border:2px solid ${isMe ? 'var(--accent)' : isMod ? '#22c55e' : 'rgba(255,255,255,.1)'}">
        <div style="flex:1"><span style="color:${isMe ? 'var(--accent)' : '#fff'}">${p.username}${isMe ? ' (أنت)' : ''}</span><small>${isMod ? '👑 المضيف' : '🎮 لاعب'}</small></div>
        ${isHost && p.uid !== room.host ? `<button onclick="window.kickPlayer('${p.uid}')" class="kick-btn">طرد</button>` : ''}
        <span class="ready-badge ${p.ready ? 'yes' : 'no'}">${p.ready ? '✅' : '⏳'}</span>
      </div>`;
  });
}

function listenChat(roomId) {
  if (chatUnsubscribe) chatUnsubscribe();
  const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'rooms', roomId, 'messages'), orderBy('timestamp', 'asc'), limit(50));
  chatUnsubscribe = onSnapshot(q, snapshot => {
    const container = document.getElementById('lobby-chat-messages'); if (!container) return;
    container.innerHTML = '';
    snapshot.forEach(doc => {
      const msg = doc.data(); const isMe = msg.uid === window.currentUser?.uid;
      const div = document.createElement('div'); div.className = `chat-message ${isMe ? 'me' : ''}`;
      div.innerHTML = `<strong>${msg.username}</strong><span>${escapeHtml(msg.text)}</span><small>${new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</small>`;
      container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
  });
}

export async function sendLobbyMessage() {
  const input = document.getElementById('lobby-chat-input'); const text = input?.value.trim();
  if (!text || !currentRoomId || !window.currentUser) return;
  input.value = '';
  try {
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'rooms', currentRoomId, 'messages'), { text, uid: window.currentUser.uid, username: window.gameData.username, timestamp: Date.now() });
    if (!window.gameData.detailedStats) window.gameData.detailedStats = {};
    window.gameData.detailedStats.messagesSent = (window.gameData.detailedStats.messagesSent || 0) + 1;
    if (window.gameData.detailedStats.messagesSent >= 20) {
      const ach = window.gameData.achievements.find(a => a.id === 'chatty'); if (ach && !ach.earned) { ach.earned = true; showToast('💬 إنجاز: مُحاور لبق!', 4000); }
    }
    saveData();
  } catch (e) { showToast('❌ فشل إرسال الرسالة'); }
}
window.sendLobbyMessage = sendLobbyMessage;

export async function toggleReady() {
  if (!currentRoomId || !window.currentUser) return;
  const roomRef = getRoomRef(currentRoomId);
  try {
    const snap = await getDoc(roomRef); if (!snap.exists()) return;
    const currentReady = snap.data()?.players?.[window.currentUser.uid]?.ready || false;
    await updateDoc(roomRef, { [`players.${window.currentUser.uid}.ready`]: !currentReady });
  } catch (e) {}
}
window.toggleReady = toggleReady;

export async function kickPlayer(uid) {
  if (!currentRoomId || !window.currentUser) return;
  try { await updateDoc(getRoomRef(currentRoomId), { [`players.${uid}`]: deleteField() }); showToast('👟 تم طرد اللاعب'); } catch (e) {}
}
window.kickPlayer = kickPlayer;

export async function startRoomGame() {
  if (!currentRoomId) return;
  const btn = document.getElementById('start-room-btn'); if (btn) { btn.disabled = true; btn.innerText = '⏳ جاري التحضير...'; }
  try {
    const roomSnap = await getDoc(getRoomRef(currentRoomId)); if (!roomSnap.exists()) { showToast('❌ الغرفة غير موجودة'); return; }
    const room = roomSnap.data(); const catKey = room.catKey; const catName = room.catName || categoryConfig[catKey]?.name;
    const subs = categoryConfig[catKey]?.subs || []; const subName = subs[Math.floor(Math.random() * subs.length)];
    showToast(`🎯 تصنيف: ${catName} — ${subName}`);
    let pool = []; if (typeof window.fetchQuestions === 'function') pool = await window.fetchQuestions(catName, subName);
    if (pool.length < 5) for (const s of subs) { if (s === subName) continue; const extra = await window.fetchQuestions(catName, s); pool = [...pool, ...extra]; if (pool.length >= 10) break; }
    if (!pool.length) { showToast('❌ لا توجد أسئلة في هذا التصنيف'); if (btn) { btn.disabled = false; btn.innerText = 'ابدأ اللعبة 🎮'; } return; }
    const qs = pool.sort(() => 0.5 - Math.random()).slice(0, 10);
    await updateDoc(getRoomRef(currentRoomId), { status: 'playing', questions: qs, startedAt: Date.now(), catName, subName });
    window.currentQuestions = qs; window.currentIdx = 0; window.quizCorrect = 0; window.quizWrong = 0; window.quizCoins = 0; window.quizXP = 0;
    window.isRoomGame = true; window.isDailyChallenge = false; window.selectedCategory = catName; window.selectedSub = subName;
    navTo('quiz'); window.showQuestion();
  } catch (e) { showToast('❌ ' + e.message); if (btn) { btn.disabled = false; btn.innerText = 'ابدأ اللعبة 🎮'; } }
}
window.startRoomGame = startRoomGame;

function startRoomGameAsPlayer(room) {
  if (!room.questions || room.questions.length === 0) return; if (window._roomGameStarted) return; window._roomGameStarted = true;
  window.currentQuestions = room.questions; window.currentIdx = 0; window.quizCorrect = 0; window.quizWrong = 0; window.quizCoins = 0; window.quizXP = 0;
  window.isRoomGame = true; window.isDailyChallenge = false; window.selectedCategory = room.catName || 'غرفة'; window.selectedSub = room.subName || '';
  showToast('🎮 اللعبة بدأت!'); navTo('quiz'); window.showQuestion();
}

export async function syncRoomScore() {
  if (!currentRoomId || !window.currentUser) return;
  try { await updateDoc(getRoomRef(currentRoomId), { [`players.${window.currentUser.uid}.score`]: window.quizCorrect, [`players.${window.currentUser.uid}.done`]: true }); } catch (e) {}
}
window.syncRoomScore = syncRoomScore;

export async function finishRoomGame() {
  if (!currentRoomId || !window.currentUser) return; await syncRoomScore(); window._roomGameStarted = false;
  const achv = window.gameData.achievements.find(a => a.id === 'social'); if (achv && !achv.earned) { achv.earned = true; showToast('👥 إنجاز: لعبت في غرفة جماعية!'); }
  setTimeout(async () => {
    try { const snap = await getDoc(getRoomRef(currentRoomId)); if (snap.exists()) { const room = snap.data(); const players = Object.values(room.players || {}).sort((a, b) => (b.score || 0) - (a.score || 0)); const myRank = players.findIndex(p => p.uid === window.currentUser.uid) + 1; if (myRank === 1) showToast('🏆 أنت الأول في الغرفة!', 4000); else if (myRank === 2) showToast('🥈 المركز الثاني', 3500); else if (myRank === 3) showToast('🥉 المركز الثالث', 3000); } } catch (e) {}
    if (window.currentUser.uid) { try { const snap2 = await getDoc(getRoomRef(currentRoomId)); if (snap2.exists() && snap2.data().host === window.currentUser.uid) { await updateDoc(getRoomRef(currentRoomId), { status: 'finished', finishedAt: Date.now() }); setTimeout(() => deleteRoom(currentRoomId), 5 * 60 * 1000); } } catch (e) {} }
    if (roomUnsubscribe) roomUnsubscribe();
  }, 2000);
}
window.finishRoomGame = finishRoomGame;

export async function leaveRoom() {
  if (roomUnsubscribe) { roomUnsubscribe(); roomUnsubscribe = null; } if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; } window._roomGameStarted = false;
  if (currentRoomId && window.currentUser) {
    try {
      const snap = await getDoc(getRoomRef(currentRoomId));
      if (snap.exists()) {
        const room = snap.data(); const isHost = room.host === window.currentUser.uid; const players = Object.keys(room.players || {});
        if (isHost) {
          if (players.length <= 1) { await deleteRoom(currentRoomId); showToast('🗑️ تم إغلاق الغرفة'); }
          else { const newHost = players.find(uid => uid !== window.currentUser.uid); await updateDoc(getRoomRef(currentRoomId), { host: newHost, [`players.${window.currentUser.uid}`]: deleteField() }); showToast('👑 تم نقل قيادة الغرفة للاعب آخر'); }
        } else { await updateDoc(getRoomRef(currentRoomId), { [`players.${window.currentUser.uid}`]: deleteField() }); }
      }
    } catch (e) {}
  }
  currentRoomId = null; navTo('rooms');
}
window.leaveRoom = leaveRoom;

export function loadRooms() {
  const list = document.getElementById('rooms-list'); if (!list) return; if (roomsUnsubscribe) roomsUnsubscribe();
  if (!window.firebaseReady) { list.innerHTML = '<div class="empty-state">يلزم اتصال بالإنترنت</div>'; return; }
  cleanupExpiredRooms();
  list.innerHTML = '<div class="loading">جاري تحميل الغرف...</div>';
  const now = Date.now();
  roomsUnsubscribe = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'rooms'), where('status', '==', 'waiting'), where('expiresAt', '>', now), orderBy('createdAt', 'desc'), limit(10)), snap => {
    list.innerHTML = '';
    if (snap.empty) { list.innerHTML = '<div class="empty-state">لا توجد غرف نشطة الآن</div>'; return; }
    snap.forEach(d => {
      const r = d.data(); const pc = Object.keys(r.players || {}).length; const isFull = pc >= ROOM_MAX_PLAYERS;
      const el = document.createElement('div'); el.className = 'room-card';
      el.innerHTML = `<div><strong>${r.name || 'غرفة'}</strong><span>${r.catName || 'عام'} · ${pc}/${ROOM_MAX_PLAYERS}</span><span>🔑 ${r.code}</span></div><button onclick="window.joinRoomById('${d.id}')" ${isFull ? 'disabled' : ''}>${isFull ? 'ممتلئة' : 'انضمام'}</button>`;
      list.appendChild(el);
    });
  });
}
window.loadRooms = loadRooms;
window.openJoinRoomModal = () => window.openModal('join-room');
