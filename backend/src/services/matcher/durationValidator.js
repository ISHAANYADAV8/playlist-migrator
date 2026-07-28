const checkDuration = (spotifyDurationMs, ytDurationSeconds) => {
    if (!spotifyDurationMs || !ytDurationSeconds) return 0;

    const spotifySec = Math.round(spotifyDurationMs / 1000);
    const diff = Math.abs(spotifySec - ytDurationSeconds);

    if (diff <= 5) {
        return 10; // +10 points for exact/near-exact match
    }
    if (diff > 30) {
        return -20; // Penalize if it's significantly different (e.g. a 10 min loop vs a 3 min song)
    }
    if (diff > 15) {
        return -5; // Small penalty for extended music videos
    }
    
    return 0;
};

module.exports = {
    checkDuration
};
