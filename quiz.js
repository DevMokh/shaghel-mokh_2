const API_URL = 'https://example.com/api/questions';
const CACHE_KEY = 'questionsCache';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour expiry

async function fetchQuestions() {
    try {
        console.log('Fetching questions...');
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cacheTime = localStorage.getItem(`${CACHE_KEY}_time`);

        // Check if cached questions are still valid
        if (cachedData && cacheTime && (Date.now() - cacheTime) < CACHE_EXPIRY) {
            console.log('Using cached data.');
            return JSON.parse(cachedData);
        }

        const response = await fetch(API_URL);

        // Check for HTTP error
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const questions = await response.json();
        localStorage.setItem(CACHE_KEY, JSON.stringify(questions));
        localStorage.setItem(`${CACHE_KEY}_time`, Date.now());

        console.log('Questions fetched and cached successfully.');
        return questions;
    } catch (error) {
        console.error('Error fetching questions:', error);
        throw new Error('Failed to fetch questions.');
    }
}

function checkStorageQuota() {
    const usedSpace = JSON.stringify(localStorage).length;
    const maxSpace = 5 * 1024 * 1024; // 5MB limit for localStorage

    if (usedSpace > maxSpace) {
        console.warn('Storage quota exceeded. Consider clearing some entries.');
    }
}

// Example usage
checkStorageQuota();
fetchQuestions().then(questions => {
    console.log('Received questions:', questions);
}).catch(error => {
    console.error('Error in using fetchQuestions:', error);
});