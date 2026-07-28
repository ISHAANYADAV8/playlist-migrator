const { extractSpotifyMetadata } = require("./metadataNormalizer");
const { rankCandidates } = require("./candidateRanker");

class MatchEngine {
    constructor(ytmusic) {
        this.ytmusic = ytmusic;
    }

    async findBestMatch(spotifyTrackItem, ignoreVideoIds = []) {
        if (!spotifyTrackItem) return null;

        // 1. Normalize metadata
        const spotifyMeta = extractSpotifyMetadata(spotifyTrackItem);
        
        // 2. Search YT Music using Title + Artist
        const query = `${spotifyMeta.title} ${spotifyMeta.artist}`.trim();
        const results = await this.ytmusic.searchSongs(query);

        if (!results || results.length === 0) return null;

        // 3. Filter ignored videos
        const validResults = results.filter(r => !ignoreVideoIds.includes(r.videoId));
        if (validResults.length === 0) return null;

        // 4. Rank candidates based on multi-stage pipeline
        // (Top 10 is usually enough for ranking, as YT search returns around 20)
        const candidatesToRank = validResults.slice(0, 10);
        
        const bestMatch = rankCandidates(spotifyMeta, candidatesToRank);

        // Fallback to top result if pipeline fails to approve any but we still need one,
        // though strictly we shouldn't return bad matches.
        return bestMatch || null;
    }
}

module.exports = MatchEngine;
