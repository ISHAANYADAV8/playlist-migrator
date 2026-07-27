const YTMusic = require("ytmusic-api");

const ytmusic = new YTMusic();

const initialize = async () => {
    await ytmusic.initialize();
};

const searchSong = async (title, artist, ignoreVideoIds = []) => {
    const query = `${title} ${artist}`;
    const results = await ytmusic.searchSongs(query);

    if (!results || results.length === 0) {
        return null;
    }

    const validResults = results.filter(r => !ignoreVideoIds.includes(r.videoId));
    if (validResults.length === 0) return null;

    const cleanStr = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanTitle = cleanStr(title);
    const cleanArtist = cleanStr(artist);

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

    return maxScore > 0 ? bestMatch : validResults[0];
};

module.exports = {
    initialize,
    searchSong,
};