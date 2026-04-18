// js/challenges.js
import { showToast, playSound } from './helpers.js';
import { startQuiz } from './quiz.js';
import { navTo, updateUI } from './ui.js';
import { db, APP_ID, getCurrentSeason, getWeekId } from './firebase.js';
import { saveData, getSeasonRank, getSeasonProgress, addSeasonXP } from './data.js';
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const categoryConfig = {
  islamic: { name: "إسلاميات", subs: ["قصص الأنبياء", "القرآن الكريم", "السيرة النبوية", "الفقه الميسر"] },
  egypt:   { name: "تاريخ مصر", subs: ["الفراعنة", "مصر الحديثة", "آثار النوبة", "ثورات مصر"] },
  tech:    { name: "تقنية", subs: ["برمجة", "ذكاء اصطناعي", "أمن سيبراني", "تاريخ الحواسيب"] },
  science: { name: "علوم وفضاء", subs: ["الفضاء", "جسم الإنسان", "الكيمياء", "الفيزياء الكمية"] },
  geo:     { name: "جغرافيا", subs: ["عواصم", "أعلام", "عجائب الدنيا", "تضاريس الأرض"] },
  sports:  { name: "رياضة", subs: ["كرة قدم", "أساطير", "الأولمبياد", "كأس العالم"] },
  puzzles: { name: "ألغاز", subs: ["منطق", "أحجيات", "رياضيات", "ذكاء بصري"] },
  food:    { name: "طعام", subs: ["أطباق عالمية", "حلويات", "توابل", "فواكه نادرة"] },
  cairo:   { name: "أحياء القاهرة", subs: ["وسط البلد", "المعادي والزمالك", "الإسكندرية", "مدن جديدة"] },
  words:   { name: "كلمات مصرية", subs: ["أمثال شعبية", "كلمات قبطية", "عامية قديمة", "ألقاب ومسميات"] },
  music:   { name: "موسيقى وأغاني", subs: ["أغاني الزمن الجميل", "فيروز وأم كلثوم", "نجوم الـ 80s", "مهرجانات"] },
  cinema:  { name: "سينما وتليفزيون", subs: ["أفلام الـ 90s", "نجوم الشاشة", "مسلسلات رمضان", "كلاكيت زمان"] },
};

const ALL_CATS = Object.keys(categoryConfig);

const FALLBACK = [
  { t: "ما عاصمة مصر؟", a: ["الإسكندرية", "القاهرة", "أسوان", "الجيزة"], c: 1, x: "القاهرة عاصمة مصر وأكبر مدنها" },
  { t: "كم عدد أركان الإسلام؟", a: ["3", "4", "5", "6"], c: 2, x: "أركان الإسلام الخمسة: الشهادتان، الصلاة، الزكاة، الصوم، الحج" },
  { t: "أكبر كوكب في المجموعة الشمسية؟", a: ["زحل", "المشتري", "أورانوس", "نبتون"], c: 1, x: "المشتري أكبر كوكب، حجمه أكثر من 1300 مرة حجم الأرض" },
  { t: "من اخترع الهاتف؟", a: ["إديسون", "فاراداي", "غراهام بيل", "نيوتن"], c: 2, x: "اخترع غراهام بيل الهاتف عام 1876" },
  { t: "ما اختصار CPU؟", a: ["Control Power Unit", "Central Processing Unit", "Computer Power Unit", "Core Processing Unit"], c: 1, x: "CPU هي وحدة المعالجة المركزية" },
  { t: "كم يوماً في السنة الكبيسة؟", a: ["364", "365", "366", "367"], c: 2, x: "السنة الكبيسة تحتوي 366 يوماً" },
  { t: "أعمق محيطات العالم؟", a: ["الهندي", "الأطلسي", "المتجمد الشمالي", "الهادئ"], c: 3, x: "المحيط الهادئ هو الأكبر والأعمق" },
  { t: "من رسم الموناليزا؟", a: ["ميكيلانجيلو", "رافاييل", "ليوناردو دافينشي", "بيكاسو"], c: 2, x: "رسمها ليوناردو دافينشي بين 1503-1519" },
  { t: "كم سورة في القرآن الكريم؟", a: ["110", "112", "114", "116"], c: 2, x: "القرآن الكريم يتكون من 114 سورة" },
  { t: "أطول نهر في العالم؟", a: ["الأمازون", "النيل", "المسيسيبي", "الفولغا"], c: 1, x: "نهر النيل في أفريقيا هو الأطول بطول 6650 كم" },
];

