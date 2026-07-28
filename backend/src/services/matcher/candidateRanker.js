const { calculateSimilarity } = require("./similarityEngine");
const { checkDuration } = require("./durationValidator");
const { checkVersionMismatch } = require("./versionCheck");
const { normalizeTitle } = require("./metadataNormalizer");

const scoreCandidate = (spotifyMeta, ytCandidate) => {
    let score = 0;

    const ytTitleRaw = ytCandidate.name || "";
    const ytArtistRaw = ytCandidate.artist?.name || "";
    const ytAlbumRaw = ytCandidate.album?.name || "";
    const ytDurationSeconds = ytCandidate.duration || 0;

    const ytTitle = normalizeTitle(ytTitleRaw);
    const ytArtist = normalizeTitle(ytArtistRaw);
    const ytAlbum = normalizeTitle(ytAlbumRaw);

    // 1. Title Match (+50 max)
    const titleSim = calculateSimilarity(spotifyMeta.title, ytTitle);
    score += titleSim * 50;
    
    // Add exact match bonus just in case
    if (spotifyMeta.title === ytTitle) {
        score += 5; // small boost for perfect match
    }

    // 2. Artist Match (+30 max)
    const artistSim = calculateSimilarity(spotifyMeta.artist, ytArtist);
    score += artistSim * 30;

    // 3. Album Match (+15 max)
    if (spotifyMeta.album && ytAlbum) {
        const albumSim = calculateSimilarity(spotifyMeta.album, ytAlbum);
        score += albumSim * 15;
    }

    // 4. Duration Check (+10 or -100)
    score += checkDuration(spotifyMeta.duration_ms, ytDurationSeconds);

    // 5. Version Mismatch Penalties
    score += checkVersionMismatch(spotifyMeta.originalTitle, ytTitleRaw);

    // 6. Result Type Priority (Song > Video)
    if (ytCandidate.type === "SONG") {
        score += 5;
    } else if (ytCandidate.type === "VIDEO") {
        score -= 5;
    }

    return score;
};

const rankCandidates = (spotifyMeta, ytResults) => {
    if (!ytResults || ytResults.length === 0) return null;

    let bestMatch = null;
    let highestScore = -Infinity;

    for (const candidate of ytResults) {
        const score = scoreCandidate(spotifyMeta, candidate);
        candidate.matchScore = score; // useful for debugging

        if (score > highestScore) {
            highestScore = score;
            bestMatch = candidate;
        }
    }
    
    // Set a baseline requirement. If the highest score is negative (e.g. huge duration mismatch + cover penalty), reject it.
    if (highestScore < 0) {
        return null;
    }

    return bestMatch;
};

module.exports = {
    scoreCandidate,
    rankCandidates
};
