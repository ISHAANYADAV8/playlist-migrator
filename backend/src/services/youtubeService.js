const YTMusic = require("ytmusic-api");
const stringSimilarity = require("string-similarity");

const ytmusic = new YTMusic();

const initialize = async () => {
    await ytmusic.initialize();
};

const cleanTitle = (title) => {
    return title
        .replace(/\s*\([^)]*(feat|ft\.)[^)]*\)/gi, '')
        .replace(/\s*\[[^\]]*(feat|ft\.)[^\]]*\]/gi, '')
        .replace(/\s*-\s*(Remaster|Live|Radio Edit|Explicit).*$/gi, '')
        .trim();
};

const normalizeString = (str) => {
    return str
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^\w\s]/gi, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();
};

const artistMatches = (expectedArtist, candidateArtistInfo) => {
    if (!candidateArtistInfo) return false;
    
    // ytmusic-api might return a single `artist` object or an `artists` array
    const artists = Array.isArray(candidateArtistInfo) 
        ? candidateArtistInfo 
        : [candidateArtistInfo];
        
    const expected = normalizeString(expectedArtist).toLowerCase();
    return artists.some(artist => {
        if (!artist || !artist.name) return false;
        const cName = normalizeString(artist.name).toLowerCase();
        return expected.includes(cName) || cName.includes(expected);
    });
};

const findBestMatch = (results, targetTitle, targetArtist) => {
    let match = null;
    let score = -1;
    if (!results || results.length === 0) return { match, score };

    const topResults = results.slice(0, 5);
    const expectedTitleNorm = normalizeString(targetTitle).toLowerCase();

    for (const song of topResults) {
        if (!artistMatches(targetArtist, song.artist || song.artists)) {
            continue;
        }

        const candidateTitleNorm = normalizeString(cleanTitle(song.name)).toLowerCase();
        const simScore = stringSimilarity.compareTwoStrings(expectedTitleNorm, candidateTitleNorm);

        if (simScore > score) {
            score = simScore;
            match = song;
        }
    }
    return { match, score };
};

const searchSong = async (title, artist) => {
    const cleanedTitle = cleanTitle(title);
    
    // First attempt
    const query = `${cleanedTitle} ${artist}`;
    const results = await ytmusic.searchSongs(query);
    let { match: bestMatch, score: bestScore } = findBestMatch(results, cleanedTitle, artist);

    // Fallback attempt if score is low
    if (bestScore < 0.6) {
        const fallbackQuery = `${cleanedTitle} ${artist} Official Audio`;
        const fallbackResults = await ytmusic.searchSongs(fallbackQuery);
        const fallbackMatch = findBestMatch(fallbackResults, cleanedTitle, artist);
        
        if (fallbackMatch.score > bestScore) {
            bestScore = fallbackMatch.score;
            bestMatch = fallbackMatch.match;
        }
    }

    if (bestMatch && bestScore >= 0.6) {
        let confidence = 'low';
        if (bestScore >= 0.9) confidence = 'high';
        else if (bestScore >= 0.75) confidence = 'medium';

        return {
            ...bestMatch,
            confidence,
            matchScore: bestScore
        };
    }

    return null;
};

const searchManual = async (query) => {
    const results = await ytmusic.searchSongs(query);
    return results ? results.slice(0, 5) : [];
};

module.exports = {
    initialize,
    searchSong,
    searchManual
};