export async function startDailyChallenge() {
  document.getElementById('q-cat-badge').innerText = '📅 تحدي اليوم';
  let pool = [];
  if (window.firebaseReady) {
    const today = new Date().toISOString().slice(0, 10);
    const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
    const catKeys = ALL_CATS;
    const pickedKey = catKeys[seed % catKeys.length];
    const pickedName = categoryConfig[pickedKey].name;
    const pickedSubs = categoryConfig[pickedKey].subs;
    const pickedSub = pickedSubs[seed % pickedSubs.length];
    try {
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'questions'), where('category', '==', pickedName), where('subCategory', '==', pickedSub));
      const snap = await getDocs(q);
      snap.forEach(d => pool.push(d.data()));
    } catch (e) { console.warn('Daily fetch:', e); }
  }
  if (!pool.length) pool = FALLBACK.slice();
  const today = new Date().toISOString().slice(0, 10);
  const seed = today.split('-').join('');
  const seeded = [...pool].sort((a, b) => {
    const ha = (parseInt(seed + a.t?.slice(0, 2) || '0', 36) || 1) % 100;
    const hb = (parseInt(seed + b.t?.slice(0, 2) || '0', 36) || 1) % 100;
    return ha - hb;
  }).slice(0, 10);
  window.currentQuestions = seeded; window.currentIdx = 0; window.quizCorrect = 0; window.quizWrong = 0; window.quizCoins = 0; window.quizXP = 0;
  window.isDailyChallenge = true; window.isRoomGame = false; window.selectedCategory = 'تحدي اليوم'; window.selectedSub = 'عام';
  navTo('quiz'); window.showQuestion();
}
window.startDailyChallenge = startDailyChallenge;

export async function renderDailyChallenge() {
  if (window._dailyCountdownInterval) clearInterval(window._dailyCountdownInterval);
  window._dailyCountdownInterval = setInterval(() => {
    const el = document.getElementById('daily-countdown-timer'); if (!el) { clearInterval(window._dailyCountdownInterval); return; }
    const now = new Date(); const mid = new Date(now); mid.setHours(24, 0, 0, 0); const diff = mid - now;
    el.innerText = String(Math.floor(diff / 3600000)).padStart(2, '0') + ':' + String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0') + ':' + String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  }, 1000);
  const today = new Date().toDateString(); const todayISO = new Date().toISOString().slice(0, 10); const d = window.gameData; const done = d.dailyChallengeDate === today;
  const now = new Date(); const midnight = new Date(now); midnight.setHours(24, 0, 0, 0); const diff = midnight - now;
  const hh = String(Math.floor(diff / 3600000)).padStart(2, '0'); const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'); const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  const header = document.getElementById('daily-header-card');
  if (header) {
    header.className = 'daily-header' + (done ? ' daily-completed' : '');
    header.innerHTML = done
      ? `<div class="daily-date">تحدي ${todayISO}</div><div class="daily-score-display">✅ ${d.dailyChallengeScore}/10</div><div class="daily-desc">أحسنت! لقد أكملت تحدي اليوم</div><div class="daily-countdown">التحدي القادم بعد ${hh}:${mm}:${ss}</div>`
      : `<div class="daily-date">تحدي ${todayISO}</div><div class="daily-countdown" id="daily-countdown-timer">${hh}:${mm}:${ss}</div><div class="daily-desc">نفس الأسئلة لجميع اللاعبين اليوم</div><button onclick="window.startDailyChallenge()" class="primary-btn">ابدأ التحدي 🎯</button>`;
  }
  const ldr = document.getElementById('daily-leader-list');
  if (ldr) {
    ldr.innerHTML = '<div class="loading">جاري التحميل...</div>';
    if (window.firebaseReady) {
      try {
        const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `daily_${todayISO}`));
        let rows = []; snap.forEach(d => rows.push(d.data())); rows.sort((a, b) => b.score - a.score);
        if (!rows.length) { ldr.innerHTML = '<div class="empty-state">لا يوجد لاعبون بعد — كن الأول!</div>'; return; }
        ldr.innerHTML = '';
        rows.slice(0, 10).forEach((u, i) => {
          const isMe = u.uid === window.currentUser?.uid;
          ldr.innerHTML += `<div class="leader-item ${isMe ? 'me' : ''}"><span>${i + 1}</span><img src="${u.avatar || 'https://i.postimg.cc/qqTBP312/1000061201.png'}"><span>${u.username}</span><span>${u.score}/10</span></div>`;
        });
      } catch (e) { ldr.innerHTML = '<div class="empty-state">فشل التحميل</div>'; }
    }
  }
}
window.renderDailyChallenge = renderDailyChallenge;

