const YTMusic = require("ytmusic-api");

const ytmusic = new YTMusic();

const initialize = async () => {
    await ytmusic.initialize();
};

const searchSong = async (title, artist, ignoreVideoIds = []) => {
    const cleanStr = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanTitle = cleanStr(title);
    const cleanArtist = cleanStr(artist);

    const fetchAndScore = async (query) => {
        const results = await ytmusic.searchSongs(query);
        if (!results || results.length === 0) return null;

        const validResults = results.filter(r => !ignoreVideoIds.includes(r.videoId));
        if (validResults.length === 0) return null;

        let bestMatch = validResults[0];
        let maxScore = -1;

        for (const song of validResults) {
            let score = 0;
            const songTitle = cleanStr(song.name);
            const songArtist = cleanStr(song.artist?.name);

            if (songTitle && songTitle === cleanTitle) score += 50;
            if (songArtist && songArtist === cleanArtist) score += 50;

            if (songTitle && cleanTitle && (songTitle.includes(cleanTitle) || cleanTitle.includes(songTitle))) score += 20;
            if (songArtist && cleanArtist && (songArtist.includes(cleanArtist) || cleanArtist.includes(songArtist))) score += 20;

            if (score > maxScore) {
                maxScore = score;
                bestMatch = song;
            }
        }

        return { match: bestMatch, score: maxScore, fallback: validResults[0] };
    };

    // 1. Try with title + artist
    const res = await fetchAndScore(`${title} ${artist}`);
    
    // If we got a really good score (> 50, meaning at least exact title or exact artist), return it!
    if (res && res.score >= 50) {
        return res.match;
    }

    // 2. If no great match, try with ONLY the title
    const resTitleOnly = await fetchAndScore(title);
    
    if (resTitleOnly && resTitleOnly.score > (res ? res.score : -1)) {
        return resTitleOnly.match;
    }

    // 3. Fallback: return the closest match from the first query or second query
    if (res && res.score > 0) return res.match;
    if (resTitleOnly && resTitleOnly.score > 0) return resTitleOnly.match;
    
    // 4. Absolute fallback: just return the top result of the first query
    return res ? res.fallback : (resTitleOnly ? resTitleOnly.fallback : null);
};

module.exports = {
    initialize,
    searchSong,
};