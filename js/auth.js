// js/auth.js
import { auth, db, APP_ID } from './firebase.js';
import {
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  doc,
  onSnapshot,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getDefaultData, updateLoginStreak, saveData } from './data.js';
import { updateUI } from './ui.js';
import { showToast } from './helpers.js';

export async function initAuth() {
  try {
    await signInAnonymously(auth);
    console.log('[Auth] Signed in anonymously');
  } catch (e) {
    console.error('[Auth] Sign in error:', e);
    window.firebaseReady = false;
  }
}

export function listenToUserData() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.currentUser = null;
      window.firebaseReady = false;
      console.warn('[Auth] No user signed in');
      return;
    }

    window.currentUser = user;
    window.firebaseReady = true;
    console.log('[Auth] User signed in:', user.uid);

    const profileRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'profile', 'data');

    onSnapshot(profileRef, (snap) => {
      const today = new Date().toDateString();
      let data;

      if (snap.exists()) {
        data = snap.data();
        const defaults = getDefaultData();

        window.gameData = {
          ...defaults,
          ...data,
          inventory: { ...defaults.inventory, ...(data.inventory || {}) },
          stats: { ...defaults.stats, ...(data.stats || {}) },
          dailyTasks: data.dailyTasks?.length ? data.dailyTasks : defaults.dailyTasks,
          weeklyTasks: data.weeklyTasks?.length ? data.weeklyTasks : defaults.weeklyTasks,
          achievements: data.achievements?.length ? data.achievements : defaults.achievements,
          unlockedCategories: data.unlockedCategories || defaults.unlockedCategories,
          loginStreak: { ...defaults.loginStreak, ...(data.loginStreak || {}) },
          detailedStats: { ...defaults.detailedStats, ...(data.detailedStats || {}) },
          seasonData: { ...defaults.seasonData, ...(data.seasonData || {}) },
        };

        if (window.gameData.lastDailyUpdate !== today) {
          window.gameData.dailyTasks.forEach((t) => { t.current = 0; t.claimed = false; });
          window.gameData.lastDailyUpdate = today;
          window.gameData._catsToday = [];
        }

        if (window.gameData.lastLoginDate !== today) {
          window.gameData.lastLoginDate = today;
          window.gameData.coins += 50;
          setTimeout(() => {
            showToast('🎁 مكافأة الدخول اليومي: +50 عملة!', 3500);
            updateLoginStreak();
            saveData();
            updateUI();
          }, 2500);
        }

        const currentSeason = window.getCurrentSeason?.() || getCurrentSeasonFallback();
        if (window.gameData.currentSeason !== currentSeason) {
          window.gameData.currentSeason = currentSeason;
          if (window.gameData.seasonData?.seasonId !== currentSeason) {
            window.gameData.seasonData = {
              seasonId: currentSeason,
              xp: 0,
              rank: 'برونز',
              gamesPlayed: 0,
              challengesDone: 0,
              weeklyDone: 0,
              rewardClaimed: false,
            };
          }
        }

        if (!window.gameData.unlockedCategories || window.gameData.unlockedCategories.length === 0) {
          window.gameData.unlockedCategories = defaults.unlockedCategories;
        }

        updateUI();

        setTimeout(() => {
          if (typeof window.updateHomeStreak === 'function') window.updateHomeStreak();
          if (typeof window.checkAndOfferResume === 'function') window.checkAndOfferResume();
        }, 1500);
      } else {
        window.gameData = getDefaultData();
        window.gameData.lastLoginDate = today;
        window.gameData.lastDailyUpdate = today;
        setDoc(profileRef, window.gameData)
          .then(() => {
            console.log('[Auth] New user profile created');
            updateUI();
          })
          .catch((err) => console.error('[Auth] Error creating profile:', err));
      }
    }, (err) => {
      console.error('[Auth] Firestore snapshot error:', err);
      const backup = localStorage.getItem('shaghel_gamedata_backup');
      if (backup && !window.gameData) {
        try {
          window.gameData = JSON.parse(backup);
          console.log('[Auth] Restored game data from local backup');
          updateUI();
        } catch (e) {
          console.error('[Auth] Failed to parse local backup');
        }
      }
    });
  });
}

function getCurrentSeasonFallback() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