export async function startWeeklyChallenge() {
  const weekId = getWeekId();
  document.getElementById('q-cat-badge').innerText = `🏆 أسبوع ${weekId}`;
  let pool = [];
  if (window.firebaseReady) {
    const seed = weekId.split('-').reduce((a, b) => a + (parseInt(b) || 0), 0);
    const catKeys = ALL_CATS;
    const pickedKey = catKeys[seed % catKeys.length];
    const pickedName = categoryConfig[pickedKey].name;
    const pickedSubs = categoryConfig[pickedKey].subs;
    const pickedSub = pickedSubs[seed % pickedSubs.length];
    try {
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'questions'), where('category', '==', pickedName), where('subCategory', '==', pickedSub));
      const snap = await getDocs(q);
      snap.forEach(d => pool.push(d.data()));
    } catch (e) { console.warn('Weekly fetch:', e); }
  }
  if (!pool.length) pool = FALLBACK.slice();
  const weekSeed = getWeekId().split('-').join('');
  const seeded = [...pool].sort((a, b) => {
    const ha = (parseInt(weekSeed + a.t?.slice(0, 2) || '0', 36) || 1) % 100;
    const hb = (parseInt(weekSeed + b.t?.slice(0, 2) || '0', 36) || 1) % 100;
    return ha - hb;
  }).slice(0, 10);
  window.currentQuestions = seeded; window.currentIdx = 0; window.quizCorrect = 0; window.quizWrong = 0; window.quizCoins = 0; window.quizXP = 0;
  window.isWeeklyChallenge = true; window.isDailyChallenge = false; window.isRoomGame = false; window.selectedCategory = 'التحدي الأسبوعي'; window.selectedSub = 'عام';
  navTo('quiz'); window.showQuestion();
}
window.startWeeklyChallenge = startWeeklyChallenge;

export async function renderWeeklyChallenge() {
  window.switchChallengeTab('weekly');
  const weekId = getWeekId(); const d = window.gameData; const wc = d.weeklyChallenge || {}; const done = wc.weekId === weekId && wc.completed;
  const now = new Date(); const sunday = new Date(now); sunday.setDate(now.getDate() + (7 - now.getDay()) % 7 || 7); sunday.setHours(0, 0, 0, 0); const diff = sunday - now;
  const days = Math.floor(diff / 86400000); const hours = Math.floor((diff % 86400000) / 3600000); const mins = Math.floor((diff % 3600000) / 60000);
  const header = document.getElementById('weekly-header-card');
  if (header) {
    if (done) {
      header.innerHTML = `<div>✅ أسبوع ${weekId} — مكتمل!</div><div>${wc.score || 0}/10</div><div>🎉 ربحت ${(wc.reward || 1000).toLocaleString()} عملة!</div>`;
    } else {
      const seasonXP = (d.seasonData?.xp || 0); const rankData = getSeasonRank(seasonXP); const baseReward = 1000; const rankBonus = ['برونز', 'فضي', 'ذهبي', 'بلاتيني', 'ألماسي'].indexOf(rankData.name) * 200; const totalReward = baseReward + rankBonus;
      header.innerHTML = `<div>أسبوع ${weekId}</div><div>⏳ ${days > 0 ? days + ' يوم و ' : ''}${hours} ساعة و ${mins} دقيقة</div><div>💰 ${totalReward.toLocaleString()} عملة</div><button onclick="window.startWeeklyChallenge()" class="primary-btn">ابدأ التحدي الأسبوعي 🏆</button>`;
    }
  }
  const ldr = document.getElementById('weekly-leader-list');
  if (ldr) {
    ldr.innerHTML = '<div class="loading">جاري التحميل...</div>';
    if (window.firebaseReady) {
      try {
        const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `weekly_${weekId}`));
        let rows = []; snap.forEach(d => rows.push(d.data())); rows.sort((a, b) => (b.score - a.score) || (a.ts - b.ts));
        if (!rows.length) { ldr.innerHTML = '<div class="empty-state">لا يوجد مشاركون بعد — كن الأول!</div>'; return; }
        ldr.innerHTML = '';
        rows.slice(0, 20).forEach((u, i) => {
          const isMe = u.uid === window.currentUser?.uid;
          ldr.innerHTML += `<div class="leader-item ${isMe ? 'me' : ''}"><span>${i + 1}</span><span>${(u.username || '؟').slice(0, 2)}</span><span>${u.username || 'لاعب'}</span><span>${u.score}/10</span></div>`;
        });
      } catch (e) { ldr.innerHTML = '<div class="empty-state">تعذر التحميل</div>'; }
    }
  }
  const dot = document.getElementById('weekly-notif-dot'); if (dot) dot.classList.toggle('show', !done);
}
window.renderWeeklyChallenge = renderWeeklyChallenge;

