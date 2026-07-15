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
        console.error(error.response?.data || error.message);

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
        console.error(error.response?.data || error.message);

        res.status(500).json({
            error: "Failed to fetch playlists",
        });
    }
};

module.exports = {
    getCurrentUser,
    getPlaylists,
};