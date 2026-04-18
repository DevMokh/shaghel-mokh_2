// js/friends.js
import { showToast } from './helpers.js';
import { saveData } from './data.js';
import { db, APP_ID } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

function generateFriendCode(uid) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code = '';
  for (let i = 0; i < 6; i++) code += chars[uid.charCodeAt(i % uid.length) % chars.length];
  return code;
}

export function showFriendsModal() {
  const uid = window.currentUser?.uid; if (!uid) { showToast('❌ يلزم تسجيل الدخول'); return; }
  const code = generateFriendCode(uid); window.gameData.friendCode = code;
  document.getElementById('my-friend-code').innerText = code; renderFriendsList();
  document.getElementById('modal-friends')?.classList.add('active'); document.body.style.overflow = 'hidden';
}
window.showFriendsModal = showFriendsModal;

export async function copyFriendCode() {
  const code = window.gameData.friendCode || generateFriendCode(window.currentUser?.uid || 'x');
  const shareText = `📲 تعال العب معي في شغل مخك!\nكودي: ${code}\n🧠 انضم الآن وتنافس!`;
  if (navigator.share) { try { await navigator.share({ title: 'شغل مخك 🧠', text: shareText }); return; } catch (e) {} }
  try { await navigator.clipboard.writeText(shareText); showToast('📋 تم نسخ الكود: ' + code); } catch (e) { showToast('كودك: ' + code, 5000); }
}
window.copyFriendCode = copyFriendCode;

export async function addFriendByCode() {
  const inputEl = document.getElementById('friend-code-input'); const inputCode = inputEl?.value.trim().toUpperCase();
  if (!inputCode || inputCode.length < 6) { showToast('❌ أدخل الكود الصحيح (6 أحرف)'); return; }
  if (!window.firebaseReady) { showToast('❌ يلزم اتصال بالإنترنت'); return; }
  const myCode = generateFriendCode(window.currentUser.uid); if (inputCode === myCode) { showToast('😄 ده كودك أنت!'); return; }
  const addBtn = document.getElementById('btn-add-friend'); if (addBtn) { addBtn.disabled = true; addBtn.innerText = '⏳'; }
  try {
    const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'rankings')); let found = null;
    snap.forEach(d => { const u = d.data(); if (generateFriendCode(u.uid || d.id) === inputCode) found = { ...u, uid: u.uid || d.id }; });
    if (!found) { showToast('❌ لم يتم العثور على هذا اللاعب'); return; }
    if (!window.gameData.friends) window.gameData.friends = [];
    const already = window.gameData.friends.some(f => f.uid === found.uid); if (already) { showToast('👥 هذا الشخص صديقك بالفعل!'); return; }
    window.gameData.friends.push({ uid: found.uid, username: found.username, level: found.level || 1, xp: found.xp || 0, avatar: found.avatar || '', addedAt: Date.now() });
    const friendsCount = window.gameData.friends.length;
    if (friendsCount >= 3) { const ach = window.gameData.achievements?.find(a => a.id === 'friend_3'); if (ach && !ach.earned) { ach.earned = true; setTimeout(() => showToast('🤝 إنجاز: 3 أصدقاء!', 4000), 600); } }
    saveData(); renderFriendsList(); if (inputEl) inputEl.value = ''; showToast(`✅ أضفت ${found.username} كصديق! 🎉`);
    try { confetti({ particleCount: 50, spread: 60 }); } catch (e) {}
  } catch (e) { showToast('❌ خطأ: ' + e.message); }
  finally { if (addBtn) { addBtn.disabled = false; addBtn.innerText = 'إضافة'; } }
}
window.addFriendByCode = addFriendByCode;

async function renderFriendsList() {
  const list = document.getElementById('friends-list'); if (!list) return;
  const friends = window.gameData.friends || [];
  if (!friends.length) { list.innerHTML = '<div class="empty-state">لا يوجد أصدقاء بعد</div>'; return; }
  _renderFriendsBasic(list, friends);
  if (!window.firebaseReady) return;
  try {
    const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'rankings')); const liveData = {};
    snap.forEach(d => { const u = d.data(); if (u.uid) liveData[u.uid] = u; });
    let changed = false;
    window.gameData.friends.forEach(f => { const live = liveData[f.uid]; if (live) { if (live.xp !== f.xp || live.level !== f.level) { f.xp = live.xp || f.xp; f.level = live.level || f.level; f.avatar = live.avatar || f.avatar; changed = true; } } });
    if (changed) { saveData(); _renderFriendsBasic(list, window.gameData.friends); }
  } catch (e) {}
}

function _renderFriendsBasic(list, friends) {
  const myXP = window.gameData.xp || 0; const sorted = [...friends].sort((a, b) => (b.xp || 0) - (a.xp || 0));
  list.innerHTML = sorted.map((f, i) => {
    const fXP = f.xp || 0; const isAhead = fXP > myXP; const diff = Math.abs(fXP - myXP);
    const diffBadge = isAhead ? `<span class="ahead">↑ ${diff.toLocaleString()} XP</span>` : diff > 0 ? `<span class="behind">↓ ${diff.toLocaleString()} XP</span>` : `<span class="equal">🤝 متعادلان</span>`;
    return `<div class="friend-item"><span>${i + 1}</span><span>${(f.username || '؟').slice(0, 2)}</span><span>${f.username || 'لاعب'}</span><span>مستوى ${f.level || 1}</span>${diffBadge}<button onclick="window.removeFriend('${f.uid}')">✕</button></div>`;
  }).join('');
}

export function removeFriend(uid) {
  window.gameData.friends = (window.gameData.friends || []).filter(f => f.uid !== uid); saveData(); renderFriendsList(); showToast('تم إزالة الصديق');
}
window.removeFriend = removeFriend;
