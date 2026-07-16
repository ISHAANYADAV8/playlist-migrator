const spotifyService = require("../services/spotifyService");

const getCurrentUser = async (req, res) => {
    try {
        const accessToken = req.session.accessToken;

        if (!accessToken) {
            return res.status(401).json({
                error: "Not authenticated",
            });
        }

        const user = await spotifyService.getCurrentUser(accessToken);

        res.json(user);
    } catch (error) {
        console.log(error.response?.data || error.message);

        res.status(500).json({
            error: "Failed to fetch Spotify profile",
        });
    }
};

const getPlaylists = async (req, res) => {
    try {
        const accessToken = req.session.accessToken;

        if (!accessToken) {
            return res.status(401).json({
                error: "Not authenticated",
            });
        }

        const playlists = await spotifyService.getPlaylists(accessToken);

        res.json(playlists);
    } catch (error) {
        console.log(error.response?.data || error.message);

        res.status(500).json({
            error: "Failed to fetch playlists",
        });
    }
};

const getPlaylistTracks = async (req, res) => {
    try {
        const accessToken = req.session.accessToken;

        if (!accessToken) {
            return res.status(401).json({
                error: "Not authenticated",
            });
        }

        const playlistId = req.params.playlistId;

        console.log("========== TRACK REQUEST ==========");
        console.log("Playlist ID:", playlistId);

        const tracks = await spotifyService.getPlaylistTracks(
            accessToken,
            playlistId
        );

        console.log("Returned type:", typeof tracks);
        console.log("Is Array:", Array.isArray(tracks));

        if (!tracks || !Array.isArray(tracks)) {
            console.log("Returned value:", tracks);
            return res.status(500).json({
                error: "Spotify did not return a valid items array",
            });
        }

        // DEBUG LOG: Let's look at the first item's raw structure in your console
        if (tracks.length > 0) {
            console.log("--- RAW FIRST ITEM INSPECTION ---");
            console.dir(tracks[0], { depth: 2 });
        } else {
            console.log("--- WARNING: Tracks array came back completely empty from Spotify API ---");
        }

        const formattedTracks = tracks.map((playlistItem) => ({
    title: playlistItem.item.name,
    artist: playlistItem.item.artists
        .map((artist) => artist.name)
        .join(", "),
    album: playlistItem.item.album.name,
}));

        res.json(formattedTracks);
    } catch (error) {
        console.log("========== SPOTIFY ERROR ==========");
        console.log("Status:", error.response?.status);
        console.log("Data:");
        console.dir(error.response?.data, { depth: null });
        console.log("Message:", error.message);

        res.status(500).json({
            error: "Failed to fetch playlist tracks",
        });
    }
};

module.exports = {
    getCurrentUser,
    getPlaylists,
    getPlaylistTracks,
};