export async function renderSeasonTab() {
  const d = window.gameData; const season = getCurrentSeason(); const sd = d.seasonData || {}; const seasonXP = sd.xp || 0; const prog = getSeasonProgress(seasonXP);
  const card = document.getElementById('season-card');
  if (card) {
    card.style.background = `linear-gradient(135deg,${prog.rank.color}18,${prog.rank.color}08)`; card.style.border = `1px solid ${prog.rank.color}40`;
    card.innerHTML = `<div>موسم ${season}</div><div>${prog.rank.emoji}</div><div>${prog.rank.name}</div><div>${seasonXP.toLocaleString()} XP موسمي</div>`;
  }
  const ldr = document.getElementById('season-leader-list');
  if (ldr) {
    ldr.innerHTML = '<div class="loading">جاري التحميل...</div>';
    if (window.firebaseReady) {
      try {
        const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'rankings'));
        let leaders = []; snap.forEach(doc => leaders.push(doc.data())); leaders.sort((a, b) => ((b[`season_${season}`] || 0) - (a[`season_${season}`] || 0))); leaders = leaders.slice(0, 15);
        if (!leaders.length) { ldr.innerHTML = '<div class="empty-state">لا يوجد لاعبون بعد 🌟</div>'; return; }
        ldr.innerHTML = '';
        leaders.forEach((u, i) => {
          const isMe = u.uid === window.currentUser?.uid; const sXP = u[`season_${season}`] || 0; const uRank = getSeasonRank(sXP);
          ldr.innerHTML += `<div class="leader-item ${isMe ? 'me' : ''}"><span>${i + 1}</span><span>${uRank.emoji}</span><span>${u.username || 'لاعب'}</span><span>${sXP.toLocaleString()} XP</span></div>`;
        });
      } catch (e) { ldr.innerHTML = '<div class="empty-state">تعذر التحميل</div>'; }
    }
  }
}
window.renderSeasonTab = renderSeasonTab;

export function renderWeeklyTasksTab() {
  const d = window.gameData; const weekId = getWeekId(); const ls = d.loginStreak || {};
  if (!d.weeklyTasks) d.weeklyTasks = [];
  d.weeklyTasks.forEach(t => { if (t.weekId !== weekId) { t.weekId = weekId; t.current = 0; t.claimed = false; } });
  const tasksList = document.getElementById('weekly-tasks-list');
  if (tasksList) {
    tasksList.innerHTML = '';
    (d.weeklyTasks || []).forEach(t => {
      const pct = Math.min((t.current / t.goal) * 100, 100); const isDone = t.claimed;
      tasksList.innerHTML += `<div class="task-card ${isDone ? 'done' : ''}"><span>${t.text}</span><div class="progress-bar"><div style="width:${pct}%"></div></div><span>${t.current}/${t.goal}</span>${!isDone ? `<button onclick="window.claimWeeklyTask('${t.id}')" ${t.current < t.goal ? 'disabled' : ''}>+${t.reward} 💰</button>` : '<span>✅ منجزة</span>'}</div>`;
    });
  }
  const streakGrid = document.getElementById('streak-reward-grid');
  if (streakGrid) {
    const STREAK_REWARDS = [{ day: 1, emoji: '🎁', reward: 50 }, { day: 2, emoji: '💰', reward: 100 }, { day: 3, emoji: '⚡', reward: 150 }, { day: 4, emoji: '💎', reward: 200 }, { day: 5, emoji: '🔥', reward: 300 }, { day: 6, emoji: '⭐', reward: 400 }, { day: 7, emoji: '👑', reward: 700 }];
    const curCount = ls.count || 0; streakGrid.innerHTML = '';
    STREAK_REWARDS.forEach(sr => {
      const reached = curCount >= sr.day; const isCurrent = curCount + 1 === sr.day;
      streakGrid.innerHTML += `<div class="streak-day ${reached ? 'done' : ''} ${isCurrent ? 'current' : ''}">${sr.emoji} +${sr.reward} يوم ${sr.day}</div>`;
    });
  }
}
window.renderWeeklyTasksTab = renderWeeklyTasksTab;

export function claimWeeklyTask(id) {
  const t = (window.gameData.weeklyTasks || []).find(x => x.id === id); if (!t || t.claimed) return; if (t.current < t.goal) { showToast('❌ لم تكمل المهمة بعد'); return; }
  t.claimed = true; window.gameData.coins += t.reward; playSound('snd-buy');
  try { confetti({ particleCount: 60, spread: 70 }); } catch (e) {}
  saveData(); updateUI(); showToast(`🎉 +${t.reward} عملة مكافأة أسبوعية!`); renderWeeklyTasksTab();
}
window.claimWeeklyTask = claimWeeklyTask;

export function switchChallengeTab(tab) {
  ['weekly', 'season', 'wtasks'].forEach(t => {
    const el = document.getElementById(`ch-tab-${t}`); const btn = document.querySelector(`[data-ctab="${t}"]`);
    if (el) el.style.display = t === tab ? 'block' : 'none';
    if (btn) { btn.classList.toggle('active', t === tab); }
  });
  if (tab === 'season') renderSeasonTab();
  if (tab === 'wtasks') renderWeeklyTasksTab();
}
window.switchChallengeTab = switchChallengeTab;
