const YTMusic = require("ytmusic-api");
const stringSimilarity = require("string-similarity");

const ytmusic = new YTMusic();

const initialize = async () => {
    await ytmusic.initialize();
};

const cleanTitle = (title) => {
    // 1. Split candidate video titles on delimiters |, : and take only the first segment.
    let clean = title.split(/[|:]/)[0];

    clean = clean
        .replace(/\[.*?official video.*?\]/gi, '')
        .replace(/\(.*?(lyric|official|audio|from).*?\)/gi, '')
        .replace(/\b(HD|4K|HQ)\b/gi, '')
        .replace(/\s*\([^)]*(feat|ft\.)[^)]*\)/gi, '')
        .replace(/\s*\[[^\]]*(feat|ft\.)[^\]]*\]/gi, '')
        .replace(/\s*-\s*(Remaster|Live|Radio Edit|Explicit).*$/gi, '')
        .trim();
        
    return clean;
};

const normalizeString = (str) => {
    if (!str) return "";
    return str
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^\w\s]/gi, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();
};

const artistMatches = (primaryArtist, expectedArtistString, candidateArtistInfo, candidateTitle) => {
    const cTitleNorm = normalizeString(candidateTitle).toLowerCase();
    const primaryNorm = normalizeString(primaryArtist).toLowerCase();
    
    const expectedArtists = expectedArtistString.split(',').map(a => normalizeString(a).toLowerCase());
    
    let artists = [];
    if (candidateArtistInfo) {
        artists = Array.isArray(candidateArtistInfo) ? candidateArtistInfo : [candidateArtistInfo];
    }
    
    const artistMatch = artists.some(candidateArtist => {
        if (!candidateArtist || !candidateArtist.name) return false;
        const cName = normalizeString(candidateArtist.name).toLowerCase();
        
        return expectedArtists.some(exp => exp.includes(cName) || cName.includes(exp));
    });

    const titleMatch = primaryNorm && primaryNorm.length > 2 && cTitleNorm.includes(primaryNorm);
    return artistMatch || titleMatch;
};

const findBestMatch = (results, targetTitle, targetArtist, durationMs, primaryArtist) => {
    let match = null;
    let score = -1;
    if (!results || results.length === 0) return { match, score };

    const topResults = results.slice(0, 5);
    const expectedTitleNorm = normalizeString(targetTitle).toLowerCase();

    for (const song of topResults) {
        if (!artistMatches(primaryArtist, targetArtist, song.artist || song.artists, song.name)) {
            continue;
        }

        const candidateTitleNorm = normalizeString(cleanTitle(song.name)).toLowerCase();
        let simScore = stringSimilarity.compareTwoStrings(expectedTitleNorm, candidateTitleNorm);

        const isTopicOrVevo = song.artist && song.artist.name && (song.artist.name.endsWith(' - Topic') || song.artist.name.endsWith('VEVO'));

        if (durationMs && song.duration) {
            const diffSeconds = Math.abs((durationMs / 1000) - song.duration);
            let maxTolerance = 12;
            if (isTopicOrVevo || simScore > 0.85) {
                maxTolerance = 30;
            }
            if (diffSeconds > maxTolerance) {
                continue; 
            }
        }

        // Boosts and penalties
        if (isTopicOrVevo) {
            simScore += 0.15;
        }

        const isCoverOrRemixRequested = expectedTitleNorm.includes('cover') || expectedTitleNorm.includes('remix');
        const cTitleFullNorm = normalizeString(song.name).toLowerCase();
        const isCandidateCoverOrRemix = cTitleFullNorm.includes('cover') || cTitleFullNorm.includes('remix') || cTitleFullNorm.includes('fan made');

        if (!isCoverOrRemixRequested && isCandidateCoverOrRemix) {
            simScore -= 0.3; // Penalty
        }

        if (simScore > score) {
            score = simScore;
            match = song;
        }
    }
    return { match, score };
};

const searchSong = async (title, artist, durationMs, primaryArtist) => {
    const cleanedTitle = cleanTitle(title);
    const queryArtist = primaryArtist || artist.split(',')[0].trim();
    
    // First attempt: Title + Artist + Official Audio
    const primaryQuery = `${cleanedTitle} ${queryArtist} Official Audio`;
    const results = await ytmusic.searchSongs(primaryQuery);
    let { match: bestMatch, score: bestScore } = findBestMatch(results, cleanedTitle, artist, durationMs, primaryArtist);

    // Fallback attempt if score is low
    if (bestScore < 0.55) {
        const fallbackQuery = `${cleanedTitle} ${queryArtist}`;
        const fallbackResults = await ytmusic.searchSongs(fallbackQuery);
        const fallbackMatch = findBestMatch(fallbackResults, cleanedTitle, artist, durationMs, primaryArtist);
        
        if (fallbackMatch.score > bestScore) {
            bestScore = fallbackMatch.score;
            bestMatch = fallbackMatch.match;
        }
    }

    // Category Fallback Strategy: Videos
    if (bestScore < 0.55) {
        const videoQuery = `${cleanedTitle} ${queryArtist}`;
        const videoResults = await ytmusic.searchVideos(videoQuery);
        const videoMatch = findBestMatch(videoResults, cleanedTitle, artist, durationMs, primaryArtist);

        if (videoMatch.score > bestScore) {
            bestScore = videoMatch.score;
            bestMatch = videoMatch.match;
        }
    }

    if (bestMatch && bestScore >= 0.55) {
        let confidence = 'low';
        if (bestScore >= 0.85) confidence = 'high';
        else if (bestScore >= 0.70) confidence = 'medium';

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