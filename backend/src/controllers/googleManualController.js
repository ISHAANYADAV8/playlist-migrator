const youtubeService = require("../services/youtubeService");
const googleService = require("../services/googleService");

const searchYouTube = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ error: "Query parameter is required" });
        }

        // Search using ytmusic-api instead of broken youtube-sr
        const videos = await youtubeService.searchManual(query);

        const results = videos.map(v => ({
            videoId: v.videoId,
            title: v.name,
            channel: v.artist?.name || "Unknown Artist",
            duration: `${Math.floor(v.duration / 60)}:${(v.duration % 60).toString().padStart(2, '0')}`,
            thumbnail: v.thumbnails && v.thumbnails.length > 0 ? v.thumbnails[0].url : null
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
