const youtubeSr = require("youtube-sr").default;
const googleService = require("../services/googleService");

const searchYouTube = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ error: "Query parameter is required" });
        }

        // Search standard YouTube
        const videos = await youtubeSr.search(query, { limit: 5, type: "video" });

        const results = videos.map(v => ({
            videoId: v.id,
            title: v.title,
            channel: v.channel?.name || "Unknown Channel",
            duration: v.durationFormatted,
            thumbnail: v.thumbnail?.url
        }));

        res.json({ results });
    } catch (err) {
        console.error("YouTube search error:", err);
        res.status(500).json({ error: "Failed to search YouTube" });
    }
};

const addVideoToPlaylist = async (req, res) => {
    try {
        if (!req.session.googleTokens) {
            return res.status(401).json({ error: "Google not authenticated" });
        }

        const playlistId = req.params.playlistId;
        const { videoId } = req.body;

        if (!videoId) {
            return res.status(400).json({ error: "Video ID is required" });
        }

        await googleService.addVideoToPlaylist(
            req.session.googleTokens,
            playlistId,
            videoId
        );

        res.json({ success: true, message: "Video added successfully" });
    } catch (err) {
        console.error("Manual add error:", err);
        const errorMsg = err.response?.data?.error?.message || err.message || "Failed to add video";
        res.status(500).json({ error: errorMsg });
    }
};

module.exports = {
    searchYouTube,
    addVideoToPlaylist
};
