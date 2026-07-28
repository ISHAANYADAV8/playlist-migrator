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
    let bestMatch = null;
    let highestScore = -1;
    if (!results || results.length === 0) return { match: bestMatch, score: highestScore };

    const topResults = results.slice(0, 5);
    const expectedTitleNorm = normalizeString(targetTitle).toLowerCase();

    for (const song of topResults) {
        let score = 0;
        
        // 1. Title Similarity (0 - 45 pts)
        const candidateTitleNorm = normalizeString(cleanTitle(song.name)).toLowerCase();
        let simScore = stringSimilarity.compareTwoStrings(expectedTitleNorm, candidateTitleNorm);
        score += Math.round(simScore * 45);

        // 2. Official Channel / Known Labels (30 pts)
        const isTopicOrVevo = song.artist && song.artist.name && (song.artist.name.endsWith(' - Topic') || song.artist.name.endsWith('VEVO'));
        const knownLabels = ['saregama', 't-series', 'zee music', 'sony music', 'yrf', 'tips official', 'speed records'];
        const isKnownLabel = song.artist && song.artist.name && knownLabels.some(l => song.artist.name.toLowerCase().includes(l));
        
        // ytmusic searchSongs returns 'type: "SONG"' for officially licensed tracks
        const isOfficialLicensed = song.type === 'SONG' || !!song.album;

        if (isTopicOrVevo || isKnownLabel || isOfficialLicensed) {
            score += 30;
        }

        // 3. Artist Match (15 pts)
        if (artistMatches(primaryArtist, targetArtist, song.artist || song.artists, song.name)) {
            score += 15;
        }

        // 4. Duration (10 pts)
        if (durationMs && song.duration) {
            const diffSeconds = Math.abs((durationMs / 1000) - song.duration);
            if (diffSeconds <= 15) {
                score += 10;
            } else if (diffSeconds <= 35) {
                score += 5;
            } else if (diffSeconds > 60) {
                score -= 50; // Penalty
            }
        }

        // 5. Penalties
        const rawTitleLower = song.name.toLowerCase();
        const isCoverRemix = rawTitleLower.includes('cover') || rawTitleLower.includes('remix') || rawTitleLower.includes('fan made');
        const targetTitleLower = targetTitle.toLowerCase();
        if (isCoverRemix && !targetTitleLower.includes('cover') && !targetTitleLower.includes('remix')) {
            score -= 30;
        }

        if (score > highestScore) {
            highestScore = score;
            bestMatch = song;
        }
    }

    return { match: bestMatch, score: highestScore / 100 };
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