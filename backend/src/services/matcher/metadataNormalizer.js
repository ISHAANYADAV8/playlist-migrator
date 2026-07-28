const normalizeTitle = (title) => {
    if (!title) return "";
    
    let normalized = title.toLowerCase();

    // Remove text in parentheses and brackets
    normalized = normalized.replace(/\([^)]*\)/g, "");
    normalized = normalized.replace(/\[[^\]]*\]/g, "");

    // Remove common annoying phrases
    const phrasesToRemove = [
        "remastered", "remaster", "deluxe", "live", "mono", "stereo",
        "radio edit", "explicit", "clean", "feat.", "featuring", "version", "anniversary"
    ];

    for (const phrase of phrasesToRemove) {
        normalized = normalized.replace(new RegExp(`\\b${phrase}\\b`, 'gi'), "");
    }

    // Remove accents
    normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Remove special characters, keep only alphanumerics and spaces
    normalized = normalized.replace(/[^a-z0-9\s]/g, " ");

    // Clean up multiple spaces
    normalized = normalized.replace(/\s+/g, " ").trim();

    return normalized;
};

const extractSpotifyMetadata = (trackItem) => {
    if (!trackItem) return null;

    const title = trackItem.name || "";
    const artist = trackItem.artists?.map(a => a.name).join(" ") || "";
    const album = trackItem.album?.name || "";
    const duration_ms = trackItem.duration_ms || 0;
    const isrc = trackItem.external_ids?.isrc || "";

    // Keep the original around for VersionCheck
    const originalTitle = title.toLowerCase();

    return {
        originalTitle,
        title: normalizeTitle(title),
        artist: normalizeTitle(artist),
        album: normalizeTitle(album),
        duration_ms,
        isrc
    };
};

module.exports = {
    normalizeTitle,
    extractSpotifyMetadata
};
