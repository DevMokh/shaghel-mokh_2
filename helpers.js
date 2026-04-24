// Improved version of helpers.js

class SoundHelper {
    constructor() {
        this.quotaExceeded = false;
    }

    logError(message) {
        console.error(`[SoundHelper Error]: ${message}`);
    }

    checkStorageQuota() {
        // Assuming we have some logic to check storage quota
        if (/* condition to check quota */) {
            this.quotaExceeded = true;
            this.logError('Storage quota exceeded');
            throw new Error('Storage quota exceeded');
        }
    }

    playSound(sound) {
        try {
            this.checkStorageQuota();
            // Logic to play sound
        } catch (error) {
            this.logError('Failed to play sound: ' + error.message);
        }
    }

    // Other methods can follow the same error handling structure
}

// Example usage:
const soundHelper = new SoundHelper();
soundHelper.playSound('sound.mp3');
